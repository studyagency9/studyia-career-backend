const { Partner } = require('./src/models/mongodb');
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');

(async () => {
  try {
    await connectDB();
    
    console.log('=== CRÉATION NOUVEAU PARTNER ===');
    
    // Supprimer d'abord le partner s'il existe
    await Partner.deleteOne({ email: 'newtest@partner.com' });
    
    // Créer un nouveau partner pour tester
    const newPartner = await Partner.create({
      email: 'newtest@partner.com',
      passwordHash: 'test123',
      firstName: 'New',
      lastName: 'Test',
      company: 'Test Company',
      plan: 'pro',
      planRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    console.log('✅ Nouveau partner créé');
    console.log('Email:', newPartner.email);
    console.log('Plan:', newPartner.plan);
    console.log('CV Quota:', newPartner.cvQuota);
    console.log('CV Used:', newPartner.cvUsedThisMonth);
    
    console.log('\n=== MÉTHODES DU MODÈLE ===');
    console.log('getCvQuota():', newPartner.getCvQuota());
    console.log('canCreateCV():', newPartner.canCreateCV());
    console.log('getCVStats():', JSON.stringify(newPartner.getCVStats(), null, 2));
    
    // Tester l'incrémentation
    console.log('\n=== TEST INCRÉMENTATION ===');
    for (let i = 0; i < 5; i++) {
      const canIncrement = newPartner.incrementCVCount();
      console.log('Tentative', i+1, '- Incrément réussi:', canIncrement, '- CV Used:', newPartner.cvUsedThisMonth);
      if (!canIncrement) break;
    }
    
    console.log('\n=== STATS FINALES ===');
    console.log('getCVStats():', JSON.stringify(newPartner.getCVStats(), null, 2));
    
    // Nettoyer
    await Partner.deleteOne({ email: 'newtest@partner.com' });
    console.log('\n✅ Partner de test supprimé');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
