const imapService = require('../services/imapService');

// Récupérer tous les emails
exports.getAllEmails = async (req, res) => {
  try {
    const { limit = 20, unreadOnly = false, mailbox = 'INBOX' } = req.query;
    
    console.log(`🔍 Récupération des emails - Limit: ${limit}, UnreadOnly: ${unreadOnly}, Mailbox: ${mailbox}`);
    
    const emails = await imapService.getEmails({
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      mailbox
    });
    
    return res.status(200).json({
      success: true,
      emails: emails,
      total: emails.length,
      unread: emails.filter(email => !email.isRead).length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des emails:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des emails'
    });
  }
};

// Récupérer les détails d'un email
exports.getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const { mailbox = 'INBOX' } = req.query;
    
    console.log(`🔍 Récupération de l'email ${id} depuis ${mailbox}`);
    
    const email = await imapService.getEmailById(id, mailbox);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email non trouvé'
      });
    }
    
    return res.status(200).json({
      success: true,
      email: email
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'email:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération de l\'email'
    });
  }
};

// Télécharger une pièce jointe
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const { mailbox = 'INBOX' } = req.query;
    
    console.log(`🔍 Téléchargement de la pièce jointe ${filename} de l'email ${id}`);
    
    const attachmentData = await imapService.getAttachment(id, filename, mailbox);
    
    if (!attachmentData) {
      return res.status(404).json({
        success: false,
        error: 'Pièce jointe non trouvée'
      });
    }
    
    res.setHeader('Content-Type', attachmentData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(attachmentData.data);
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement de la pièce jointe:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du téléchargement de la pièce jointe'
    });
  }
};

// Marquer un email comme lu/non lu
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;
    const { mailbox = 'INBOX' } = req.query;
    
    console.log(`🔍 Marquage de l'email ${id} comme ${isRead ? 'lu' : 'non lu'}`);
    
    const success = await imapService.markAsRead(id, isRead, mailbox);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Email non trouvé'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Email marqué comme ${isRead ? 'lu' : 'non lu'}`
    });
  } catch (error) {
    console.error('❌ Erreur lors du marquage de l\'email:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du marquage de l\'email'
    });
  }
};

// Supprimer un email
exports.deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { mailbox = 'INBOX' } = req.query;
    
    console.log(`🔍 Suppression de l'email ${id} depuis ${mailbox}`);
    
    const success = await imapService.deleteEmail(id, mailbox);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Email non trouvé'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Email supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'email:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression de l\'email'
    });
  }
};

// Obtenir les statistiques des emails
exports.getEmailStats = async (req, res) => {
  try {
    console.log('🔍 Récupération des statistiques emails');
    
    const stats = await imapService.getEmailStats();
    
    return res.status(200).json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
};
