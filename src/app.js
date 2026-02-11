const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/error');
const { apiLimiter, associateLimiter, associateAuthLimiter } = require('./middleware/rateLimiter');
const { initDefaultPlans } = require('./controllers/plan.controller');
const cvController = require('./controllers/cv.controller');

// Import routes
const authRoutes = require('./routes/auth.routes');
const cvRoutes = require('./routes/cv.routes');
const profileRoutes = require('./routes/profile.routes');
const planRoutes = require('./routes/plan.routes');
const aiRoutes = require('./routes/ai.routes');
const adminRoutes = require('./routes/admin.routes');
const personnelRoutes = require('./routes/personnel.routes');
const adminManagementRoutes = require('./routes/admin-management.routes');
const associateRoutes = require('./routes/associate.routes');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: '*', // Accepter les requêtes de toutes les sources
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: '*', // Autoriser tous les en-têtes personnalisés
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply rate limiting to specific routes
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/cvs', apiLimiter, cvRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/api/plans', apiLimiter, planRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/personnel', apiLimiter, personnelRoutes);
app.use('/api/admin/users', apiLimiter, adminManagementRoutes);

// Route spécifique pour la compatibilité avec le frontend (sans 's' à cv)
app.post('/api/cv/purchase', (req, res) => {
  // Rediriger la requête vers le contrôleur approprié
  cvController.purchaseCV(req, res);
});

// Routes des associés sans limitation
app.use('/api/associates', associateRoutes);

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.head('/health', (req, res) => {
  res.status(200).end();
});

// Route spécifique pour UpTimeRobot
app.all('/uptimerobot', (req, res) => {
  res.status(200).end();
});

// Swagger documentation
let swaggerDocument;
try {
  swaggerDocument = require('../swagger-combined.json');
} catch (err) {
  // Si le fichier combiné n'existe pas, utiliser le fichier de base
  try {
    swaggerDocument = require('../swagger.json');
  } catch (err) {
    console.warn('Swagger documentation not available');
    swaggerDocument = { info: { title: 'API Documentation', version: '1.0.0' } };
  }
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Studyia Career API Documentation'
}));

// Error handling middleware
app.use(errorHandler);

// Database initialization and server startup
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connecter à MongoDB
    await connectDB();
    console.log('MongoDB connecté avec succès');
    
    // Initialiser les plans par défaut
    if (process.env.NODE_ENV === 'development') {
      await initDefaultPlans();
    }
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Impossible de se connecter à la base de données ou de démarrer le serveur:', error);
    process.exit(1);
  }
};

// Export for testing
module.exports = { app, startServer };
