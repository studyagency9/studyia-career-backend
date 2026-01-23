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

// Génération d'un lien de parrainage à partir d'un code
const generateReferralLink = (referralCode) => {
  return `${process.env.FRONTEND_URL}/?ref=${referralCode}`;
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

    // Créer le lien de parrainage (pointe vers la page principale)
    const referralLink = generateReferralLink(referralCode);

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
    
    // Mettre à jour le format du lien de parrainage si nécessaire
    if (associate.referralLink && associate.referralLink.includes('/signup?ref=')) {
      associate.referralLink = generateReferralLink(associate.referralCode);
      console.log(`Lien de parrainage mis à jour pour l'associé ${associateId}: ${associate.referralLink}`);
    }

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

// Récupérer les statistiques quotidiennes
exports.getDailyStats = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const associate = req.associate;

    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];

    // Récupérer les ventes du jour
    const todaySales = associate.referralStats.salesByDay.get(todayKey) || 0;
    
    // Calculer les commissions du jour (en se basant sur les ventes enregistrées aujourd'hui)
    const todayCommissions = associate.salesHistory
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.toISOString().split('T')[0] === todayKey;
      })
      .reduce((total, sale) => total + sale.commission, 0);

    return res.status(200).json({
      success: true,
      data: {
        date: todayKey,
        sales: todaySales,
        commissions: todayCommissions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques quotidiennes:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques quotidiennes'
    });
  }
};

// Récupérer les statistiques hebdomadaires
exports.getWeeklyStats = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const associate = req.associate;

    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Obtenir la semaine actuelle (année + numéro de semaine)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Dimanche de la semaine actuelle
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Samedi de la semaine actuelle
    endOfWeek.setHours(23, 59, 59, 999);

    const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate() + now.getDay()) / 7)}`;

    // Récupérer les ventes de la semaine
    const weeklySales = associate.referralStats.salesByWeek.get(weekKey) || 0;
    
    // Calculer les commissions de la semaine
    const weeklyCommissions = associate.salesHistory
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfWeek && saleDate <= endOfWeek;
      })
      .reduce((total, sale) => total + sale.commission, 0);

    return res.status(200).json({
      success: true,
      data: {
        week: weekKey,
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        sales: weeklySales,
        commissions: weeklyCommissions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques hebdomadaires:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques hebdomadaires'
    });
  }
};

// Récupérer les statistiques mensuelles
exports.getMonthlyStats = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const associate = req.associate;

    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Obtenir le mois actuel au format YYYY-MM
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Récupérer les ventes du mois
    const monthlySales = associate.referralStats.salesByMonth.get(monthKey) || 0;
    const monthlyCVs = associate.referralStats.cvsByMonth.get(monthKey) || 0;
    
    // Calculer les commissions du mois
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyCommissions = associate.salesHistory
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfMonth && saleDate <= endOfMonth;
      })
      .reduce((total, sale) => total + sale.commission, 0);

    return res.status(200).json({
      success: true,
      data: {
        month: monthKey,
        sales: monthlySales,
        cvs: monthlyCVs,
        commissions: monthlyCommissions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques mensuelles:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des statistiques mensuelles'
    });
  }
};

// Récupérer l'historique des ventes avec filtrage
exports.getSalesHistory = async (req, res) => {
  try {
    console.log('Début de getSalesHistory');
    console.log('req.associate:', req.associate ? 'Existe' : 'N\'existe pas');
    
    // Vérifier si req.associate existe et a les propriétés attendues
    if (!req.associate) {
      return res.status(400).json({
        success: false,
        error: 'Associé non trouvé dans la requête'
      });
    }
    
    const associateId = req.associate._id;
    const associate = req.associate;
    console.log('associateId:', associateId);
    console.log('associate.salesHistory existe:', associate.salesHistory ? 'Oui' : 'Non');
    
    const { status, search, page = 1, limit = 10 } = req.query;

    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Filtrer les ventes selon les paramètres
    let filteredSales = [];
    
    // Vérifier si salesHistory existe et est un tableau
    if (associate.salesHistory && Array.isArray(associate.salesHistory)) {
      filteredSales = [...associate.salesHistory];
    } else {
      console.log('salesHistory n\'est pas un tableau ou n\'existe pas');
      // Retourner un tableau vide si salesHistory n'existe pas
      return res.status(200).json({
        success: true,
        data: {
          sales: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        }
      });
    }
    
    // Filtrer par statut si spécifié
    if (status && ['pending', 'validated', 'rejected'].includes(status)) {
      filteredSales = filteredSales.filter(sale => sale.status === status);
    }
    
    // Filtrer par recherche si spécifiée (nom ou email du client)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSales = filteredSales.filter(sale => 
        (sale.clientName && sale.clientName.toLowerCase().includes(searchLower)) ||
        (sale.clientEmail && sale.clientEmail.toLowerCase().includes(searchLower))
      );
    }
    
    // Trier par date (plus récent d'abord)
    filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const offset = (page - 1) * limit;
    const paginatedSales = filteredSales.slice(offset, offset + parseInt(limit));
    const total = filteredSales.length;
    
    return res.status(200).json({
      success: true,
      data: {
        sales: paginatedSales.map((sale, index) => ({
          id: sale._id || `temp-${index}`,
          cvId: sale.cvId,
          clientName: sale.clientName,
          clientEmail: sale.clientEmail,
          amount: sale.amount,
          commission: sale.commission,
          date: sale.date,
          status: sale.status
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
    console.error('Erreur lors de la récupération de l\'historique des ventes:', error);
    console.error('Détails de l\'erreur:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération de l\'historique des ventes',
      message: error.message || 'Erreur inconnue'
    });
  }
};

// Récupérer les ventes récentes (les 5 dernières)
exports.getRecentSales = async (req, res) => {
  try {
    const associateId = req.associate._id;
    const associate = req.associate;
    const { limit = 5 } = req.query;

    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associé non trouvé'
      });
    }

    // Récupérer les ventes et les trier par date (plus récent d'abord)
    const recentSales = [...associate.salesHistory]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));
    
    // Vérifier s'il y a des ventes
    if (recentSales.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          sales: [],
          message: 'Aucune vente récente'
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        sales: recentSales.map((sale, index) => ({
          id: sale._id || `temp-${index}`,
          cvId: sale.cvId,
          clientName: sale.clientName,
          clientEmail: sale.clientEmail,
          amount: sale.amount,
          commission: sale.commission,
          date: sale.date,
          status: sale.status
        }))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes récentes:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des ventes récentes'
    });
  }
};
