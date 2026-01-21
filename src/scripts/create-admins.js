const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Admin } = require('../models');

// Charger les variables d'environnement
dotenv.config();

// Fonction pour créer les administrateurs
const createAdmins = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Liste des administrateurs à créer
    const adminsToCreate = [
      {
        email: 'admin@studyia.com',
        passwordHash: 'STUDYIADMIN01',
        firstName: 'Nokmis',
        lastName: 'De Song Emmanuel',
        role: 'superadmin'
      },
      {
        email: 'comptable@studyia.com',
        passwordHash: 'STUDYIACMPT01',
        firstName: 'Tem Nloga',
        lastName: 'Martinese De Loresse',
        role: 'comptable'
      },
      {
        email: 'secretaire1@studyia.com',
        passwordHash: 'STUDYIASCRT01',
        firstName: 'Ndebi Masson',
        lastName: 'Blaise Parfait',
        role: 'secretaire'
      },
      {
        email: 'secretaire2@studyia.com',
        passwordHash: 'STUDYIASCRT02',
        firstName: 'Thomas',
        lastName: 'Bihang Brandon',
        role: 'secretaire'
      }
    ];

    // Créer ou mettre à jour chaque administrateur
    for (const adminData of adminsToCreate) {
      const existingAdmin = await Admin.findOne({ email: adminData.email });

      if (existingAdmin) {
        console.log(`L'administrateur ${adminData.email} existe déjà. Mise à jour...`);
        existingAdmin.firstName = adminData.firstName;
        existingAdmin.lastName = adminData.lastName;
        existingAdmin.passwordHash = adminData.passwordHash;
        existingAdmin.role = adminData.role;
        await existingAdmin.save();
        console.log(`Administrateur ${adminData.email} mis à jour avec succès.`);
      } else {
        console.log(`Création de l'administrateur ${adminData.email}...`);
        await Admin.create(adminData);
        console.log(`Administrateur ${adminData.email} créé avec succès.`);
      }
    }

    console.log('Tous les administrateurs ont été créés ou mis à jour avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création des administrateurs:', error);
    process.exit(1);
  }
};

// Exécuter la fonction
createAdmins();
