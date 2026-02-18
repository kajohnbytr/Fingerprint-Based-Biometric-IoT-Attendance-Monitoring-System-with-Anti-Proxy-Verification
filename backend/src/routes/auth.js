const express = require('express');
const router = express.Router();

const { login, me, logout, register, validateInvite } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.get('/invite/:token', validateInvite);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', logout);

module.exports = router;
