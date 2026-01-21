const { CV, Partner, Plan, Associate, Payment, Personnel } = require('../models');
const mongoose = require('mongoose');

// Get all CVs for the authenticated partner
exports.getAllCVs = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { search, page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = { partnerId };
    
    if (search) {
      whereConditions.name = new RegExp(search, 'i');
    }
    
    // Get CVs with pagination
    const count = await CV.countDocuments(whereConditions);
    
    const cvs = await CV.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('id name language createdAt updatedAt');
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        cvs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching CVs:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching CVs'
    });
  }
};

// Get a specific CV by ID
exports.getCVById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const cv = await CV.findOne({
      where: {
        id,
        partnerId
      }
    });
    
    if (!cv) {
      return res.status(404).json({
        success: false,
        error: 'CV not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: cv
    });
  } catch (error) {
    console.error('Error fetching CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching CV'
    });
  }
};

// Create a new CV
exports.createCV = async (req, res) => {
  try {
    const { name, language, data } = req.body;
    const partnerId = req.partner.id;
    
    // Get partner with plan details
    const partner = await Partner.findById(partnerId);
    
    // Get plan details
    const plan = await Plan.findOne({ type: partner.plan });
    
    // Check if partner has reached their quota
    if (partner.cvUsedThisMonth >= plan.monthlyQuota) {
      return res.status(403).json({
        success: false,
        error: 'Monthly CV quota exceeded'
      });
    }
    
    // Create new CV
    const cv = await CV.create({
      partnerId,
      name,
      language,
      data,
      pdfUrl: req.body.pdfUrl || null
    });
    
    // Increment CV usage count
    await Partner.findByIdAndUpdate(
      partnerId,
      { $inc: { cvUsedThisMonth: 1 } }
    );
    
    // Mettre à jour l'historique des CV du partenaire
    if (partner.cvHistory) {
      partner.cvHistory.push({
        cvId: cv._id,
        name: cv.name,
        pdfUrl: cv.pdfUrl,
        createdAt: new Date()
      });
      await partner.save();
    }
    
    // Extraire les informations personnelles du CV pour la liste du personnel
    try {
      // Vérifier si les données nécessaires sont présentes
      if (data && data.personalInfo) {
        const personalInfo = data.personalInfo;
        
        // Créer une entrée dans la liste du personnel
        await Personnel.create({
          firstName: personalInfo.firstName || '',
          lastName: personalInfo.lastName || '',
          dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : new Date(),
          gender: personalInfo.gender || 'M',
          phoneNumber: personalInfo.phoneNumber || personalInfo.phone || '',
          position: personalInfo.position || personalInfo.jobTitle || '',
          cvId: cv._id,
          cvPdfUrl: cv.pdfUrl,
          additionalInfo: {
            email: personalInfo.email || '',
            address: personalInfo.address || '',
            education: data.education || [],
            experience: data.experience || []
          }
        });
      }
    } catch (personnelError) {
      console.error('Erreur lors de l\'extraction des informations du personnel:', personnelError);
      // Ne pas bloquer la création du CV si l'extraction échoue
    }
    
    return res.status(201).json({
      success: true,
      data: cv
    });
  } catch (error) {
    console.error('Error creating CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while creating CV'
    });
  }
};

// Update an existing CV
exports.updateCV = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, data } = req.body;
    const partnerId = req.partner.id;
    
    // Find CV and check ownership
    const cv = await CV.findOne({
      where: {
        id,
        partnerId
      }
    });
    
    if (!cv) {
      return res.status(404).json({
        success: false,
        error: 'CV not found'
      });
    }
    
    // Update CV
    cv.name = name || cv.name;
    cv.data = data || cv.data;
    await cv.save();
    
    return res.status(200).json({
      success: true,
      data: cv
    });
  } catch (error) {
    console.error('Error updating CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating CV'
    });
  }
};

// Delete a CV
exports.deleteCV = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    // Find CV and check ownership
    const cv = await CV.findOne({
      where: {
        id,
        partnerId
      }
    });
    
    if (!cv) {
      return res.status(404).json({
        success: false,
        error: 'CV not found'
      });
    }
    
    // Delete CV
    await CV.deleteOne({ _id: id });
    
    return res.status(200).json({
      success: true,
      message: 'CV deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while deleting CV'
    });
  }
};

// Public CV purchase
exports.purchaseCV = async (req, res) => {
  try {
    const { paymentToken, cvData, referralCode } = req.body;
    
    // Définir le prix du CV (à ajuster selon votre modèle de tarification)
    const cvPrice = 5000; // 5000 FCFA par exemple
    let associateId = null;
    let commissionAmount = 0;
    
    // Si un code de parrainage est fourni, le valider et créer une commission
    if (referralCode) {
      const associate = await Associate.findOne({ referralCode });
      
      if (associate) {
        associateId = associate._id;
        
        // Calculer la commission (par exemple 20% du prix du CV)
        commissionAmount = Math.round(cvPrice * 0.2);
        
        // Mettre à jour les statistiques de parrainage de l'associé
        const currentDate = new Date();
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Incrémenter le nombre total de CV
        associate.referralStats.totalCVs += 1;
        
        // Mettre à jour les statistiques par mois
        if (!associate.referralStats.cvsByMonth) {
          associate.referralStats.cvsByMonth = new Map();
        }
        
        const currentMonthCount = associate.referralStats.cvsByMonth.get(monthKey) || 0;
        associate.referralStats.cvsByMonth.set(monthKey, currentMonthCount + 1);
        
        // Mettre à jour les statistiques financières
        associate.totalSales += cvPrice;
        associate.totalCommission += commissionAmount;
        associate.availableBalance += commissionAmount;
        
        await associate.save();
        
        // Créer une transaction de commission
        await Payment.create({
          associateId,
          amount: commissionAmount,
          currency: 'FCFA',
          type: 'associate_commission',
          status: 'completed',
          paymentMethod: 'system',
          notes: `Commission pour l'achat du CV #${cv ? cv._id : 'nouveau'} via le code de parrainage ${referralCode}`
        });
      }
    }
    
    // Créer le CV avec le code de parrainage s'il existe
    const cv = await CV.create({
      name: cvData.personalInfo?.firstName 
        ? `CV ${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
        : 'New CV',
      language: cvData.language || 'fr',
      data: cvData,
      referralCode: referralCode || null,
      pdfUrl: req.body.pdfUrl || null // Sera mis à jour après la génération du PDF
    });
    
    // Créer une transaction pour l'achat du CV
    await Payment.create({
      amount: cvPrice,
      currency: 'FCFA',
      type: 'cv_purchase',
      status: 'completed',
      paymentMethod: 'card', // À remplacer par la méthode réelle
      associateId, // Null si pas de code de parrainage
      notes: `Achat du CV #${cv._id}`
    });
    
    // Extraire les informations personnelles du CV pour la liste du personnel
    try {
      // Vérifier si les données nécessaires sont présentes
      if (cvData && cvData.personalInfo) {
        const personalInfo = cvData.personalInfo;
        
        // Créer une entrée dans la liste du personnel
        await Personnel.create({
          firstName: personalInfo.firstName || '',
          lastName: personalInfo.lastName || '',
          dateOfBirth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : new Date(),
          gender: personalInfo.gender || 'M',
          phoneNumber: personalInfo.phoneNumber || personalInfo.phone || '',
          position: personalInfo.position || personalInfo.jobTitle || '',
          cvId: cv._id,
          cvPdfUrl: cv.pdfUrl,
          additionalInfo: {
            email: personalInfo.email || '',
            address: personalInfo.address || '',
            education: cvData.education || [],
            experience: cvData.experience || []
          }
        });
      }
    } catch (personnelError) {
      console.error('Erreur lors de l\'extraction des informations du personnel:', personnelError);
      // Ne pas bloquer la création du CV si l'extraction échoue
    }
    
    return res.status(201).json({
      success: true,
      data: {
        cvId: cv._id,
        downloadUrl: `/api/cv/download/${cv._id}`,
        message: 'Payment successful, CV created.'
      }
    });
  } catch (error) {
    console.error('Error purchasing CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while processing purchase'
    });
  }
};
