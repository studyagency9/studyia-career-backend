const { Partner } = require('./src/models/mongodb');
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');

(async () => {
  try {
    await connectDB();
    
    // Tester avec le partner mis à jour
    const partner = await Partner.findOne({ email: 'test@partner.com' });
    
    if (partner) {
      console.log('=== PARTNER MIS À JOUR ===');
      console.log('Email:', partner.email);
      console.log('Plan:', partner.plan);
      console.log('CV Quota:', partner.cvQuota);
      console.log('CV Used:', partner.cvUsedThisMonth);
      
      console.log('\n=== MÉTHODES DU MODÈLE ===');
      console.log('getCvQuota():', partner.getCvQuota());
      console.log('canCreateCV():', partner.canCreateCV());
      console.log('getCVStats():', JSON.stringify(partner.getCVStats(), null, 2));
      
      // Tester l'incrémentation
      console.log('\n=== TEST INCRÉMENTATION ===');
      for (let i = 0; i < 12; i++) {
        const canIncrement = partner.incrementCVCount();
        console.log('Tentative', i+1, '- Incrément réussi:', canIncrement, '- CV Used:', partner.cvUsedThisMonth);
        if (!canIncrement) break;
      }
      
      console.log('\n=== STATS FINALES ===');
      console.log('getCVStats():', JSON.stringify(partner.getCVStats(), null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
