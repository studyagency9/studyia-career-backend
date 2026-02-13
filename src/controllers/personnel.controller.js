const { Personnel, CV } = require('../models');

// Récupérer le personnel par CV ID (pour le frontend après achat)
exports.getPersonnelByCvId = async (req, res) => {
  try {
    const { cvId } = req.params;
    
    console.log(`🔍 Recherche du personnel pour CV ID: ${cvId}`);
    
    const personnel = await Personnel.findOne({ cvId });
    
    if (!personnel) {
      console.log(`❌ Personnel non trouvé pour CV ID: ${cvId}`);
      return res.status(404).json({
        success: false,
        error: 'Personnel non trouvé pour ce CV'
      });
    }
    
    console.log(`✅ Personnel trouvé: ${personnel._id}`);
    
    return res.status(200).json({
      success: true,
      personnel: personnel
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du personnel par CV ID:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du personnel'
    });
  }
};

// Récupérer toute la liste du personnel
exports.getAllPersonnel = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construire les conditions de recherche
    const whereConditions = {};
    
    if (search) {
      whereConditions.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { position: new RegExp(search, 'i') }
      ];
    }
    
    // Récupérer le nombre total pour la pagination
    const count = await Personnel.countDocuments(whereConditions);
    
    // Récupérer le personnel avec pagination
    const personnel = await Personnel.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Calculer les informations de pagination
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        personnel,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du personnel:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du personnel'
    });
  }
};

// Récupérer les détails d'une personne
exports.getPersonnelById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const person = await Personnel.findById(id).populate('cvId');
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la personne:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des détails'
    });
  }
};

// Ajouter une personne à la liste du personnel
exports.addPersonnel = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, phoneNumber, position, cvId, additionalInfo } = req.body;
    
    // Vérifier si le CV existe
    if (cvId) {
      const cv = await CV.findById(cvId);
      if (!cv) {
        return res.status(404).json({
          success: false,
          error: 'CV non trouvé'
        });
      }
    }
    
    // Créer la nouvelle personne
    const newPerson = await Personnel.create({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber,
      position,
      cvId,
      cvPdfUrl: req.body.cvPdfUrl || null,
      additionalInfo: additionalInfo || {}
    });
    
    return res.status(201).json({
      success: true,
      data: newPerson
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'une personne:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'ajout d\'une personne'
    });
  }
};

// Mettre à jour les informations d'une personne
exports.updatePersonnel = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, dateOfBirth, gender, phoneNumber, position, cvId, cvPdfUrl, additionalInfo } = req.body;
    
    const person = await Personnel.findById(id);
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    // Vérifier si le nouveau CV existe
    if (cvId && cvId !== person.cvId.toString()) {
      const cv = await CV.findById(cvId);
      if (!cv) {
        return res.status(404).json({
          success: false,
          error: 'CV non trouvé'
        });
      }
    }
    
    // Mettre à jour les informations
    if (firstName) person.firstName = firstName;
    if (lastName) person.lastName = lastName;
    if (dateOfBirth) person.dateOfBirth = dateOfBirth;
    if (gender) person.gender = gender;
    if (phoneNumber) person.phoneNumber = phoneNumber;
    if (position) person.position = position;
    if (cvId) person.cvId = cvId;
    if (cvPdfUrl) person.cvPdfUrl = cvPdfUrl;
    if (additionalInfo) person.additionalInfo = { ...person.additionalInfo, ...additionalInfo };
    
    await person.save();
    
    return res.status(200).json({
      success: true,
      data: person
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour d\'une personne:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour d\'une personne'
    });
  }
};

// Supprimer une personne
exports.deletePersonnel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const person = await Personnel.findById(id);
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    await Personnel.deleteOne({ _id: id });
    
    return res.status(200).json({
      success: true,
      message: 'Personne supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression d\'une personne:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression d\'une personne'
    });
  }
};
