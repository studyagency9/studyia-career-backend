# Studyia Career Backend

API Backend pour la plateforme Studyia Career CV Builder, développée avec Node.js et MongoDB.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Endpoints API](#endpoints-api)
- [Démarrage](#démarrage)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement sur Render](#déploiement-sur-render)
- [Modèles de données](#modèles-de-données)
- [Authentification](#authentification)
- [Gestion des CV](#gestion-des-cv)
- [Gestion des profils](#gestion-des-profils)
- [Gestion des forfaits](#gestion-des-forfaits)
- [Analyse IA](#analyse-ia)
- [Administration](#administration)
- [Sécurité](#sécurité)

## ✨ Fonctionnalités

- **Système d'authentification**: Authentification basée sur JWT avec refresh tokens
- **Gestion des CV**: Création, lecture, mise à jour et suppression des CV
- **Gestion des profils**: Gestion des profils utilisateurs pour les partenaires
- **Gestion des forfaits**: Plans d'abonnement avec quotas mensuels
- **Intégration IA**: Analyse et optimisation des CV avec l'API OpenRouter (LLaMA 3.3 70B)
- **Sécurité**: Rate limiting, CORS, protection Helmet
- **Administration**: Tableau de bord administrateur avec statistiques et gestion des utilisateurs
- **Programme d'affiliation**: Gestion des associés et des commissions

## 🛠️ Stack technique

- **Runtime**: Node.js
- **Framework**: Express.js
- **Base de données**: MongoDB
- **ODM**: Mongoose
- **Authentification**: JWT + bcrypt
- **Sécurité**: Helmet, CORS, Rate Limiting
- **Upload de fichiers**: Multer
- **Traitement PDF**: pdf-parse
- **Intégration IA**: OpenRouter API (LLaMA 3.3 70B)
- **Emails**: Nodemailer

## 📁 Structure du projet

```
src/
├── config/          # Fichiers de configuration
├── controllers/     # Gestionnaires de requêtes
├── middleware/      # Middleware Express
├── models/          # Modèles de données
├── routes/          # Routes API
├── services/        # Logique métier
├── utils/           # Fonctions utilitaires
├── uploads/         # Uploads temporaires (gitignored)
├── app.js           # Configuration Express
└── server.js        # Point d'entrée
```

## 🌐 Endpoints API

### Authentification

- `POST /api/auth/signup` - Inscription d'un nouveau partenaire
- `POST /api/auth/login` - Connexion d'un partenaire
- `POST /api/auth/refresh` - Rafraîchissement du token d'accès
- `POST /api/auth/logout` - Déconnexion (nécessite authentification)

### Gestion des CV

- `GET /api/cvs` - Récupérer tous les CV (nécessite authentification)
- `GET /api/cvs/:id` - Récupérer un CV spécifique (nécessite authentification)
- `POST /api/cvs` - Créer un nouveau CV (nécessite authentification)
- `PUT /api/cvs/:id` - Mettre à jour un CV (nécessite authentification)
- `DELETE /api/cvs/:id` - Supprimer un CV (nécessite authentification)
- `POST /api/cv/purchase` - Acheter un CV (public)

### Gestion des profils

- `GET /api/profile` - Récupérer le profil du partenaire (nécessite authentification)
- `PUT /api/profile` - Mettre à jour le profil (nécessite authentification)
- `PUT /api/profile/password` - Changer le mot de passe (nécessite authentification)

### Gestion des forfaits

- `GET /api/plans` - Récupérer tous les forfaits disponibles
- `POST /api/plans/change` - Demander un changement de forfait (nécessite authentification)

### Analyse IA

- `POST /api/ai/analyze-cv` - Analyser un CV uploadé (nécessite authentification)
- `POST /api/ai/optimize-cv` - Optimiser un CV existant (nécessite authentification)

### Administration

- `POST /api/admin/login` - Connexion administrateur
- `GET /api/admin/stats/dashboard` - Statistiques du tableau de bord (nécessite authentification admin)
- `GET /api/admin/cvs` - Liste de tous les CV (nécessite authentification admin)
- `GET /api/admin/partners` - Liste de tous les partenaires (nécessite authentification admin)
- `PUT /api/admin/partners/:id/status` - Modifier le statut d'un partenaire (nécessite authentification admin)
- `GET /api/admin/associates` - Liste de tous les associés (nécessite authentification admin)
- `PUT /api/admin/associates/:id/status` - Modifier le statut d'un associé (nécessite authentification admin)
- `GET /api/admin/finance/stats` - Statistiques financières (nécessite authentification admin)

### Gestion des Administrateurs

- `GET /api/admin/users` - Liste de tous les administrateurs (nécessite authentification admin)
- `GET /api/admin/users/:id` - Détails d'un administrateur (nécessite authentification admin)
- `POST /api/admin/users` - Créer un nouvel administrateur (nécessite authentification admin)
- `PUT /api/admin/users/:id` - Mettre à jour un administrateur (nécessite authentification admin)
- `PUT /api/admin/users/:id/reset-password` - Réinitialiser le mot de passe d'un administrateur (nécessite authentification admin)
- `DELETE /api/admin/users/:id` - Supprimer un administrateur (nécessite authentification superadmin)

### Gestion des Associés et Parrainages

- `POST /api/associates/signup` - Inscription d'un nouvel associé
- `POST /api/associates/login` - Connexion d'un associé
- `GET /api/associates/dashboard` - Tableau de bord de l'associé (nécessite authentification)
- `GET /api/associates/referrals` - Statistiques de parrainage (nécessite authentification)
- `POST /api/associates/withdrawal` - Demande de retrait de fonds (nécessite authentification)
- `GET /api/associates/withdrawals` - Historique des retraits (nécessite authentification)

### Gestion des Paiements (Admin)

- `GET /api/admin/payments` - Liste de tous les paiements (nécessite authentification admin)
- `GET /api/admin/withdrawals` - Liste des demandes de retrait (nécessite authentification admin)
- `PUT /api/admin/withdrawals/:id/status` - Mettre à jour le statut d'une demande de retrait (nécessite authentification admin)

### Gestion du Personnel

- `GET /api/personnel` - Liste de tout le personnel (nécessite authentification admin)
- `GET /api/personnel/:id` - Détails d'une personne (nécessite authentification admin)
- `POST /api/personnel` - Ajouter une personne (nécessite authentification secrétaire)
- `PUT /api/personnel/:id` - Mettre à jour une personne (nécessite authentification secrétaire)
- `DELETE /api/personnel/:id` - Supprimer une personne (nécessite authentification secrétaire)

## 🚀 Démarrage

### Prérequis

- Node.js (v14 ou supérieur)
- MongoDB (Atlas ou local)

### Installation

1. Cloner le dépôt:
   ```bash
   git clone https://github.com/studyia/studyia-career-backend.git
   cd studyia-career-backend
   ```

2. Installer les dépendances:
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement (voir [Variables d'environnement](#variables-denvironnement))

4. Démarrer le serveur de développement:
   ```bash
   npm run dev
   ```

## 🔐 Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes:

```env
NODE_ENV=development
PORT=3000

# Base de données
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studyia_career

# JWT
JWT_SECRET=votre_clé_secrète_ici
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# OpenRouter API
OPENROUTER_API_KEY=votre_clé_api_ici

# URL Frontend
FRONTEND_URL=http://localhost:5173
```

## 🚀 Déploiement sur Render

Ce projet est configuré pour être facilement déployé sur Render.

### Méthode 1: Déploiement manuel

1. Créez un compte sur [Render](https://render.com) si vous n'en avez pas déjà un
2. Depuis le tableau de bord, cliquez sur "New" puis "Web Service"
3. Connectez votre dépôt GitHub ou utilisez l'URL: `https://github.com/studyagency9/studyia-career-backend.git`
4. Configurez le service avec les paramètres suivants:
   - **Name**: studyia-career-backend (ou le nom de votre choix)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`

5. Dans la section "Environment Variables", ajoutez toutes les variables d'environnement nécessaires:
   - `NODE_ENV`: production
   - `PORT`: 10000 (Render utilise cette valeur en interne)
   - `MONGODB_URI`: votre URI MongoDB
   - `JWT_SECRET`: votre clé secrète JWT
   - `JWT_EXPIRES_IN`: 1h
   - `REFRESH_TOKEN_EXPIRES_IN`: 7d
   - `OPENROUTER_API_KEY`: votre clé API OpenRouter
   - `FRONTEND_URL`: URL de votre frontend déployé

6. Cliquez sur "Create Web Service" pour lancer le déploiement

### Méthode 2: Déploiement avec Blueprint

Ce projet inclut un fichier `render.yaml` qui permet un déploiement automatisé:

1. Accédez à https://dashboard.render.com/blueprints
2. Cliquez sur "New Blueprint Instance"
3. Connectez votre dépôt GitHub
4. Render détectera automatiquement le fichier `render.yaml` et configurera le service
5. Vous devrez ajouter manuellement les variables d'environnement sensibles (MONGODB_URI, JWT_SECRET, etc.)

### Post-déploiement

Un script post-déploiement est configuré pour exécuter automatiquement:
- La création des administrateurs par défaut
- La génération de la documentation Swagger

Vous pouvez également exécuter manuellement ces tâches après le déploiement:

```bash
npm run post-deploy
```

### Accès à l'API déployée

Une fois le déploiement terminé, votre API sera accessible à l'URL fournie par Render:
- Documentation Swagger: `https://votre-url.onrender.com/api-docs`
- Vérification de santé: `https://votre-url.onrender.com/health`

## 📊 Modèles de données

### Personnel

```javascript
{
  id: String, // UUID
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  gender: String, // 'M', 'F'
  phoneNumber: String,
  position: String,
  cvId: String, // Référence au CV
  cvPdfUrl: String, // URL du fichier PDF du CV
  additionalInfo: {
    email: String,
    address: String,
    education: Array,
    experience: Array
  },
  createdAt: Date,
  updatedAt: Date
}
```


### Partner (Partenaire)

```javascript
{
  id: String, // UUID
  email: String,
  passwordHash: String,
  firstName: String,
  lastName: String,
  company: String,
  plan: String, // 'starter', 'pro', 'business'
  cvUsedThisMonth: Number,
  planRenewalDate: Date,
  status: String, // 'active', 'suspended'
  cvHistory: [{ // Historique des CV créés
    cvId: String, // Référence au CV
    name: String, // Nom donné au CV
    pdfUrl: String, // URL du fichier PDF généré
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### CV

```javascript
{
  id: String, // UUID
  partnerId: String, // Référence à Partner
  name: String,
  language: String, // 'fr', 'en'
  data: Object, // Données complètes du CV
  pdfUrl: String, // URL du fichier PDF généré
  referralCode: String, // Code de parrainage utilisé (si applicable)
  createdAt: Date,
  updatedAt: Date
}
```

### Plan (Forfait)

```javascript
{
  type: String, // 'starter', 'pro', 'business'
  name: String,
  monthlyQuota: Number,
  price: Number,
  pricePerDay: Number,
  features: [String],
  badge: String,
  recommended: Boolean
}
```

### Session

```javascript
{
  id: String, // UUID
  partnerId: String, // Référence à Partner
  refreshToken: String,
  expiresAt: Date,
  createdAt: Date
}
```

### Admin

```javascript
{
  id: String, // UUID
  email: String,
  passwordHash: String,
  firstName: String,
  lastName: String,
  role: String, // 'admin', 'superadmin', 'comptable', 'secretaire'
  lastLogin: Date,
  createdAt: Date
}
```

### Associate (Associé)

```javascript
{
  id: String, // UUID
  email: String,
  passwordHash: String,
  firstName: String,
  lastName: String,
  phone: String,
  country: String,
  city: String,
  referralCode: String,
  referralLink: String,
  referralStats: {
    totalCVs: Number, // Nombre total de CV créés via le code de parrainage
    cvsByMonth: Object // Détail par mois {"2026-01": 5, "2026-02": 8, ...}
  },
  totalSales: Number,
  totalCommission: Number,
  availableBalance: Number,
  withdrawnAmount: Number,
  withdrawalHistory: [{ // Historique des demandes de retrait
    amount: Number,
    fee: Number, // Frais de retrait (2%)
    status: String, // 'pending', 'completed', 'rejected'
    requestDate: Date,
    completionDate: Date,
    paymentMethod: String,
    transactionId: String
  }],
  status: String, // 'active', 'suspended', 'banned'
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Payment (Paiement)

```javascript
{
  id: String, // UUID
  userId: String,
  partnerId: String, // Référence à Partner
  associateId: String, // Référence à Associate
  amount: Number,
  fee: Number, // Frais (2% pour les retraits)
  currency: String,
  type: String, // 'cv_purchase', 'partner_subscription', 'associate_commission', 'withdrawal'
  status: String, // 'pending', 'completed', 'failed', 'refunded'
  paymentMethod: String, // 'card', 'mobile_money', 'bank_transfer'
  transactionId: String,
  notes: String, // Notes administratives
  processedBy: String, // ID de l'administrateur qui a traité la transaction
  processedAt: Date, // Date de traitement
  createdAt: Date
}
```

## 🔒 Authentification

Le système d'authentification utilise JWT (JSON Web Tokens) avec refresh tokens:

- **Access Token**: Durée de vie courte (1 heure par défaut)
- **Refresh Token**: Durée de vie longue (7 jours par défaut)

Le refresh token est stocké dans la base de données et peut être révoqué à tout moment.

## 📄 Gestion des CV

Le système permet la gestion complète des CV:

- Création de nouveaux CV avec vérification du quota
- Récupération de tous les CV d'un partenaire avec pagination et recherche
- Mise à jour des CV existants
- Suppression des CV
- Achat de CV pour les utilisateurs publics
- Historique complet des CV créés par le partenaire
- Téléchargement des fichiers PDF des CV générés
- Suivi du quota utilisé par rapport au plan d'abonnement

## 👤 Gestion des profils

Les partenaires peuvent gérer leur profil:

- Récupération des informations du profil avec détails du forfait et quota restant
- Mise à jour des informations personnelles
- Changement de mot de passe sécurisé

## 💰 Gestion des forfaits

Trois forfaits sont disponibles:

- **Starter**: 30 CV par mois, 15 000 FCFA
- **Pro**: 100 CV par mois, 30 000 FCFA
- **Business**: 300 CV par mois, 60 000 FCFA

Les partenaires peuvent demander un changement de forfait.

## 👥 Programme d'affiliation

Le système inclut un programme d'affiliation complet:

- Chaque associé reçoit un code de parrainage unique
- Les CV créés via un code de parrainage sont comptabilisés
- Les associés reçoivent des commissions sur les ventes générées
- Tableau de bord détaillé des statistiques de parrainage
- Système de retrait de fonds:
  - Montant minimum: 5 000 FCFA
  - Frais de retrait: 2% du montant
  - Processus de validation par l'administrateur
  - Historique complet des transactions

## 🤖 Analyse IA

L'intégration avec l'API OpenRouter (LLaMA 3.3 70B) permet:

- L'analyse de CV uploadés en PDF
- L'extraction des informations structurées
- L'optimisation des CV existants

## 👑 Administration

Le tableau de bord administrateur offre:

- Des statistiques en temps réel (CV créés, revenus, nouveaux partenaires)
- La gestion des partenaires et des associés
- Des statistiques financières détaillées
- La gestion des paiements et des retraits
- Validation des demandes de retrait des associés
- Changement de statut des transactions (pending → completed)
- Suivi des commissions générées par les associés
- Gestion du personnel avec extraction automatique des CV
- Gestion des administrateurs avec différents rôles (superadmin, admin, comptable, secrétaire)

### Rôles administratifs

- **Superadmin**: Accès complet à toutes les fonctionnalités, peut créer et supprimer d'autres administrateurs
- **Admin**: Accès à la plupart des fonctionnalités, peut créer des comptables et secrétaires
- **Comptable**: Accès aux fonctionnalités financières et validation des paiements
- **Secrétaire**: Accès à la gestion du personnel et des CV

## 🔐 Sécurité

Le backend implémente plusieurs mesures de sécurité:

- Protection contre les attaques CSRF et XSS avec Helmet
- Rate limiting pour prévenir les attaques par force brute
- Hachage sécurisé des mots de passe avec bcrypt
- Validation des entrées utilisateur
- CORS configuré pour limiter les origines autorisées

## 📝 Licence

ISC
