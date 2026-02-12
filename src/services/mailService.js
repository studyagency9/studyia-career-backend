const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransporter({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "contact@studyia.net",
    pass: process.env.MAIL_PASSWORD, // ne PAS mettre le mdp en dur
  },
});

// Vérification de la connexion au transporteur
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Serveur email connecté avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion au serveur email:', error);
    return false;
  }
};

// Envoyer un email de contact
exports.sendContactMail = async (params) => {
  const { name, email, message, phone, subject } = params;

  try {
    await transporter.sendMail({
      from: '"Studyia Contact" <contact@studyia.net>',
      to: "contact@studyia.net", // où tu reçois les messages
      replyTo: email, // pour pouvoir répondre au visiteur
      subject: subject || `Nouveau message de ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
            <h1>📧 Nouveau Message de Contact</h1>
            <h2>Studyia - Plateforme Carrière</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #4F46E5; margin-bottom: 15px;">Informations du Contact</h3>
              
              <div style="margin-bottom: 15px;">
                <strong>Nom:</strong> ${name}
              </div>
              
              <div style="margin-bottom: 15px;">
                <strong>Email:</strong> ${email}
              </div>
              
              ${phone ? `
              <div style="margin-bottom: 15px;">
                <strong>Téléphone:</strong> ${phone}
              </div>
              ` : ''}
              
              <div style="margin-bottom: 15px;">
                <strong>Date:</strong> ${new Date().toLocaleString('fr-FR', { 
                  timeZone: 'Africa/Douala',
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </div>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <h3 style="color: #4F46E5; margin-bottom: 15px;">Message</h3>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
          
          <div style="background-color: #4F46E5; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Cet email a été envoyé depuis le formulaire de contact du site Studyia</p>
            <p>© 2026 Studyia - Tous droits réservés</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Email envoyé avec succès à contact@studyia.net de la part de ${name} (${email})`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email de confirmation au visiteur
exports.sendConfirmationMail = async (params) => {
  const { name, email, subject } = params;

  try {
    await transporter.sendMail({
      from: '"Studyia" <contact@studyia.net>',
      to: email, // email du visiteur
      subject: "Confirmation de réception de votre message - Studyia",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
            <h1>✅ Message Reçu</h1>
            <h2>Merci de nous avoir contactés !</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p>Bonjour <strong>${name}</strong>,</p>
              
              <p>Nous avons bien reçu votre message concernant : <em>${subject || 'Demande générale'}</em></p>
              
              <p>Nous traitons votre demande et vous répondrons dans les plus brefs délais.</p>
              
              <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #0284c7; margin-bottom: 10px;">📞 Nos Coordonnées</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Email: <a href="mailto:contact@studyia.net" style="color: #4F46E5;">contact@studyia.net</a></li>
                  <li>Site: <a href="https://studyia.net" style="color: #4F46E5;">www.studyia.net</a></li>
                </ul>
              </div>
              
              <p>Cordialement,</p>
              <p><strong>L'équipe Studyia</strong></p>
            </div>
          </div>
          
          <div style="background-color: #4F46E5; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2026 Studyia - Plateforme Carrière | Tous droits réservés</p>
            <p>Cet email est automatique, merci de ne pas y répondre</p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Email de confirmation envoyé à ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation:', error);
    throw error;
  }
};

// Initialiser et vérifier la connexion
exports.initMailService = async () => {
  const isConnected = await verifyConnection();
  if (!isConnected) {
    console.warn('⚠️ Service email non disponible - Vérifiez les configurations SMTP');
  }
  return isConnected;
};
