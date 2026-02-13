const express = require('express');
const router = express.Router();

const { login, me, logout, register } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', logout);

module.exports = router;
