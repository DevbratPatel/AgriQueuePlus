const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOTP);
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;
