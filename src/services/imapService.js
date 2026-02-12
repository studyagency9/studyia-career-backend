const { ImapFlow } = require('imapflow');

// Configuration IMAP
const imapConfig = {
  host: 'imap.hostinger.com',
  port: 993,
  secure: true,
  auth: {
    user: 'contact@studyia.net',
    pass: process.env.MAIL_PASSWORD,
  },
};

let client = null;

// Connexion au serveur IMAP
const connectImap = async () => {
  try {
    if (client && client.usable) {
      return client;
    }

    client = new ImapFlow(imapConfig);
    await client.connect();
    console.log('✅ Connexion IMAP établie avec contact@studyia.net');
    return client;
  } catch (error) {
    console.error('❌ Erreur de connexion IMAP:', error);
    throw error;
  }
};

// Déconnexion
const disconnectImap = async () => {
  try {
    if (client && client.usable) {
      await client.logout();
      client = null;
      console.log('✅ Déconnexion IMAP réussie');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion IMAP:', error);
  }
};

// Lister les emails
const listEmails = async (options = {}) => {
  const {
    limit = 20,
    offset = 0,
    folder = 'INBOX',
    unreadOnly = false,
    search = null
  } = options;

  try {
    await connectImap();
    
    // Sélectionner la boîte de réception
    const mailbox = await client.mailboxOpen(folder);
    console.log(`📧 Boîte sélectionnée: ${mailbox.name} (${mailbox.exists} messages)`);

    // Construire la recherche
    let searchCriteria = [];
    
    if (unreadOnly) {
      searchCriteria.push(['UNSEEN']);
    }
    
    if (search) {
      searchCriteria.push(['OR', ['SUBJECT', search], ['FROM', search], ['BODY', search]]);
    }

    // Récupérer les messages
    let messages;
    if (searchCriteria.length > 0) {
      messages = await client.search(searchCriteria);
    } else {
      // Récupérer tous les messages (du plus récent au plus ancien)
      messages = await client.search(['ALL']);
    }

    // Limiter et paginer
    const startIndex = Math.max(0, messages.length - offset - limit);
    const endIndex = messages.length - offset;
    const paginatedMessages = messages.slice(startIndex, endIndex);

    // Récupérer les détails des messages
    const emails = [];
    for (const uid of paginatedMessages) {
      const message = await client.fetchOne(uid, { envelope: true, flags: true, bodyStructure: true });
      
      // Récupérer le corps du message
      const body = await client.fetchOne(uid, { bodyPart: '1' });
      
      const email = {
        uid: uid,
        messageId: message.envelope.messageId,
        date: message.envelope.date,
        subject: message.envelope.subject || '(Pas de sujet)',
        from: message.envelope.from?.[0] || null,
        to: message.envelope.to || [],
        cc: message.envelope.cc || [],
        flags: message.flags,
        unread: !message.flags.includes('\\Seen'),
        important: message.flags.includes('\\Flagged'),
        body: body?.body?.toString() || '',
        hasAttachments: message.bodyStructure?.parts?.some(part => part.disposition === 'attachment') || false,
        size: message.bodyStructure?.size || 0
      };

      emails.push(email);
    }

    // Inverser pour avoir les plus récents en premier
    emails.reverse();

    return {
      emails,
      total: messages.length,
      folder: mailbox.name,
      unreadCount: mailbox.unseen
    };

  } catch (error) {
    console.error('❌ Erreur lors de la lecture des emails:', error);
    throw error;
  }
};

// Marquer un email comme lu/non lu
const markEmail = async (uid, read = true) => {
  try {
    await connectImap();
    
    if (read) {
      await client.setFlags(uid, ['\\Seen']);
      console.log(`✅ Email ${uid} marqué comme lu`);
    } else {
      await client.setFlags(uid, ['\\Seen'], { remove: true });
      console.log(`✅ Email ${uid} marqué comme non lu`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du marquage de l\'email:', error);
    throw error;
  }
};

// Supprimer un email
const deleteEmail = async (uid) => {
  try {
    await connectImap();
    
    await client.setFlags(uid, ['\\Deleted']);
    await client.mailboxExpunge();
    console.log(`✅ Email ${uid} supprimé`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'email:', error);
    throw error;
  }
};

// Récupérer un email spécifique
const getEmail = async (uid) => {
  try {
    await connectImap();
    
    const message = await client.fetchOne(uid, { 
      envelope: true, 
      flags: true, 
      bodyStructure: true,
      bodyParts: ['1', '2']
    });
    
    // Récupérer toutes les parties du corps
    let body = '';
    let htmlBody = '';
    
    if (message.bodyParts) {
      for (const part of message.bodyParts) {
        if (part.partNumber === '1') {
          body = part.body?.toString() || '';
        } else if (part.partNumber === '2') {
          htmlBody = part.body?.toString() || '';
        }
      }
    }

    const email = {
      uid: uid,
      messageId: message.envelope.messageId,
      date: message.envelope.date,
      subject: message.envelope.subject || '(Pas de sujet)',
      from: message.envelope.from?.[0] || null,
      to: message.envelope.to || [],
      cc: message.envelope.cc || [],
      flags: message.flags,
      unread: !message.flags.includes('\\Seen'),
      important: message.flags.includes('\\Flagged'),
      body: body,
      htmlBody: htmlBody,
      hasAttachments: message.bodyStructure?.parts?.some(part => part.disposition === 'attachment') || false,
      size: message.bodyStructure?.size || 0
    };

    return email;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'email:', error);
    throw error;
  }
};

// Statistiques de la boîte mail
const getMailboxStats = async (folder = 'INBOX') => {
  try {
    await connectImap();
    
    const mailbox = await client.mailboxOpen(folder);
    
    const stats = {
      folder: mailbox.name,
      total: mailbox.exists,
      unread: mailbox.unseen,
      recent: mailbox.recent,
      flags: mailbox.flags,
      permanentFlags: mailbox.permanentFlags
    };

    return stats;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
};

// Initialiser le service IMAP
const initImapService = async () => {
  try {
    await connectImap();
    console.log('✅ Service IMAP initialisé avec succès');
    return true;
  } catch (error) {
    console.warn('⚠️ Service IMAP non disponible - Vérifiez les configurations IMAP');
    return false;
  }
};

module.exports = {
  connectImap,
  disconnectImap,
  listEmails,
  getEmail,
  markEmail,
  deleteEmail,
  getMailboxStats,
  initImapService
};
