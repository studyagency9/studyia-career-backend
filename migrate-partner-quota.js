const { Partner } = require('./src/models/mongodb');
const mongoose = require('mongoose');
const { connectDB } = require('./src/config/database');

(async () => {
  try {
    await connectDB();
    
    console.log('=== MIGRATION PARTNER QUOTA ===');
    
    // Mettre à jour tous les partners qui n'ont pas de cvQuota
    const partners = await Partner.find({ cvQuota: { $exists: false } });
    console.log('Partners à migrer:', partners.length);
    
    for (const partner of partners) {
      const quotas = { starter: 10, pro: 50, business: 200 };
      partner.cvQuota = quotas[partner.plan] || 50;
      partner.cvCounterStartDate = partner.cvCounterStartDate || new Date();
      
      await partner.save();
      console.log(`✅ Partner ${partner.email} mis à jour - Plan: ${partner.plan}, Quota: ${partner.cvQuota}`);
    }
    
    // Tester avec un partner
    const testPartner = await Partner.findOne({ email: 'test@partner.com' });
    
    if (testPartner) {
      console.log('\n=== TEST PARTNER ===');
      console.log('Email:', testPartner.email);
      console.log('Plan:', testPartner.plan);
      console.log('CV Quota:', testPartner.cvQuota);
      console.log('CV Used:', testPartner.cvUsedThisMonth);
      
      console.log('\n=== MÉTHODES DU MODÈLE ===');
      console.log('getCvQuota():', testPartner.getCvQuota());
      console.log('canCreateCV():', testPartner.canCreateCV());
      console.log('getCVStats():', JSON.stringify(testPartner.getCVStats(), null, 2));
    }
    
    console.log('\n✅ Migration terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de migration:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
