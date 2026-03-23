const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.put('/password', authenticate, AuthController.changePassword);

module.exports = router;
