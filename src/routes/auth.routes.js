const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticatePartner } = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticatePartner, authController.logout);
router.get('/profile', authenticatePartner, authController.getProfile);
router.get('/cv-stats', authenticatePartner, authController.getCVStats);

module.exports = router;
