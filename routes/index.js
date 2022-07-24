const express = require('express')
const router = express.Router()
const { generalErrorHandler } = require('../middleware/error-handler')
const tweetController = require('../controllers/tweet-controller')
const userController = require('../controllers/user-controller')
const passport = require('../config/passport')
const admin = require('./modules/admin')

router.use('/admin', admin)

router.get('/signin', userController.signInPage)
router.post('/signin', passport.authenticate('local', { failureRedirect: '/signin', failureFlash: true }), userController.signIn)
router.get('/logout', userController.logout)
router.get('/signup', userController.signUpPage)
router.post('/signup', userController.signUp)

router.get('/tweets', tweetController.getTweets)
router.use('/', (req, res) => res.redirect('/tweets'))
router.use('/', generalErrorHandler)

module.exports = router
