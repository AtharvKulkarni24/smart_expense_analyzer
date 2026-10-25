const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateUser, authController.getMe);
router.patch('/profile', authenticateUser, authController.updateProfile);
router.post('/change-password', authenticateUser, authController.changePassword);

module.exports = router;
