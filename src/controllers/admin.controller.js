const { Admin, Partner, CV, Associate, Payment, Plan } = require('../models');
const { generateAccessToken } = require('../utils/jwt');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Statistiques financières simples
exports.getFinancialStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $match: { 
          type: 'cv_purchase', 
          status: 'completed' 
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          directRevenue: {
            $sum: {
              $cond: [{ $eq: ['$isDirectPurchase', true] }, '$amount', 0]
            }
          },
          referralRevenue: {
            $sum: {
              $cond: [{ $eq: ['$isDirectPurchase', false] }, '$amount', 0]
            }
          },
          totalPurchases: { $sum: 1 },
          directPurchases: {
            $sum: { $cond: [{ $eq: ['$isDirectPurchase', true] }, 1, 0] }
          },
          referralPurchases: {
            $sum: { $cond: [{ $eq: ['$isDirectPurchase', false] }, 1, 0] }
          }
        }
      }
    ]);

    const data = stats[0] || {
      totalRevenue: 0,
      directRevenue: 0,
      referralRevenue: 0,
      totalPurchases: 0,
      directPurchases: 0,
      referralPurchases: 0
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get financial stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching financial stats'
    });
  }
};

// Admin login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generate token
    const accessToken = generateAccessToken(admin, admin.role);
    
    return res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        },
        accessToken
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get CV statistics
    const cvCreatedToday = await CV.countDocuments({
      createdAt: { $gte: startOfToday }
    });
    
    const cvCreatedThisWeek = await CV.countDocuments({
      createdAt: { $gte: startOfWeek }
    });
    
    const cvCreatedThisMonth = await CV.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Get revenue statistics
    const revenueTodayResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfToday }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const revenueToday = revenueTodayResult.length > 0 ? revenueTodayResult[0].total : 0;
    
    const revenueThisWeekResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const revenueThisWeek = revenueThisWeekResult.length > 0 ? revenueThisWeekResult[0].total : 0;
    
    const revenueThisMonthResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;
    
    // Get partner statistics
    const newPartnersToday = await Partner.countDocuments({
      createdAt: { $gte: startOfToday }
    });
    
    const newPartnersThisWeek = await Partner.countDocuments({
      createdAt: { $gte: startOfWeek }
    });
    
    const newPartnersThisMonth = await Partner.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Get associate statistics
    const newAssociatesToday = await Associate.countDocuments({
      createdAt: { $gte: startOfToday }
    });
    
    const newAssociatesThisWeek = await Associate.countDocuments({
      createdAt: { $gte: startOfWeek }
    });
    
    const newAssociatesThisMonth = await Associate.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Get pending withdrawals
    const pendingWithdrawals = await Payment.countDocuments({
      type: 'withdrawal',
      status: 'pending'
    });
    
    return res.status(200).json({
      success: true,
      data: {
        cvCreated: {
          today: cvCreatedToday,
          thisWeek: cvCreatedThisWeek,
          thisMonth: cvCreatedThisMonth
        },
        revenue: {
          today: revenueToday,
          thisWeek: revenueThisWeek,
          thisMonth: revenueThisMonth
        },
        newPartners: {
          today: newPartnersToday,
          thisWeek: newPartnersThisWeek,
          thisMonth: newPartnersThisMonth
        },
        newAssociates: {
          today: newAssociatesToday,
          thisWeek: newAssociatesThisWeek,
          thisMonth: newAssociatesThisMonth
        },
        pendingWithdrawals
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching dashboard statistics'
    });
  }
};

// Get all CVs (admin view)
exports.getAllCVs = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      source,
      isPaid,
      startDate,
      endDate
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions.name = new RegExp(search, 'i');
    }
    
    if (source === 'partner') {
      whereConditions.partnerId = { $ne: null };
    } else if (source === 'public') {
      whereConditions.partnerId = null;
    }
    
    if (startDate) {
      whereConditions.createdAt = {
        ...whereConditions.createdAt,
        $gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      whereConditions.createdAt = {
        ...whereConditions.createdAt,
        $lte: new Date(endDate)
      };
    }
    
    // Get total count for pagination
    const count = await CV.countDocuments(whereConditions);
    
    // Get CVs with pagination
    const cvs = await CV.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('partnerId', 'id email firstName lastName company');
    
    // Format CV data for response
    const formattedCVs = cvs.map(cv => ({
      id: cv._id,
      name: cv.name,
      source: cv.partnerId ? 'partner' : 'public',
      sourceId: cv.partnerId?._id,
      sourceDetails: cv.partnerId ? {
        email: cv.partnerId.email,
        name: `${cv.partnerId.firstName} ${cv.partnerId.lastName}`,
        company: cv.partnerId.company
      } : null,
      language: cv.language,
      createdAt: cv.createdAt
    }));
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        cvs: formattedCVs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching CVs for admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching CVs'
    });
  }
};

// Get all partners (admin view)
exports.getAllPartners = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      plan,
      status
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions.$or = [
        { email: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ];
    }
    
    if (plan) {
      whereConditions.plan = plan;
    }
    
    // Get total count for pagination
    const count = await Partner.countDocuments(whereConditions);
    
    // Get partners with pagination
    const partners = await Partner.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('id email firstName lastName company plan cvQuota cvUsedThisMonth planRenewalDate createdAt');
    
    // Calculer les stats pour chaque partner
    const quotas = { starter: 10, pro: 50, business: 200 };
    const partnersWithStats = partners.map(partner => {
      const partnerObj = partner.toObject();
      const cvQuota = partnerObj.cvQuota || quotas[partnerObj.plan] || 50;
      const cvUsed = partnerObj.cvUsedThisMonth || 0;
      
      partnerObj.cvStats = {
        quota: cvQuota,
        used: cvUsed,
        remaining: Math.max(0, cvQuota - cvUsed),
        percentageUsed: Math.round((cvUsed / cvQuota) * 100),
        isLimitReached: cvUsed >= cvQuota,
        plan: partnerObj.plan
      };
      
      return partnerObj;
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        partners: partnersWithStats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partners for admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching partners'
    });
  }
};

// Update partner status
exports.updatePartnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const partner = await Partner.findById(id);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    // Update partner status
    partner.status = status;
    await partner.save();
    
    return res.status(200).json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating partner status'
    });
  }
};

// Get all associates (admin view)
exports.getAllAssociates = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      status
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions.$or = [
        { email: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { referralCode: new RegExp(search, 'i') }
      ];
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    // Get total count for pagination
    const count = await Associate.countDocuments(whereConditions);
    
    // Get associates with pagination
    const associates = await Associate.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('id email firstName lastName phone country city referralCode totalSales totalCommission availableBalance status createdAt');
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        associates,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching associates for admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching associates'
    });
  }
};

// Update associate status
exports.updateAssociateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const associate = await Associate.findById(id);
    
    if (!associate) {
      return res.status(404).json({
        success: false,
        error: 'Associate not found'
      });
    }
    
    // Update associate status
    associate.status = status;
    await associate.save();
    
    return res.status(200).json({
      success: true,
      data: associate
    });
  } catch (error) {
    console.error('Error updating associate status:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating associate status'
    });
  }
};

// Get financial statistics
exports.getFinanceStats = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let startDate;
    const now = new Date();
    
    // Determine period start date
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    // Get total revenue
    const totalRevenueResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          type: { $in: ['cv_purchase', 'partner_subscription'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
    
    // Get revenue by source
    const revenueBySource = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          type: { $in: ['cv_purchase', 'partner_subscription'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Format revenue by source
    const revenueBySourceFormatted = {};
    revenueBySource.forEach(item => {
      revenueBySourceFormatted[item._id] = item.total;
    });
    
    // Get commissions paid
    const commissionsPaidResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          type: 'associate_commission',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const commissionsPaid = commissionsPaidResult.length > 0 ? commissionsPaidResult[0].total : 0;
    
    // Get pending withdrawals
    const pendingWithdrawalsResult = await Payment.aggregate([
      { 
        $match: { 
          status: 'pending',
          type: 'withdrawal'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const pendingWithdrawals = pendingWithdrawalsResult.length > 0 ? pendingWithdrawalsResult[0].total : 0;
    
    // Calculate net profit
    const netProfit = totalRevenue - commissionsPaid;
    
    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        revenueBySource: revenueBySourceFormatted,
        commissionsPaid,
        pendingWithdrawals,
        netProfit
      }
    });
  } catch (error) {
    console.error('Error fetching finance stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching financial statistics'
    });
  }
};

// Create a new partner
exports.createPartner = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      company,
      email,
      phone,
      country,
      city,
      password,
      plan = 'starter'
    } = req.body;

    console.log('🔍 DEBUG: Création partenaire - Email:', email);

    // 1. Vérifier si le partenaire existe déjà
    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return res.status(409).json({
        success: false,
        error: 'Partner with this email already exists'
      });
    }

    // 2. Vérifier si le plan existe
    const planDetails = await Plan.findOne({ type: plan });
    if (!planDetails) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan specified'
      });
    }

    // 3. Créer le partenaire
    const quotas = { starter: 10, pro: 50, business: 200 };
    const cvQuota = quotas[plan] || 50;
    
    const partner = await Partner.create({
      firstName,
      lastName,
      company,
      email,
      phone,
      country,
      city,
      passwordHash: password, // Sera hashé automatiquement par le middleware
      plan,
      cvQuota, // Ajouter le quota explicitement
      planRenewalDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Prochain mois
      cvUsedThisMonth: 0,
      status: 'active'
    });

    console.log('🔍 DEBUG: Partenaire créé avec ID:', partner._id);

    // 4. Calculer les stats CV
    const cvStats = {
      quota: cvQuota,
      used: 0,
      remaining: cvQuota,
      percentageUsed: 0,
      isLimitReached: false,
      plan: plan
    };

    // 5. Retourner le succès sans le mot de passe
    const partnerResponse = partner.toObject();
    delete partnerResponse.passwordHash;
    
    // Ajouter les stats à la réponse
    partnerResponse.cvQuota = cvQuota;
    partnerResponse.cvStats = cvStats;

    return res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partnerResponse
    });

  } catch (error) {
    console.error('❌ Erreur création partenaire:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while creating partner',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
