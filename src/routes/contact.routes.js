const express = require('express');
const router = express.Router();
const { sendContactMail, sendConfirmationMail } = require('../services/mailService');

// Route principale pour le formulaire de contact
router.post('/contact', async (req, res) => {
  const { name, email, message, phone, subject } = req.body;

  // Validation des champs requis
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Champs requis manquants',
      details: {
        name: !name ? 'Le nom est requis' : null,
        email: !email ? 'L\'email est requis' : null,
        message: !message ? 'Le message est requis' : null
      }
    });
  }

  // Validation de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Format d\'email invalide'
    });
  }

  try {
    // Envoyer l'email à l'administrateur
    await sendContactMail({ 
      name, 
      email, 
      message, 
      phone: phone || null, 
      subject: subject || `Nouveau message de ${name}` 
    });

    // Envoyer l'email de confirmation au visiteur
    await sendConfirmationMail({ 
      name, 
      email, 
      subject: subject || `Nouveau message de ${name}` 
    });

    res.status(200).json({
      success: true,
      message: 'Message envoyé avec succès',
      details: {
        recipient: 'contact@studyia.net',
        confirmationSent: true
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Veuillez réessayer plus tard'
    });
  }
});

// Route de test pour vérifier le service email
router.post('/test-email', async (req, res) => {
  const { testEmail } = req.body;

  if (!testEmail) {
    return res.status(400).json({
      success: false,
      error: 'Email de test requis'
    });
  }

  try {
    await sendContactMail({
      name: 'Test User',
      email: testEmail,
      message: 'Ceci est un message de test pour vérifier le service email.',
      subject: '🧪 Test Email Service - Studyia'
    });

    res.status(200).json({
      success: true,
      message: 'Email de test envoyé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors du test email:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test email',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Service email indisponible'
    });
  }
});

// Route de santé pour le service email
router.get('/email-health', async (req, res) => {
  try {
    const { initMailService } = require('../services/mailService');
    const isConnected = await initMailService();
    
    res.status(200).json({
      success: true,
      data: {
        emailService: isConnected ? 'connected' : 'disconnected',
        smtpHost: 'smtp.hostinger.com',
        smtpPort: 465,
        secure: true,
        user: 'contact@studyia.net'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Service email indisponible',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

module.exports = router;
