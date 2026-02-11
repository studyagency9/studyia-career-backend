const express = require('express');
const router = express.Router();
const associateController = require('../controllers/associate.controller');
const { authenticateAssociate } = require('../middleware/auth');
const { associateAuthLimiter } = require('../middleware/rateLimiter');

// Routes publiques
router.post('/signup', associateController.signup);
router.post('/login', associateAuthLimiter, associateController.login);

// Routes protégées (nécessitent authentification)
router.get('/dashboard', authenticateAssociate, associateController.getDashboard);
router.get('/referrals', authenticateAssociate, associateController.getReferralStats);
router.post('/withdrawal', authenticateAssociate, associateAuthLimiter, associateController.requestWithdrawal);
router.get('/withdrawals', authenticateAssociate, associateController.getWithdrawalHistory);
router.get('/profile', authenticateAssociate, associateController.getProfile);
router.put('/profile', authenticateAssociate, associateController.updateProfile);
router.put('/password', authenticateAssociate, associateController.changePassword);

// Nouvelles routes pour les statistiques temporelles
router.get('/stats/daily', authenticateAssociate, associateController.getDailyStats);
router.get('/stats/weekly', authenticateAssociate, associateController.getWeeklyStats);
router.get('/stats/monthly', authenticateAssociate, associateController.getMonthlyStats);

// Nouvelles routes pour l'historique des ventes
router.get('/sales', authenticateAssociate, associateController.getSalesHistory);
router.get('/sales/recent', authenticateAssociate, associateController.getRecentSales);

module.exports = router;
