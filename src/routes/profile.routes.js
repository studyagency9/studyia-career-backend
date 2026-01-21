const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticatePartner } = require('../middleware/auth');

// All routes require authentication
router.use(authenticatePartner);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/password', profileController.changePassword);

module.exports = router;
