const express = require('express');
const authController = require('../controllers/AuthController');
const requireAuth = require('../middleware/requireAuth');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', writeLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
