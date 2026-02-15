const express = require('express');
const emailRoutes = require('./src/routes/email.routes');

const app = express();
app.use(express.json()); // Ajouter middleware JSON
app.use('/api/emails', emailRoutes);

// Lister les routes montées
console.log('Routes montées:');
if (app._router && app._router.stack) {
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`Route: ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      if (middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            console.log(`Route: ${Object.keys(handler.route.methods).join(',').toUpperCase()} /api/emails${handler.route.path}`);
          }
        });
      }
    }
  });
} else {
  console.log('Router non initialisé');
}
