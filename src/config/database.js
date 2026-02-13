const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Chaîne de connexion MongoDB avec validation
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://studyagency9_db_user:Studyagency237@studyiacareer.9deyedc.mongodb.net/?appName=StudyiaCareer';

// Validation de l'URI
if (!MONGODB_URI.includes('mongodb+srv://') && !MONGODB_URI.includes('mongodb://')) {
  console.error('❌ MONGODB_URI invalide. Doit commencer par mongodb:// ou mongodb+srv://');
  process.exit(1);
}

console.log('🔍 Configuration MongoDB:');
console.log('   URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
console.log('   NODE_ENV:', process.env.NODE_ENV);

// Fonction pour connecter à MongoDB
const connectDB = async () => {
  try {
    // Options de connexion pour Mongoose 7+
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000
    };

    console.log('Tentative de connexion à MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')); // Cacher les credentials
    
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ Erreur de connexion à MongoDB: ${error.message}`);
    console.error('Détails de l\'erreur:', error);
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };
