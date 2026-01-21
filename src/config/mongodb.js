const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Chaîne de connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://studyagency9_db_user:Studyagency237@studyiacareer.9deyedc.mongodb.net/?appName=StudyiaCareer';

// Fonction pour connecter à MongoDB
const connectDB = async () => {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connecté avec succès!`);
    console.log(`Hôte: ${mongoose.connection.host}`);
    console.log(`Base de données: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (error) {
    console.error(`Erreur de connexion à MongoDB:`, error);
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };
