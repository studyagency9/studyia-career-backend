/**
 * Script pour mettre à jour les liens de parrainage existants
 * Remplace /signup?ref= par /?ref= dans tous les liens de parrainage
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Associate } = require('../models/mongodb');

dotenv.config();

// Connexion à la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

// Fonction pour mettre à jour les liens de parrainage
const updateReferralLinks = async () => {
  try {
    console.log('Début de la mise à jour des liens de parrainage...');
    
    // Récupérer tous les associés avec des liens de parrainage contenant /signup?ref=
    const associates = await Associate.find({
      referralLink: { $regex: '/signup\\?ref=' }
    });
    
    console.log(`${associates.length} associés trouvés avec des liens à mettre à jour`);
    
    // Mettre à jour chaque lien
    let updatedCount = 0;
    
    for (const associate of associates) {
      const oldLink = associate.referralLink;
      const newLink = oldLink.replace('/signup?ref=', '/?ref=');
      
      associate.referralLink = newLink;
      await associate.save();
      
      updatedCount++;
      console.log(`[${updatedCount}/${associates.length}] Lien mis à jour: ${oldLink} -> ${newLink}`);
    }
    
    console.log(`Mise à jour terminée. ${updatedCount} liens ont été mis à jour.`);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des liens de parrainage:', error);
  } finally {
    mongoose.disconnect();
    console.log('Déconnexion de MongoDB');
  }
};

// Exécuter le script
connectDB()
  .then(() => updateReferralLinks())
  .catch(error => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });
