const { Partner, Session } = require('../models/mongodb');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const mongoose = require('mongoose');

// Register a new partner
exports.signup = async (req, res) => {
  const { email, password, firstName, lastName, company, referralCode } = req.body;

  try {
    // Check if partner with email already exists
    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use'
      });
    }

    // Set plan renewal date to 30 days from now
    const planRenewalDate = new Date();
    planRenewalDate.setDate(planRenewalDate.getDate() + 30);

    // Create new partner
    const partner = await Partner.create({
      email,
      passwordHash: password, // Will be hashed by the model hook
      firstName,
      lastName,
      company,
      plan: 'pro', // Default plan
      planRenewalDate
    });

    // Generate tokens
    const accessToken = generateAccessToken(partner, 'partner');
    const refreshToken = generateRefreshToken(partner.id);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await Session.create({
      partnerId: partner.id,
      refreshToken,
      expiresAt
    });

    // Return success response with partner data and tokens
    // Calculer les stats CV manuellement pour l'instant
    const quotas = { starter: 10, pro: 50, business: 200 };
    const cvQuota = quotas[partner.plan] || 50;
    const cvUsed = partner.cvUsedThisMonth || 0;
    const cvStats = {
      quota: cvQuota,
      used: cvUsed,
      remaining: Math.max(0, cvQuota - cvUsed),
      percentageUsed: Math.round((cvUsed / cvQuota) * 100),
      isLimitReached: cvUsed >= cvQuota,
      plan: partner.plan
    };
    
    return res.status(201).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          email: partner.email,
          firstName: partner.firstName,
          lastName: partner.lastName,
          company: partner.company,
          plan: partner.plan,
          planPrice: partner.planPrice || 0, // ✅ Ajout du prix
          cvQuota: cvQuota,
          cvUsedThisMonth: cvUsed,
          cvStats: cvStats,
          planRenewalDate: partner.planRenewalDate,
          status: partner.status
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during signup'
    });
  }
};

// Login a partner
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find partner by email
    const partner = await Partner.findOne({ email });
    if (!partner) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await partner.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(partner, 'partner');
    const refreshToken = generateRefreshToken(partner.id);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await Session.create({
      partnerId: partner.id,
      refreshToken,
      expiresAt
    });

    // Return success response with partner data and tokens
    // Calculer les stats CV manuellement pour l'instant
    const quotas = { starter: 10, pro: 50, business: 200 };
    const cvQuota = quotas[partner.plan] || 50;
    const cvUsed = partner.cvUsedThisMonth || 0;
    const cvStats = {
      quota: cvQuota,
      used: cvUsed,
      remaining: Math.max(0, cvQuota - cvUsed),
      percentageUsed: Math.round((cvUsed / cvQuota) * 100),
      isLimitReached: cvUsed >= cvQuota,
      plan: partner.plan
    };
    
    return res.status(200).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          email: partner.email,
          firstName: partner.firstName,
          lastName: partner.lastName,
          company: partner.company,
          plan: partner.plan,
          planPrice: partner.planPrice || 0, // ✅ Ajout du prix
          cvQuota: cvQuota,
          cvUsedThisMonth: cvUsed,
          cvStats: cvStats,
          planRenewalDate: partner.planRenewalDate,
          status: partner.status
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};

// Refresh access token
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }

  try {
    // Find session with this refresh token
    const session = await Session.findOne({
      refreshToken,
      expiresAt: { $gt: new Date() } // Not expired
    }).populate('partnerId');
    
    const partner = session ? await Partner.findById(session.partnerId) : null;

    if (!session || !partner) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(partner, 'partner');

    return res.status(200).json({
      success: true,
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during token refresh'
    });
  }
};

// Logout a partner
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  const partnerId = req.partner.id;

  try {
    // Delete the session with this refresh token
    await Session.deleteOne({
      partnerId,
      refreshToken
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during logout'
    });
  }
};

// Get partner profile
exports.getProfile = async (req, res) => {
  try {
    const partner = req.partner;
    const cvStats = partner.getCVStats();

    return res.status(200).json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          email: partner.email,
          firstName: partner.firstName,
          lastName: partner.lastName,
          company: partner.company,
          plan: partner.plan,
          cvQuota: partner.cvQuota,
          cvUsedThisMonth: partner.cvUsedThisMonth,
          cvStats: cvStats,
          planRenewalDate: partner.planRenewalDate,
          status: partner.status,
          createdAt: partner.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching profile'
    });
  }
};

// Get CV statistics
exports.getCVStats = async (req, res) => {
  try {
    const partner = req.partner;
    const cvStats = partner.getCVStats();

    return res.status(200).json({
      success: true,
      data: cvStats
    });
  } catch (error) {
    console.error('Get CV stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching CV stats'
    });
  }
};
