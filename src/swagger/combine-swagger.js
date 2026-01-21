const fs = require('fs');
const path = require('path');

// Lire les fichiers swagger
const swaggerBase = require('../../swagger.json');
const swaggerPaths = require('../../swagger-paths.json');

// Combiner les fichiers
const combinedSwagger = {
  ...swaggerBase,
  paths: swaggerPaths.paths
};

// Écrire le fichier combiné
fs.writeFileSync(
  path.join(__dirname, '../../swagger-combined.json'),
  JSON.stringify(combinedSwagger, null, 2)
);

console.log('Fichier Swagger combiné créé avec succès!');
