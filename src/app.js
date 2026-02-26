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
const invoiceRoutes = require('./routes/invoice.routes');
const contactRoutes = require('./routes/contact.routes');
const emailRoutes = require('./routes/email.routes');
const pdfRoutes = require('./routes/pdf.routes');
const jobPostRoutes = require('./routes/jobPost.routes'); // 🆕 Gestion des offres d'emploi
const candidateRoutes = require('./routes/candidate.routes'); // 🆕 Gestion des candidatures
const analyticsRoutes = require('./routes/analytics.routes'); // 🆕 Analytics et statistiques
const notificationRoutes = require('./routes/notification.routes'); // 🆕 Notifications

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
// app.use(helmet()); // Désactivé temporairement pour éviter les blocages CORS
app.use(cors({
  origin: '*', // Accepter les requêtes de TOUTES les sources
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: '*', // Autoriser TOUS les en-têtes
  exposedHeaders: '*',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 heures de cache pour les preflight
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// 🆕 Servir les fichiers PDF statiquement
app.use('/uploads/pdfs', express.static('uploads/pdfs'));

// Middleware de logging pour toutes les requêtes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Diagnostic IP détaillé
  const clientIP = req.headers['cf-connecting-ip'] || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['true-client-ip'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress;
  
  console.log('=== DIAGNOSTIC IP ===');
  console.log('Client IP:', clientIP);
  console.log('CF-Connecting-IP:', req.headers['cf-connecting-ip']);
  console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
  console.log('True-Client-IP:', req.headers['true-client-ip']);
  console.log('CF-Ray:', req.headers['cf-ray']);
  console.log('CF-IPCountry:', req.headers['cf-ipcountry']);
  console.log('=========================');
  
  // Ajouter headers CORS manuellement pour être sûr
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  next();
});

// Apply rate limiting to specific routes (DÉSACTIVÉ pour diagnostic)
// app.use('/api/auth', apiLimiter, authRoutes);
// app.use('/api/cvs', apiLimiter, cvRoutes);
// app.use('/api/profile', apiLimiter, profileRoutes);
// app.use('/api/plans', apiLimiter, planRoutes);
// app.use('/api/ai', apiLimiter, aiRoutes);
// app.use('/api/admin', apiLimiter, adminRoutes);
// app.use('/api/personnel', apiLimiter, personnelRoutes);
// app.use('/api/admin/users', apiLimiter, adminManagementRoutes);

// Routes SANS rate limiting pour diagnostic
app.use('/api/auth', authRoutes);
app.use('/api/cvs', cvRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/admin/users', adminManagementRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api', contactRoutes); // Routes publiques de contact

// Routes emails
app.use('/api/emails', emailRoutes);
// Les routes emails sont déjà accessibles via /api/emails, pas besoin de les ajouter à /api/admin
app.use('/api/pdfs', pdfRoutes);

// 🆕 Nouvelles routes Studyia Career Pro
app.use('/api/job-posts', jobPostRoutes);
app.use('/api', candidateRoutes); // Inclut /job-posts/:jobId/upload-cvs et /candidates/:id
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Route spécifique pour la compatibilité avec le frontend (sans 's' à cv)
app.post('/api/cv/purchase', (req, res) => {
  // Rediriger la requête vers le contrôleur approprié
  cvController.purchaseCV(req, res);
});

// Routes des associés sans limitation
app.use('/api/associates', associateRoutes);

// Health check routes
app.get('/health', (req, res) => {
  console.log('Health check accessed - Method:', req.method, 'URL:', req.url);
  console.log('Headers:', req.headers);
  
  // Headers CORS explicites
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  console.log('API Health check accessed - Method:', req.method, 'URL:', req.url);
  console.log('Headers:', req.headers);
  
  // Headers CORS explicites
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.head('/health', (req, res) => {
  // Headers CORS explicites même pour HEAD
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Route spécifique pour UpTimeRobot
app.all('/uptimerobot', (req, res) => {
  // Headers CORS explicites pour toutes les méthodes
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Route de test pour diagnostic login
app.post('/api/test-login', (req, res) => {
  console.log('=== TEST LOGIN ROUTE ===');
  console.log('Body:', req.body);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Diagnostic IP détaillé
  const clientIP = req.headers['cf-connecting-ip'] || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['true-client-ip'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress;
  
  console.log('Client IP:', clientIP);
  console.log('=========================');
  
  // Réponse simple pour test
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.status(200).json({
    success: true,
    message: 'Test login route works',
    timestamp: new Date().toISOString(),
    clientIP: clientIP,
    receivedBody: req.body
  });
});

// Middleware OPTIONS global pour gérer toutes les requêtes preflight
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).end();
  } else {
    next();
  }
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
    
    // Initialiser le service email
    const { initMailService } = require('./services/mailService');
    await initMailService();
    
    // Initialiser le service IMAP
    const { initImapService } = require('./services/imapService');
    await initImapService();
    console.log('✅ Service IMAP réactivé avec succès');
    
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
