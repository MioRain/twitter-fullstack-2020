if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const path = require('path')
const express = require('express')
const routes = require('./routes')
const handlebars = require('express-handlebars')
const flash = require('connect-flash')
const session = require('express-session')
const passport = require('./config/passport')
const methodOverride = require('method-override')
const helpers = require('./_helpers')
const handlebarsHelpers = require('./helpers/handlebars-helpers')
const app = express()
const port = process.env.PORT || 3000
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.engine('hbs', handlebars({ extname: '.hbs', helpers: handlebarsHelpers }))
app.set('view engine', 'hbs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use(methodOverride('_method'))
app.use('/upload', express.static(path.join(__dirname, 'upload')))
app.use((req, res, next) => {
  res.locals.success_messages = req.flash('success_messages')
  res.locals.error_messages = req.flash('error_messages')
  res.locals.user = helpers.getUser(req)
  next()
})
app.use(express.static('public'))
app.use(routes)

// use helpers.getUser(req) to replace req.user
// use helpers.ensureAuthenticated(req) to replace req.isAuthenticated()

// io.on('connection', (socket) => {
//   console.log('a user connected=================================');
//   socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
//   socket.on('chat message', (msg) => {
//     io.emit('chat message', msg);
//   });
// });
const { Op } = require('sequelize')
const { User, PrivateMessage } = require('./models')
const chattingUsers = {}

io.of('/publicChatRoom').on('connection', async (socket) => {
  const loginUserId = socket.handshake.auth.userId
  const loginUser = await User.findByPk(loginUserId, { raw: true })
  if (!chattingUsers[socket.id]) {
    chattingUsers[socket.id] = loginUser
  }


  socket.on('login', () => {
    io.of('/publicChatRoom').emit('loginEvent', chattingUsers[socket.id])
    io.of('/publicChatRoom').emit('broadcastLogEvent', chattingUsers)
  })


  socket.on('disconnect', () => {
    // 在前後端都留下訊息
    io.of('/publicChatRoom').emit('logoutEvent', chattingUsers[socket.id])
    // remove saved socket from users object
    delete chattingUsers[socket.id]
    io.of('/publicChatRoom').emit('broadcastLogEvent', chattingUsers)
  })
  socket.on('chat message', (msg) => {
    const returnObj = {
      id: chattingUsers[socket.id].id,
      name: chattingUsers[socket.id].name,
      avatar: chattingUsers[socket.id].avatar,
      message: msg
    }
    // 將 訊息丟回到 socket chat message
    io.of('/publicChatRoom').emit('chat message', returnObj)

  });
})

const privateUsers = {}

io.of('/privateChatRoom').on('connection', async (socket) => {
  console.log('====================connect PM socket==================')
  const loginUserId = socket.handshake.auth.userId
  const loginUser = await User.findByPk(loginUserId, {
    attributes: ['id', 'name', 'account', 'avatar'],
    raw: true
  })
  // saving userId to object with socket ID
  privateUsers[loginUser.id] = loginUser

  socket.on('updatePmList', targetUserId => {
    Promise.all([
      PrivateMessage.findAll({
        where: {
          [Op.or]: [{ senderId: loginUserId }, { receiverId: loginUserId }]
        },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'account', 'avatar'] },
          { model: User, as: 'receiver', attributes: ['id', 'name', 'account', 'avatar'] }
        ],
        raw: true,
        nest: true
      }),
      User.findByPk(targetUserId, {
        attributes: ['id', 'name', 'account', 'avatar'],
        raw: true
      })
    ]).then(([PmDataArray, targetUserData]) => {
      io.of('/privateChatRoom')
        .to(socket.id)
        .emit('updatePmList', PmDataArray, targetUserData)
    })
  })

  //創立房間後端邏輯
  //step 1 接收前端發送來的 join room要求
  socket.on('join room', async ({ oldRoom, targetUserId }) => {
    socket.leave(oldRoom)
    const newRoom = `${loginUserId}to${targetUserId}`
    socket.join(newRoom)
    await PrivateMessage.update(
      { unread: false },
      { where: { receiverId: loginUserId, senderId: targetUserId, unread: true } }
    )
    io.of('/privateChatRoom')
      .to(newRoom)
      .emit('createRoomSuccessful', newRoom)
  })
  //step 2 接收前端發送來的更新聊天室訊息要求
  socket.on('updateChatBox', async (targetUserId) => {
    const PrivateMessages = await PrivateMessage.findAll({
      where: {
        [Op.or]: [{ senderId: loginUserId }, { receiverId: loginUserId }]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'account', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'account', 'avatar'] }
      ],
      raw: true,
      nest: true
    })

    io.of('/privateChatRoom').to(socket.id).emit('updateChatBox', PrivateMessages)
  })

  socket.on('privateMessage', async ({ msg, targetUserId }) => {
    try {

      const newPm = await PrivateMessage.create({
        senderId: loginUserId,
        receiverId: targetUserId,
        message: msg
      })

      const returnObj = {
        id: loginUserId,
        name: privateUsers[loginUser.id].name,
        avatar: privateUsers[loginUser.id].avatar,
        message: msg,
        receiverId: targetUserId,
        createdAt: newPm.createdAt
      }

      io.of('privateChatRoom')
        .to(`${loginUserId}to${targetUserId}`)
        .to(`${targetUserId}to${loginUserId}`)
        .emit('privateMessage', returnObj)


    } catch (err) {
      console.log(err)

    }


  })


})

server.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
