const { Partner, Plan } = require('../models');
const bcrypt = require('bcrypt');

// Get partner profile
exports.getProfile = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    
    // Get partner with plan details
    const partner = await Partner.findById(partnerId);
    
    // Get plan details
    const plan = await Plan.findOne({ type: partner.plan });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Calculate remaining quota
    const remainingQuota = plan.monthlyQuota - partner.cvUsedThisMonth;
    const quotaPercentage = Math.round((partner.cvUsedThisMonth / plan.monthlyQuota) * 100);
    
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
        currentPlan: plan,
        remainingQuota,
        quotaPercentage
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching profile'
    });
  }
};

// Update partner profile
exports.updateProfile = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { firstName, lastName, company } = req.body;
    
    // Find partner
    const partner = await Partner.findById(partnerId);
    
    // Update partner
    partner.firstName = firstName || partner.firstName;
    partner.lastName = lastName || partner.lastName;
    partner.company = company || partner.company;
    await partner.save();
    
    return res.status(200).json({
      success: true,
      data: {
        id: partner.id,
        email: partner.email,
        firstName: partner.firstName,
        lastName: partner.lastName,
        company: partner.company,
        plan: partner.plan,
        cvUsedThisMonth: partner.cvUsedThisMonth,
        planRenewalDate: partner.planRenewalDate
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating profile'
    });
  }
};

// Change partner password
exports.changePassword = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { currentPassword, newPassword } = req.body;
    
    // Find partner
    const partner = await Partner.findById(partnerId);
    
    // Check current password
    const isPasswordValid = await partner.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    partner.passwordHash = newPassword; // Will be hashed by the model hook
    await partner.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while changing password'
    });
  }
};
