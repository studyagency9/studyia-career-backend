const Notification = require('../models/notification.model');

// Récupérer toutes les notifications du partenaire
exports.getNotifications = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { 
      read, 
      page = 1, 
      limit = 20,
      type
    } = req.query;
    
    // Construire le filtre
    const filter = { partnerId };
    
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    
    if (type) {
      filter.type = type;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Requête
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('data.jobPostId', 'title')
        .populate('data.candidateId', 'cvData.personalInfo.firstName cvData.personalInfo.lastName'),
      
      Notification.countDocuments(filter),
      
      Notification.countUnread(partnerId)
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching notifications',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const notification = await Notification.findOne({ _id: id, partnerId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    await notification.markAsRead();
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Error marking notification as read',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Marquer toutes les notifications comme lues
exports.markAllAsRead = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    
    const result = await Notification.markAllAsRead(partnerId);
    
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Error marking all notifications as read',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const notification = await Notification.findOneAndDelete({ _id: id, partnerId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting notification',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer les préférences de notification
exports.getNotificationSettings = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const Partner = require('../models/partner.model');
    
    const partner = await Partner.findById(partnerId).select('notificationSettings');
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    // Valeurs par défaut si non définies
    const settings = partner.notificationSettings || {
      emailNotifications: true,
      newApplications: true,
      highScoreCandidates: true,
      deadlineReminders: true
    };
    
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching notification settings',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Mettre à jour les préférences de notification
exports.updateNotificationSettings = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const Partner = require('../models/partner.model');
    
    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      { $set: { notificationSettings: req.body } },
      { new: true, runValidators: true }
    ).select('notificationSettings');
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: partner.notificationSettings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating notification settings',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

module.exports = exports;
