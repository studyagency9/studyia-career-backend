const { Payment, Associate } = require('../models/mongodb');

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {};
    
    if (type) {
      whereConditions.type = type;
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    // Get total count for pagination
    const count = await Payment.countDocuments(whereConditions);
    
    // Get payments with pagination
    const payments = await Payment.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('partnerId', 'email firstName lastName company')
      .populate('associateId', 'email firstName lastName referralCode');
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      data: {
        payments: payments.map(p => ({
          id: p._id,
          type: p.type,
          status: p.status,
          amount: p.amount,
          fee: p.fee,
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          partner: p.partnerId ? {
            id: p.partnerId._id,
            email: p.partnerId.email,
            name: `${p.partnerId.firstName} ${p.partnerId.lastName}`,
            company: p.partnerId.company
          } : null,
          associate: p.associateId ? {
            id: p.associateId._id,
            email: p.associateId.email,
            name: `${p.associateId.firstName} ${p.associateId.lastName}`,
            referralCode: p.associateId.referralCode
          } : null,
          createdAt: p.createdAt,
          processedAt: p.processedAt
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching payments'
    });
  }
};

// Get all withdrawal requests
exports.getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = {
      type: 'withdrawal'
    };
    
    if (status) {
      whereConditions.status = status;
    }
    
    // Get total count for pagination
    const count = await Payment.countDocuments(whereConditions);
    
    // Get withdrawals with pagination
    const withdrawals = await Payment.find(whereConditions)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('associateId', 'email firstName lastName phone country city');
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
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
          associate: w.associateId ? {
            id: w.associateId._id,
            email: w.associateId.email,
            name: `${w.associateId.firstName} ${w.associateId.lastName}`,
            phone: w.associateId.phone,
            location: `${w.associateId.city}, ${w.associateId.country}`
          } : null,
          requestDate: w.createdAt,
          processedAt: w.processedAt,
          processedBy: w.processedBy,
          notes: w.notes
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching withdrawals'
    });
  }
};

// Update withdrawal status
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.id;
    
    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "completed" or "rejected"'
      });
    }
    
    // Find the withdrawal
    const withdrawal = await Payment.findOne({ _id: id, type: 'withdrawal' });
    
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending withdrawals can be updated'
      });
    }
    
    // Update the withdrawal status
    withdrawal.status = status;
    withdrawal.notes = notes || '';
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();
    
    await withdrawal.save();
    
    // If the withdrawal is rejected, refund the amount to the associate's balance
    if (status === 'rejected' && withdrawal.associateId) {
      const associate = await Associate.findById(withdrawal.associateId);
      
      if (associate) {
        // Update the associate's balance
        associate.availableBalance += withdrawal.amount;
        
        // Update the withdrawal history
        const withdrawalIndex = associate.withdrawalHistory.findIndex(
          w => w.requestDate.getTime() === withdrawal.createdAt.getTime() && w.amount === withdrawal.amount
        );
        
        if (withdrawalIndex !== -1) {
          associate.withdrawalHistory[withdrawalIndex].status = 'rejected';
        }
        
        await associate.save();
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        id: withdrawal._id,
        status: withdrawal.status,
        processedAt: withdrawal.processedAt,
        notes: withdrawal.notes
      }
    });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while updating withdrawal status'
    });
  }
};
