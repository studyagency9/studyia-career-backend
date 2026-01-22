const { Associate, Payment } = require('../models/mongodb');
const { generateAccessToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// Génération d'un code de parrainage unique
const generateReferralCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Inscription d'un nouvel associé
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, country, city } = req.body;

    // Vérifier si l'email existe déjà
    const existingAssociate = await Associate.findOne({ email });
    if (existingAssociate) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }

    // Générer un code de parrainage unique
    let referralCode;
    let isUnique = false;
    
    while (!isUnique) {
      referralCode = generateReferralCode();
      const existingCode = await Associate.findOne({ referralCode });
      if (!existingCode) {
        isUnique = true;
      }
    }

    // Créer le lien de parrainage
    const referralLink = `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`;

    // Créer le nouvel associé
    const newAssociate = new Associate({
      email,
      passwordHash: password, // Sera haché par le middleware pre-save
      firstName,
      lastName,
      phone,
      country,
      city,
      referralCode,
      referralLink,
      referralStats: {
        totalCVs: 0,
        cvsByMonth: {}
      }
    });

    await newAssociate.save();

    return res.status(201).json({
      success: true,
      data: {
        id: newAssociate._id,
        email: newAssociate.email,
        firstName: newAssociate.firstName,
        lastName: newAssociate.lastName,
        referralCode: newAssociate.referralCode,
        referralLink: newAssociate.referralLink
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription d\'un associé:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'inscription'
    });
  }
};

// Connexion d'un associé
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'associé existe
    const associate = await Associate.findOne({ email });
    if (!associate) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si l'associé est actif
    if (associate.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Votre compte est ' + (associate.status === 'suspended' ? 'suspendu' : 'banni')
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await associate.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = generateAccessToken(associate, 'associate');

    return res.status(200).json({
      success: true,
      data: {
        token,
        associate: {
          id: associate._id,
          email: associate.email,
          firstName: associate.firstName,
          lastName: associate.lastName,
          referralCode: associate.referralCode,
          referralLink: associate.referralLink
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion d\'un associé:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la connexion'
    });
  }
};

// Récupérer le tableau de bord de l'associé
exports.getDashboard = async (req, res) => {
  try {
    const associateId = req.associate._id;

    // Récupérer l'associé avec toutes ses informations
    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Calculer les statistiques du mois en cours
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthCVs = associate.referralStats.cvsByMonth.get(currentMonth) || 0;
    
    // Récupérer les dernières transactions
    const recentTransactions = await Payment.find({
      associateId: associateId,
      type: { $in: ['associate_commission', 'withdrawal'] }
    })
    .sort({ createdAt: -1 })
    .limit(5);

    return res.status(200).json({
      success: true,
      data: {
        totalCVs: associate.referralStats.totalCVs,
        currentMonthCVs,
        totalSales: associate.totalSales,
        totalCommission: associate.totalCommission,
        availableBalance: associate.availableBalance,
        withdrawnAmount: associate.withdrawnAmount,
        recentTransactions: recentTransactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          createdAt: t.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du tableau de bord:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du tableau de bord'
    });
  }
};

// Récupérer les statistiques de parrainage
exports.getReferralStats = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const { period = '6months' } = req.query;

    // Récupérer l'associé
    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Calculer les dates pour la période demandée
    const currentDate = new Date();
    const months = [];
    let monthsToShow = 6;
    
    if (period === '12months') {
      monthsToShow = 12;
    } else if (period === '3months') {
      monthsToShow = 3;
    }

    for (let i = 0; i < monthsToShow; i++) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.unshift(monthKey);
    }

    // Préparer les données pour le graphique
    const chartData = months.map(month => ({
      month,
      cvs: associate.referralStats.cvsByMonth.get(month) || 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalCVs: associate.referralStats.totalCVs,
        chartData,
        referralCode: associate.referralCode,
        referralLink: associate.referralLink
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de parrainage:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
};

// Demander un retrait de fonds
exports.requestWithdrawal = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const { amount, paymentMethod } = req.body;

    // Vérifier que le montant est valide
    if (!amount || amount < 5000) {
      return res.status(400).json({
        success: false,
        error: 'Le montant minimum de retrait est de 5 000 FCFA'
      });
    }

    // Vérifier que la méthode de paiement est valide
    if (!['mobile_money', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Méthode de paiement non valide'
      });
    }

    // Récupérer l'associé
    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Vérifier que le solde est suffisant
    if (associate.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Solde insuffisant'
      });
    }

    // Calculer les frais (2% du montant)
    const fee = Math.round(amount * 0.02);
    const netAmount = amount - fee;

    // Créer la transaction de retrait
    const withdrawal = new Payment({
      associateId,
      amount,
      fee,
      currency: 'FCFA',
      type: 'withdrawal',
      status: 'pending',
      paymentMethod,
      notes: `Demande de retrait de ${amount} FCFA (frais: ${fee} FCFA, montant net: ${netAmount} FCFA)`
    });

    await withdrawal.save();

    // Mettre à jour l'historique des retraits de l'associé
    associate.withdrawalHistory.push({
      amount,
      fee,
      status: 'pending',
      requestDate: new Date(),
      paymentMethod
    });

    // Mettre à jour le solde disponible
    associate.availableBalance -= amount;
    await associate.save();

    return res.status(200).json({
      success: true,
      data: {
        withdrawalId: withdrawal._id,
        amount,
        fee,
        netAmount,
        status: 'pending',
        requestDate: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la demande de retrait:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la demande de retrait'
    });
  }
};

// Récupérer l'historique des retraits
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    // Récupérer les transactions de retrait
    const withdrawals = await Payment.find({
      associateId,
      type: 'withdrawal'
    })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(parseInt(limit));

    // Compter le nombre total de retraits
    const total = await Payment.countDocuments({
      associateId,
      type: 'withdrawal'
    });

    return res.status(200).json({
      success: true,
      data: {
        withdrawals: withdrawals.map(w => ({
          id: w._id,
          amount: w.amount,
          fee: w.fee,
          netAmount: w.amount - w.fee,
          status: w.status,
          paymentMethod: w.paymentMethod,
          requestDate: w.createdAt,
          processedDate: w.processedAt
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des retraits:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération de l\'historique'
    });
  }
};

// Récupérer le profil de l'associé
exports.getProfile = async (req, res) => {
  try {
    const associateId = req.associate._id;

    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: associate._id,
        email: associate.email,
        firstName: associate.firstName,
        lastName: associate.lastName,
        phone: associate.phone,
        country: associate.country,
        city: associate.city,
        referralCode: associate.referralCode,
        referralLink: associate.referralLink,
        status: associate.status,
        createdAt: associate.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération du profil'
    });
  }
};

// Mettre à jour le profil de l'associé
exports.updateProfile = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const { firstName, lastName, phone, country, city } = req.body;

    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Mettre à jour les informations
    if (firstName) associate.firstName = firstName;
    if (lastName) associate.lastName = lastName;
    if (phone) associate.phone = phone;
    if (country) associate.country = country;
    if (city) associate.city = city;

    await associate.save();

    return res.status(200).json({
      success: true,
      data: {
        id: associate._id,
        email: associate.email,
        firstName: associate.firstName,
        lastName: associate.lastName,
        phone: associate.phone,
        country: associate.country,
        city: associate.city
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour du profil'
    });
  }
};

// Changer le mot de passe de l'associé
exports.changePassword = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const { currentPassword, newPassword } = req.body;

    const associate = req.associate;
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await associate.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    associate.passwordHash = newPassword;
    await associate.save();

    return res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du changement de mot de passe'
    });
  }
};
