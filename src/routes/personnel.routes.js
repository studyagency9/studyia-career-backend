const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnel.controller');
const { authenticateAdmin, requireSecretaire } = require('../middleware/auth');

// Routes protégées (nécessitent authentification admin ou secrétaire)
router.get('/', authenticateAdmin, personnelController.getAllPersonnel);
router.get('/:id', authenticateAdmin, personnelController.getPersonnelById);

// Route publique pour récupérer le personnel par CV ID (pour le frontend après achat)
router.get('/by-cv/:cvId', personnelController.getPersonnelByCvId);

// Routes pour les secrétaires (gestion du personnel)
router.post('/', authenticateAdmin, requireSecretaire, personnelController.addPersonnel);
router.put('/:id', authenticateAdmin, requireSecretaire, personnelController.updatePersonnel);
router.delete('/:id', authenticateAdmin, requireSecretaire, personnelController.deletePersonnel);

module.exports = router;
