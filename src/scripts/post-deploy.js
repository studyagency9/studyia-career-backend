/**
 * Script post-déploiement pour Render
 * Ce script exécute les tâches nécessaires après le déploiement
 * - Création des administrateurs par défaut
 * - Génération de la documentation Swagger
 */

const { connectDB } = require('../config/database');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

async function runPostDeployTasks() {
  console.log('Exécution des tâches post-déploiement...');
  
  try {
    // Connexion à la base de données
    await connectDB();
    console.log('Connecté à MongoDB');
    
    // Création des administrateurs
    console.log('Création des administrateurs...');
    const createAdminsScript = path.join(__dirname, 'create-admins.js');
    
    if (fs.existsSync(createAdminsScript)) {
      await new Promise((resolve, reject) => {
        exec(`node ${createAdminsScript}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erreur lors de la création des administrateurs: ${error.message}`);
            return reject(error);
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
          }
          console.log(`stdout: ${stdout}`);
          resolve();
        });
      });
    } else {
      console.error(`Le script ${createAdminsScript} n'existe pas`);
    }
    
    // Génération de la documentation Swagger
    console.log('Génération de la documentation Swagger...');
    const swaggerScript = path.join(__dirname, '../swagger/combine-swagger.js');
    
    if (fs.existsSync(swaggerScript)) {
      await new Promise((resolve, reject) => {
        exec(`node ${swaggerScript}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erreur lors de la génération de la documentation Swagger: ${error.message}`);
            return reject(error);
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
          }
          console.log(`stdout: ${stdout}`);
          resolve();
        });
      });
    } else {
      console.error(`Le script ${swaggerScript} n'existe pas`);
    }
    
    console.log('Tâches post-déploiement terminées avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors des tâches post-déploiement:', error);
    process.exit(1);
  }
}

// Exécution du script
runPostDeployTasks();
