# Documentation API Studyia Career Backend

Cette documentation détaille toutes les API du backend Studyia Career avec des exemples précis des données attendues et retournées.

## Organisation de la documentation

La documentation est divisée en plusieurs fichiers pour une meilleure lisibilité :

1. **API_DOCUMENTATION_AUTH.md** - Authentification des partenaires
2. **API_DOCUMENTATION_CV.md** - Gestion des CV
3. **API_DOCUMENTATION_ASSOCIATE.md** - Gestion des associés et programme d'affiliation

## Comment utiliser cette documentation

Chaque endpoint est documenté avec :

- **URL** et **Méthode** HTTP
- **Authentification requise** (oui/non)
- **Données attendues** (format JSON)
- **Réponse en cas de succès** (avec code HTTP et exemple JSON)
- **Réponses d'erreur** possibles (avec codes HTTP et exemples JSON)

## Tester les API

Vous pouvez tester ces API à l'aide d'outils comme :

1. **Swagger UI** - Accessible à l'URL `/api-docs` après le démarrage du serveur
2. **Postman** - Importez la collection Swagger pour tester les endpoints
3. **curl** - Utilisez les commandes curl pour des tests en ligne de commande

## Exemple d'utilisation

### Authentification

```bash
# Connexion d'un partenaire
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "partenaire@example.com", "password": "MotDePasse123"}'
```

### Création d'un CV

```bash
# Créer un nouveau CV (nécessite un token d'authentification)
curl -X POST http://localhost:3000/api/cvs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer votre_token_ici" \
  -d '{
    "name": "CV Jean Dupont",
    "language": "fr",
    "data": {
      "personalInfo": {
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean.dupont@example.com",
        "phone": "+33612345678",
        "position": "Développeur Full Stack"
      }
    }
  }'
```

## Documentation Swagger

Une documentation interactive Swagger est également disponible. Pour y accéder :

1. Démarrez le serveur avec `npm run dev`
2. Accédez à l'URL `http://localhost:3000/api-docs` dans votre navigateur

Pour mettre à jour la documentation Swagger, exécutez :

```bash
npm run swagger
```

Cette commande combine les fichiers `swagger.json` et `swagger-paths.json` pour générer la documentation complète.

## Notes importantes

- Tous les endpoints authentifiés nécessitent un token JWT valide dans l'en-tête `Authorization: Bearer token`
- Les erreurs sont toujours retournées avec un objet JSON contenant `success: false` et un message d'erreur
- Les réponses réussies contiennent toujours `success: true` et les données demandées dans un objet `data`
