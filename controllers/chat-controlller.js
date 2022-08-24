// 登入、註冊、登出、拿到編輯頁、送出編輯
const assert = require('assert')
const bcrypt = require('bcryptjs')
const { User, Tweet, Reply, Like, Followship } = require('../models')
const helpers = require('../_helpers')

const chatController = {
  renderPublicChatRoom: (req, res) => {

    return res.render('publicChatRoom')
  },

  renderPrivateChatRoom: async (req, res, next) => {
    const PmTargetUserId = req.params.id
    try {
      res.render('privateChatRoom', { PmTargetUserId })
    } catch (err) {
      next(err)
    }
  }

}

module.exports = chatController
