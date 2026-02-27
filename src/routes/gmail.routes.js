const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const { authenticatePartner } = require('../middleware/auth');

router.use(authenticatePartner);

router.get('/auth-url', gmailController.getAuthUrl);

router.get('/callback', gmailController.handleCallback);

router.get('/status', gmailController.getStatus);

router.get('/emails', gmailController.listEmails);

router.get('/attachment/:messageId/:attachmentId', gmailController.getAttachment);

router.post('/import-to-job', gmailController.importToJob);

router.delete('/disconnect', gmailController.disconnect);

module.exports = router;
