const express = require('express');
const router = express.Router();
const adminManagementController = require('../controllers/admin-management.controller');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');

// Routes protégées (nécessitent authentification admin)
router.get('/', authenticateAdmin, adminManagementController.getAllAdmins);
router.get('/:id', authenticateAdmin, adminManagementController.getAdminById);
router.post('/', authenticateAdmin, adminManagementController.createAdmin);
router.put('/:id', authenticateAdmin, adminManagementController.updateAdmin);
router.put('/:id/reset-password', authenticateAdmin, adminManagementController.resetAdminPassword);

// Routes nécessitant des privilèges superadmin
router.delete('/:id', authenticateAdmin, requireSuperAdmin, adminManagementController.deleteAdmin);

module.exports = router;
