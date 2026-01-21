const express = require('express');
const router = express.Router();
const associateController = require('../controllers/associate.controller');
const { authenticateAssociate } = require('../middleware/auth');

// Routes publiques
router.post('/signup', associateController.signup);
router.post('/login', associateController.login);

// Routes protégées (nécessitent authentification)
router.get('/dashboard', authenticateAssociate, associateController.getDashboard);
router.get('/referrals', authenticateAssociate, associateController.getReferralStats);
router.post('/withdrawal', authenticateAssociate, associateController.requestWithdrawal);
router.get('/withdrawals', authenticateAssociate, associateController.getWithdrawalHistory);
router.get('/profile', authenticateAssociate, associateController.getProfile);
router.put('/profile', authenticateAssociate, associateController.updateProfile);
router.put('/password', authenticateAssociate, associateController.changePassword);

module.exports = router;
