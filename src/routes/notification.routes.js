const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticatePartner } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification partner
router.use(authenticatePartner);

// Gestion des notifications
router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Préférences de notification
router.get('/settings', notificationController.getNotificationSettings);
router.put('/settings', notificationController.updateNotificationSettings);

module.exports = router;
