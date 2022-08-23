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

const { User } = require('./models')
const chattingUsers = {}

io.of('/publicChatRoom').on('connection', async (socket) => {
  const loginUserId = socket.handshake.auth.userId
  const loginUser = await User.findByPk(loginUserId, { raw: true })
  if (!chattingUsers[socket.id]) {
    chattingUsers[socket.id] = loginUser
  }
  console.log(chattingUsers)

  socket.on('login', () => {
    io.of('/publicChatRoom').emit('loginEvent', chattingUsers[socket.id])
    io.of('/publicChatRoom').emit('broadcastLogEvent', chattingUsers)
  })

  console.log('a user connected=================================')
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


server.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
