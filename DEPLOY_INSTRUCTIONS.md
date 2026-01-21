# Instructions de déploiement sur Render

Ce document explique comment déployer l'API Studyia Career Backend sur Render.

## Prérequis

- Un compte Render (https://render.com)
- Accès au dépôt GitHub du projet

## Étapes de déploiement

### 1. Connexion à Render

1. Connectez-vous à votre compte Render ou créez-en un si nécessaire
2. Accédez au tableau de bord Render

### 2. Création d'un nouveau service Web

1. Cliquez sur le bouton "New +" en haut à droite
2. Sélectionnez "Web Service"
3. Connectez votre dépôt GitHub ou utilisez l'option "Public Git repository" avec l'URL : `https://github.com/studyagency9/studyia-career-backend.git`

### 3. Configuration du service

Remplissez les champs suivants :

- **Name**: studyia-career-backend (ou le nom de votre choix)
- **Region**: Choisissez la région la plus proche de vos utilisateurs
- **Branch**: master
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Configuration des variables d'environnement

Dans la section "Environment Variables", ajoutez les variables suivantes :

| Variable | Valeur |
|----------|--------|
| NODE_ENV | production |
| PORT | 10000 (Render utilise cette valeur en interne) |
| MONGODB_URI | `mongodb+srv://studyagency9_db_user:Studyagency237@studyiacareer.9deyedc.mongodb.net/?appName=StudyiaCareer&connectTimeoutMS=30000&socketTimeoutMS=30000` |
| JWT_SECRET | `studyia_career_secret_key_change_in_production` (utilisez une valeur plus sécurisée) |
| JWT_EXPIRES_IN | `1h` |
| REFRESH_TOKEN_EXPIRES_IN | `7d` |
| OPENROUTER_API_KEY | Votre clé API OpenRouter |
| FRONTEND_URL | URL de votre frontend déployé (ex: `https://studyia-career.onrender.com`) |

### 5. Options avancées (optionnel)

- **Auto-Deploy**: Activé (pour déployer automatiquement à chaque push sur la branche master)
- **Health Check Path**: `/health` (votre API dispose déjà d'un endpoint de vérification de santé)

### 6. Déploiement

1. Cliquez sur "Create Web Service"
2. Attendez que le déploiement soit terminé (cela peut prendre quelques minutes)

## Après le déploiement

Une fois le déploiement terminé, Render vous fournira une URL pour accéder à votre API (par exemple, `https://studyia-career-backend.onrender.com`).

### Vérification du déploiement

Pour vérifier que votre API fonctionne correctement, accédez à :
- `https://votre-url.onrender.com/health` - Devrait renvoyer `{"status": "ok"}`
- `https://votre-url.onrender.com/api-docs` - Pour accéder à la documentation Swagger

### Mise à jour du frontend

N'oubliez pas de mettre à jour la configuration de votre frontend pour qu'il pointe vers la nouvelle URL de votre API.

## Dépannage

Si vous rencontrez des problèmes lors du déploiement :

1. Vérifiez les logs dans l'interface Render
2. Assurez-vous que toutes les variables d'environnement sont correctement configurées
3. Vérifiez que la connexion à MongoDB fonctionne depuis Render

## Utilisation du Blueprint Render (Alternative)

Si vous préférez utiliser le fichier `render.yaml` inclus dans ce projet :

1. Accédez à https://dashboard.render.com/blueprints
2. Cliquez sur "New Blueprint Instance"
3. Connectez votre dépôt GitHub
4. Render détectera automatiquement le fichier `render.yaml` et configurera le service en conséquence
5. Vous devrez toujours ajouter manuellement les variables d'environnement sensibles (MONGODB_URI, JWT_SECRET, etc.)
