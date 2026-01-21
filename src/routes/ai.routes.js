const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticatePartner } = require('../middleware/auth');

// All routes require authentication
router.use(authenticatePartner);

router.post('/analyze-cv', aiController.analyzeCV);
router.post('/optimize-cv', aiController.optimizeCV);

module.exports = router;
