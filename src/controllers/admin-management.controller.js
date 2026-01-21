const { Admin } = require('../models');
const bcrypt = require('bcrypt');

// Récupérer tous les administrateurs
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('id email firstName lastName role lastLogin createdAt')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des administrateurs:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération des administrateurs'
    });
  }
};

// Récupérer un administrateur par ID
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const admin = await Admin.findById(id)
      .select('id email firstName lastName role lastLogin createdAt');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'administrateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la récupération de l\'administrateur'
    });
  }
};

// Créer un nouvel administrateur
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const creatorRole = req.admin.role;
    
    // Vérifier si l'email existe déjà
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Cet email est déjà utilisé'
      });
    }
    
    // Vérifier les permissions pour la création d'administrateurs
    // Seuls les admin et superadmin peuvent créer d'autres administrateurs
    if (creatorRole !== 'admin' && creatorRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour créer un administrateur'
      });
    }
    
    // Restrictions sur les rôles que chaque type d'administrateur peut créer
    if (creatorRole === 'admin') {
      // Un admin normal peut créer des comptables et secrétaires, mais pas d'autres admins
      if (role === 'admin' || role === 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez pas créer un administrateur avec ce rôle'
        });
      }
    }
    // Les superadmin peuvent créer tous les types d'administrateurs
    
    // Créer le nouvel administrateur
    const newAdmin = new Admin({
      email,
      passwordHash: password, // Sera haché par le middleware pre-save
      firstName,
      lastName,
      role: role || 'admin'
    });
    
    await newAdmin.save();
    
    return res.status(201).json({
      success: true,
      data: {
        id: newAdmin._id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création de l\'administrateur'
    });
  }
};

// Mettre à jour un administrateur
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role } = req.body;
    const updaterRole = req.admin.role;
    
    // Récupérer l'administrateur à mettre à jour
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé'
      });
    }
    
    // Vérifier les permissions pour la mise à jour d'administrateurs
    if (updaterRole !== 'admin' && updaterRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour mettre à jour un administrateur'
      });
    }
    
    // Restrictions sur les rôles que chaque type d'administrateur peut modifier
    if (updaterRole === 'admin') {
      // Un admin normal ne peut pas modifier un autre admin ou un superadmin
      if (admin.role === 'admin' || admin.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez pas modifier un administrateur avec ce rôle'
        });
      }
      
      // Un admin normal ne peut pas attribuer le rôle admin ou superadmin
      if (role === 'admin' || role === 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez pas attribuer ce rôle'
        });
      }
    }
    
    // Mettre à jour les informations
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (role && (updaterRole === 'superadmin' || (updaterRole === 'admin' && ['comptable', 'secretaire'].includes(role)))) {
      admin.role = role;
    }
    
    await admin.save();
    
    return res.status(200).json({
      success: true,
      data: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'administrateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour de l\'administrateur'
    });
  }
};

// Réinitialiser le mot de passe d'un administrateur
exports.resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const resetterRole = req.admin.role;
    
    // Récupérer l'administrateur
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé'
      });
    }
    
    // Vérifier les permissions pour la réinitialisation de mot de passe
    if (resetterRole !== 'admin' && resetterRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'avez pas les permissions nécessaires pour réinitialiser le mot de passe'
      });
    }
    
    // Restrictions sur les rôles
    if (resetterRole === 'admin') {
      // Un admin normal ne peut pas réinitialiser le mot de passe d'un autre admin ou d'un superadmin
      if (admin.role === 'admin' || admin.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un administrateur avec ce rôle'
        });
      }
    }
    
    // Mettre à jour le mot de passe
    admin.passwordHash = newPassword;
    await admin.save();
    
    return res.status(200).json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la réinitialisation du mot de passe'
    });
  }
};

// Supprimer un administrateur
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleterRole = req.admin.role;
    
    // Récupérer l'administrateur à supprimer
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Administrateur non trouvé'
      });
    }
    
    // Vérifier les permissions pour la suppression d'administrateurs
    if (deleterRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Seul un super administrateur peut supprimer un administrateur'
      });
    }
    
    // Empêcher la suppression de son propre compte
    if (admin._id.toString() === req.admin.id) {
      return res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    await Admin.deleteOne({ _id: id });
    
    return res.status(200).json({
      success: true,
      message: 'Administrateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'administrateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression de l\'administrateur'
    });
  }
};
