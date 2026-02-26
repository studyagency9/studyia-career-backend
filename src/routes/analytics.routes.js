const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticatePartner } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification partner
router.use(authenticatePartner);

// Dashboard et statistiques
router.get('/dashboard', analyticsController.getDashboard);
router.get('/skills', analyticsController.getSkillsAnalytics);
router.get('/candidates', analyticsController.getCandidatesAnalytics);

module.exports = router;
