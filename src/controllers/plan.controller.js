const { Plan } = require('../models/mongodb');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Get all available plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching plans'
    });
  }
};

// Request a plan change
exports.requestPlanChange = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { newPlan, message } = req.body;
    
    // Validate plan exists
    const plan = await Plan.findOne({ type: newPlan });
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // In a real implementation, you would:
    // 1. Create a notification for admins
    // 2. Send an email to the admin
    // 3. Log the request
    
    // For now, we'll just simulate sending an email
    const emailContent = `
      Plan Change Request:
      Partner ID: ${partnerId}
      Current Plan: ${req.partner.plan}
      Requested Plan: ${newPlan}
      Message: ${message || 'No message provided'}
    `;
    
    console.log('Plan change request email:', emailContent);
    
    // In a real implementation, you would use a proper email service
    // For example, using nodemailer:
    /*
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'admin@studyia.net',
      subject: 'Plan Change Request',
      text: emailContent
    });
    */
    
    return res.status(200).json({
      success: true,
      message: 'Plan change request sent successfully'
    });
  } catch (error) {
    console.error('Error requesting plan change:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while requesting plan change'
    });
  }
};

// Initialize default plans (for seeding the database)
exports.initDefaultPlans = async () => {
  try {
    console.log('Initialisation des plans par défaut...');
    
    // Vérifier si la connexion à MongoDB est établie
    try {
      await Plan.findOne();
      console.log('Connexion à la collection Plan vérifiée');
    } catch (connError) {
      console.error('Erreur de connexion à la collection Plan:', connError.message);
      return; // Sortir de la fonction si la connexion n'est pas établie
    }
    
    const plans = [
      {
        type: 'starter',
        name: 'Starter',
        monthlyQuota: 30,
        price: 15000,
        pricePerDay: 500,
        features: [
          '30 CV par mois',
          'Accès à tous les templates',
          'Support email'
        ],
        badge: null,
        recommended: false
      },
      {
        type: 'pro',
        name: 'Pro',
        monthlyQuota: 100,
        price: 30000,
        pricePerDay: 1000,
        features: [
          '100 CV par mois',
          'Accès à tous les templates',
          'Support prioritaire',
          'Analyse IA avancée'
        ],
        badge: 'Populaire',
        recommended: true
      },
      {
        type: 'business',
        name: 'Business',
        monthlyQuota: 300,
        price: 60000,
        pricePerDay: 2000,
        features: [
          '300 CV par mois',
          'Accès à tous les templates',
          'Support dédié',
          'Analyse IA avancée',
          'Personnalisation des templates',
          'API d\'intégration'
        ],
        badge: null,
        recommended: false
      }
    ];
    
    // Create plans if they don't exist
    for (const planData of plans) {
      try {
        await Plan.findOneAndUpdate(
          { type: planData.type },
          planData,
          { upsert: true, new: true }
        );
        console.log(`Plan ${planData.type} initialisé avec succès`);
      } catch (updateError) {
        console.error(`Erreur lors de l'initialisation du plan ${planData.type}:`, updateError.message);
      }
    }
    
    console.log('Default plans initialized');
  } catch (error) {
    console.error('Error initializing default plans:', error);
  }
};
