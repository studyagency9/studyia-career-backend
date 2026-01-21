const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { authenticatePartner } = require('../middleware/auth');

// Public routes
router.get('/', planController.getAllPlans);

// Protected routes
router.post('/change', authenticatePartner, planController.requestPlanChange);

module.exports = router;
