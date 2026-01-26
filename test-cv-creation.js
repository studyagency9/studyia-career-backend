const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Importer les modèles
const { CV, Personnel, Payment, Associate } = require('./src/models/mongodb');

// Chaîne de connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://studyagency9_db_user:Studyagency237@studyiacareer.9deyedc.mongodb.net/?appName=StudyiaCareer';

// Fonction pour tester la création de CV
async function testCVCreation() {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connexion à MongoDB réussie!');
    console.log(`Hôte: ${mongoose.connection.host}`);
    console.log(`Base de données: ${mongoose.connection.name}`);
    
    // Données de test pour un CV
    const cvData = {
      personalInfo: {
        firstName: 'Test',
        lastName: 'Utilisateur',
        email: 'test@example.com',
        phone: '123456789',
        address: 'Adresse de test',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'M',
        position: 'Développeur Test'
      },
      education: [
        {
          institution: 'École Test',
          degree: 'Licence',
          field: 'Informatique',
          startDate: '2010-09',
          endDate: '2013-06'
        }
      ],
      experience: [
        {
          company: 'Entreprise Test',
          position: 'Développeur Junior',
          startDate: '2013-09',
          endDate: '2015-12',
          description: 'Description du poste'
        }
      ],
      language: 'fr'
    };
    
    // Code de parrainage pour tester
    const referralCode = 'ABC123'; // Remplacer par un code valide si nécessaire
    
    // 1. Vérifier si le code de parrainage existe
    console.log('Vérification du code de parrainage:', referralCode);
    const associate = await Associate.findOne({ referralCode });
    
    if (associate) {
      console.log('Associé trouvé:', associate.firstName, associate.lastName);
      console.log('ID de l\'associé:', associate._id);
    } else {
      console.log('Aucun associé trouvé avec ce code de parrainage');
    }
    
    // 2. Créer un CV
    console.log('Création d\'un CV de test...');
    const cv = await CV.create({
      name: `CV ${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
      language: cvData.language,
      data: cvData,
      referralCode: associate ? referralCode : null,
      pdfUrl: 'https://example.com/test.pdf'
    });
    
    console.log('CV créé avec succès!');
    console.log('ID du CV:', cv._id);
    
    // 3. Si un associé est trouvé, mettre à jour ses statistiques
    if (associate) {
      const cvPrice = 5000; // Prix du CV en FCFA
      const commissionAmount = Math.round(cvPrice * 0.5); // Commission de 50%
      
      console.log('Mise à jour des statistiques de l\'associé...');
      
      // Mettre à jour les statistiques de parrainage
      associate.referralStats.totalCVs += 1;
      
      // Mettre à jour les statistiques financières
      associate.totalSales += cvPrice;
      associate.totalCommission += commissionAmount;
      associate.availableBalance += commissionAmount;
      
      // Ajouter la vente à l'historique des ventes
      const newSale = {
        cvId: cv._id,
        clientName: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
        clientEmail: cvData.personalInfo.email,
        amount: cvPrice,
        commission: commissionAmount,
        date: new Date(),
        status: 'validated'
      };
      
      if (!associate.salesHistory) {
        associate.salesHistory = [];
      }
      
      associate.salesHistory.push(newSale);
      
      await associate.save();
      console.log('Statistiques de l\'associé mises à jour avec succès!');
      console.log('Nouvelle vente ajoutée à l\'historique des ventes');
      
      // 4. Créer une transaction de commission
      console.log('Création d\'une transaction de commission...');
      const commissionPayment = await Payment.create({
        associateId: associate._id,
        amount: commissionAmount,
        currency: 'FCFA',
        type: 'associate_commission',
        status: 'completed',
        paymentMethod: 'system',
        notes: `Commission pour l'achat du CV #${cv._id} via le code de parrainage ${referralCode}`
      });
      
      console.log('Transaction de commission créée avec succès!');
      console.log('ID de la transaction:', commissionPayment._id);
    }
    
    // 5. Créer une transaction pour l'achat du CV
    console.log('Création d\'une transaction pour l\'achat du CV...');
    const cvPayment = await Payment.create({
      amount: 5000, // Prix du CV
      currency: 'FCFA',
      type: 'cv_purchase',
      status: 'completed',
      paymentMethod: 'card',
      associateId: associate ? associate._id : null,
      notes: `Achat du CV #${cv._id}`
    });
    
    console.log('Transaction d\'achat créée avec succès!');
    console.log('ID de la transaction:', cvPayment._id);
    
    // 6. Créer une entrée dans la liste du personnel
    console.log('Création d\'une entrée dans la liste du personnel...');
    const personnel = await Personnel.create({
      firstName: cvData.personalInfo.firstName,
      lastName: cvData.personalInfo.lastName,
      dateOfBirth: cvData.personalInfo.dateOfBirth,
      gender: cvData.personalInfo.gender,
      phoneNumber: cvData.personalInfo.phone,
      position: cvData.personalInfo.position,
      cvId: cv._id,
      cvPdfUrl: cv.pdfUrl,
      additionalInfo: {
        email: cvData.personalInfo.email,
        address: cvData.personalInfo.address,
        education: cvData.education,
        experience: cvData.experience
      }
    });
    
    console.log('Entrée personnel créée avec succès!');
    console.log('ID du personnel:', personnel._id);
    
    // 7. Vérifier que tout a été créé correctement
    console.log('\nVérification des données créées:');
    
    const createdCV = await CV.findById(cv._id);
    console.log('CV trouvé:', createdCV ? 'Oui' : 'Non');
    
    const createdPersonnel = await Personnel.findOne({ cvId: cv._id });
    console.log('Personnel trouvé:', createdPersonnel ? 'Oui' : 'Non');
    
    const createdPayments = await Payment.find({ 
      $or: [
        { notes: { $regex: cv._id.toString() } },
        { associateId: associate ? associate._id : null }
      ]
    });
    console.log('Nombre de transactions trouvées:', createdPayments.length);
    
    if (associate) {
      const updatedAssociate = await Associate.findById(associate._id);
      const lastSale = updatedAssociate.salesHistory[updatedAssociate.salesHistory.length - 1];
      console.log('Vente trouvée dans l\'historique de l\'associé:', lastSale ? 'Oui' : 'Non');
      if (lastSale) {
        console.log('ID du CV dans la vente:', lastSale.cvId);
        console.log('Correspond à l\'ID du CV créé:', lastSale.cvId.toString() === cv._id.toString() ? 'Oui' : 'Non');
      }
    }
    
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\nTest terminé. Connexion fermée.');
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Exécuter le test
testCVCreation();
