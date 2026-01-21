const jwt = require('jsonwebtoken');
const { Partner, Admin, Associate } = require('../models/mongodb');

// Middleware to verify JWT token for partners
exports.authenticatePartner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'partner') {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid token role' 
      });
    }
    
    const partner = await Partner.findById(decoded.sub);
    
    if (!partner) {
      return res.status(401).json({ 
        success: false, 
        error: 'Partner not found' 
      });
    }
    
    req.partner = partner;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// Middleware to verify JWT token for admins
exports.authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!['admin', 'superadmin', 'comptable', 'secretaire'].includes(decoded.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid token role' 
      });
    }
    
    const admin = await Admin.findById(decoded.sub);
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// Middleware to check if admin is superadmin
exports.requireSuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      error: 'Requires superadmin privileges' 
    });
  }
};

// Middleware to check if admin is comptable
exports.requireComptable = (req, res, next) => {
  if (req.admin && (req.admin.role === 'comptable' || req.admin.role === 'superadmin' || req.admin.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      error: 'Requires comptable privileges' 
    });
  }
};

// Middleware to check if admin is secretaire
exports.requireSecretaire = (req, res, next) => {
  if (req.admin && (req.admin.role === 'secretaire' || req.admin.role === 'superadmin' || req.admin.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      error: 'Requires secretaire privileges' 
    });
  }
};

// Middleware to verify JWT token for associates
exports.authenticateAssociate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'associate') {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid token role' 
      });
    }
    
    const associate = await Associate.findById(decoded.sub);
    
    if (!associate) {
      return res.status(401).json({ 
        success: false, 
        error: 'Associate not found' 
      });
    }
    
    if (associate.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is ' + (associate.status === 'suspended' ? 'suspended' : 'banned')
      });
    }
    
    req.associate = associate;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};
