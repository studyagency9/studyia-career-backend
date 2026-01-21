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
          cvUsedThisMonth: partner.cvUsedThisMonth,
          planRenewalDate: partner.planRenewalDate
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
          cvUsedThisMonth: partner.cvUsedThisMonth,
          planRenewalDate: partner.planRenewalDate
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
