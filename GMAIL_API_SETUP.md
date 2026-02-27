# 📧 Gmail API Integration - Setup Guide

## 🎯 Vue d'ensemble

Cette intégration permet aux recruteurs de connecter leur compte Gmail et d'importer automatiquement les CV reçus par email vers leurs job posts.

---

## 🔧 Configuration Google Cloud Console

### 1. Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet "Studyia Career Pro"
3. Sélectionner le projet

### 2. Activer Gmail API

1. Menu → APIs & Services → Library
2. Rechercher "Gmail API"
3. Cliquer sur "Enable"

### 3. Créer des identifiants OAuth 2.0

1. Menu → APIs & Services → Credentials
2. Cliquer sur "Create Credentials" → "OAuth client ID"
3. Type d'application: **Web application**
4. Nom: "Studyia Career Gmail Integration"
5. Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/gmail/callback`
   - Prod: `https://votre-domaine.com/api/gmail/callback`
6. Cliquer sur "Create"
7. **Copier le Client ID et Client Secret**

### 4. Configurer l'écran de consentement OAuth

1. Menu → APIs & Services → OAuth consent screen
2. Type: **External** (ou Internal si G Suite)
3. Remplir les informations:
   - App name: "Studyia Career Pro"
   - User support email: votre email
   - Developer contact: votre email
4. Scopes: Ajouter les scopes suivants:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Test users: Ajouter vos emails de test
6. Sauvegarder

---

## 🔐 Configuration Backend

### 1. Variables d'environnement

Ajouter dans votre `.env`:

```env
# Google OAuth2 for Gmail API
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
GMAIL_ENCRYPTION_KEY=votre_cle_de_cryptage_64_caracteres_hex

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 2. Générer une clé de cryptage

Pour générer `GMAIL_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copier le résultat dans `.env`.

---

## 📋 Routes API Disponibles

### **GET /api/gmail/auth-url**
Génère l'URL OAuth2 pour connecter Gmail.

**Headers**: `Authorization: Bearer {token}`

**Réponse**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

---

### **GET /api/gmail/callback**
Callback OAuth2 après autorisation Google (géré automatiquement).

---

### **GET /api/gmail/status**
Vérifier si le Partner a connecté Gmail.

**Headers**: `Authorization: Bearer {token}`

**Réponse**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "email": "recruteur@example.com"
  }
}
```

---

### **GET /api/gmail/emails**
Lister les emails avec pièces jointes CV.

**Headers**: `Authorization: Bearer {token}`

**Query params**:
- `maxResults`: Nombre d'emails (défaut: 20)
- `query`: Requête Gmail (défaut: filtrer PDF/DOC/DOCX)
- `pageToken`: Token de pagination

**Réponse**:
```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "18d1a2b3c4d5e6f7",
        "subject": "Candidature Développeur",
        "from": "candidat@example.com",
        "date": "2026-02-27T14:30:00Z",
        "snippet": "Bonjour, veuillez trouver ci-joint mon CV...",
        "attachments": [
          {
            "filename": "CV_Jean_Dupont.pdf",
            "mimeType": "application/pdf",
            "size": 245678,
            "attachmentId": "ANGjdJ..."
          }
        ]
      }
    ],
    "nextPageToken": "NEXT_PAGE_TOKEN"
  }
}
```

---

### **GET /api/gmail/attachment/:messageId/:attachmentId**
Télécharger une pièce jointe.

**Headers**: `Authorization: Bearer {token}`

**Réponse**: Fichier binaire (PDF/DOC/DOCX)

---

### **POST /api/gmail/import-to-job**
Importer des CV depuis Gmail vers un job post.

**Headers**: `Authorization: Bearer {token}`

**Body**:
```json
{
  "jobPostId": "65abc123...",
  "attachments": [
    {
      "messageId": "18d1a2b3c4d5e6f7",
      "attachmentId": "ANGjdJ...",
      "filename": "CV_Jean_Dupont.pdf",
      "senderEmail": "candidat@example.com"
    }
  ]
}
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "imported": 3,
    "failed": 0,
    "results": [
      {
        "filename": "CV_Jean_Dupont.pdf",
        "status": "success",
        "candidateId": "65def456..."
      }
    ]
  }
}
```

---

### **DELETE /api/gmail/disconnect**
Déconnecter Gmail.

**Headers**: `Authorization: Bearer {token}`

**Réponse**:
```json
{
  "success": true,
  "message": "Gmail déconnecté"
}
```

---

## 🧪 Tests

### 1. Tester la connexion Gmail

```bash
# 1. Obtenir l'URL d'autorisation
curl -X GET http://localhost:3000/api/gmail/auth-url \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Ouvrir l'URL dans un navigateur et autoriser

# 3. Vérifier le statut
curl -X GET http://localhost:3000/api/gmail/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Tester la liste des emails

```bash
curl -X GET "http://localhost:3000/api/gmail/emails?maxResults=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Tester l'import

```bash
curl -X POST http://localhost:3000/api/gmail/import-to-job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobPostId": "65abc123...",
    "attachments": [
      {
        "messageId": "18d1a2b3c4d5e6f7",
        "attachmentId": "ANGjdJ...",
        "filename": "CV_Jean_Dupont.pdf",
        "senderEmail": "candidat@example.com"
      }
    ]
  }'
```

---

## 🔒 Sécurité

### Tokens cryptés
Les access tokens et refresh tokens sont **automatiquement cryptés** en base de données avec AES-256.

### Refresh automatique
Les tokens sont **automatiquement rafraîchis** si expiration < 5 minutes.

### Scopes limités
Seuls les scopes **lecture seule** sont demandés (pas d'envoi d'emails).

---

## 🐛 Dépannage

### Erreur "Gmail not connected"
→ Le Partner doit d'abord connecter son compte Gmail via `/api/gmail/auth-url`

### Erreur "Failed to refresh Gmail token"
→ Le refresh token est invalide ou révoqué. Redemander l'autorisation.

### Erreur 429 (Rate limit)
→ Trop de requêtes à Gmail API. Implémenter un retry avec backoff.

### Erreur "Invalid grant"
→ Le code d'autorisation a expiré. Régénérer l'URL d'autorisation.

---

## 📊 Limites Gmail API

- **Quota quotidien**: 1 milliard de requêtes/jour (largement suffisant)
- **Quota par utilisateur**: 250 requêtes/seconde
- **Taille max pièce jointe**: 35 MB

---

## 🚀 Déploiement en production

### 1. Mettre à jour les variables d'environnement

```env
GOOGLE_REDIRECT_URI=https://votre-domaine.com/api/gmail/callback
FRONTEND_URL=https://votre-frontend.com
```

### 2. Ajouter l'URI de redirection dans Google Cloud Console

1. Google Cloud Console → Credentials
2. Modifier le OAuth 2.0 Client ID
3. Ajouter `https://votre-domaine.com/api/gmail/callback`
4. Sauvegarder

### 3. Publier l'application OAuth

1. OAuth consent screen → "Publish App"
2. Soumettre pour vérification Google (si nécessaire)

---

## 📞 Support

Pour toute question sur l'intégration Gmail API, consulter:
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
