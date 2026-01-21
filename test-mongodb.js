const mongoose = require('mongoose');

// Chaîne de connexion MongoDB
const MONGODB_URI = 'mongodb+srv://studyagency9_db_user:Studyagency237@studyiacareer.9deyedc.mongodb.net/?appName=StudyiaCareer';

// Fonction pour tester la connexion à MongoDB
async function testConnection() {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connexion à MongoDB réussie!');
    console.log(`Hôte: ${mongoose.connection.host}`);
    console.log(`Base de données: ${mongoose.connection.name}`);
    
    // Créer un modèle simple pour tester
    const TestSchema = new mongoose.Schema({
      name: String,
      date: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.model('Test', TestSchema);
    
    // Créer un document de test
    const testDoc = new Test({ name: 'Test de connexion' });
    await testDoc.save();
    console.log('Document de test créé avec succès!');
    
    // Récupérer le document
    const foundDoc = await Test.findOne({ name: 'Test de connexion' });
    console.log('Document récupéré:', foundDoc);
    
    // Supprimer le document de test
    await Test.deleteOne({ _id: foundDoc._id });
    console.log('Document supprimé avec succès!');
    
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('Connexion fermée');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
  }
}

// Exécuter le test
testConnection();
