# 🚀 Studyia Career Pro API - Documentation

## 📋 Vue d'ensemble

Cette API permet aux **partenaires (entreprises)** de :
- Créer et gérer des **offres d'emploi**
- Recevoir et analyser des **candidatures (CV)**
- Utiliser l'**IA Gemini** pour matcher automatiquement les candidats
- Consulter des **statistiques et analytics**
- Recevoir des **notifications** en temps réel

## 🏗️ Architecture Multi-Tenant

```
Partner (Entreprise)
  └── JobPosts[] (Offres d'emploi du partner)
       └── Candidates[] (Candidatures pour cette offre)
            └── CVData (Données extraites du CV)
            └── MatchingAnalysis (Score IA 0-100)
```

**Isolation des données** : Chaque partner ne voit QUE ses propres offres et candidatures.

---

## 🔐 Authentification

Toutes les routes nécessitent un token JWT dans le header :
```
Authorization: Bearer {accessToken}
```

---

## 📝 **1. GESTION DES OFFRES D'EMPLOI**

### Créer une offre
```http
POST /api/job-posts
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Développeur Full Stack",
  "description": "Nous recherchons...",
  "company": "Studyia Agency",
  "city": "Douala",
  "country": "CM",
  "remote": false,
  "requiredSkills": ["JavaScript", "React", "Node.js"],
  "optionalSkills": ["TypeScript", "MongoDB"],
  "education": ["bachelor", "master"],
  "experience": "mid",
  "minYearsExperience": 3,
  "contractType": "full_time",
  "salaryMin": 500000,
  "salaryMax": 800000,
  "currency": "XAF",
  "deadline": "2026-03-31T23:59:59Z",
  "languageRequirement": "bilingual",
  "gender": "any",
  "maritalStatus": "any",
  "drivingLicense": "preferred"
}
```

### Lister les offres du partner
```http
GET /api/job-posts?status=active&page=1&limit=20&search=developer
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "jobPosts": [
      {
        "_id": "65f...",
        "title": "Développeur Full Stack",
        "status": "active",
        "applicationCount": 15,
        "stats": {
          "totalCandidates": 15,
          "newCandidates": 5
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### Publier une offre
```http
POST /api/job-posts/{id}/publish
Authorization: Bearer {token}
```

### Fermer une offre
```http
POST /api/job-posts/{id}/close
Authorization: Bearer {token}
```

### Dupliquer une offre
```http
POST /api/job-posts/{id}/duplicate
Authorization: Bearer {token}
```

### Statistiques d'une offre
```http
GET /api/job-posts/{id}/stats
Authorization: Bearer {token}
```

---

## 👥 **2. GESTION DES CANDIDATURES**

### Upload multiple de CV (PDF/Word)
```http
POST /api/job-posts/{jobId}/upload-cvs
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
  files: [cv1.pdf, cv2.pdf, cv3.docx] (max 10 fichiers, 10MB chacun)
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "uploadedFiles": [
      {
        "filename": "cv-1234567890.pdf",
        "originalName": "john_doe_cv.pdf",
        "size": 245678,
        "url": "https://studyiacareer-backend.../uploads/cvs/cv-1234567890.pdf",
        "candidateId": "65f..."
      }
    ],
    "totalUploaded": 3
  }
}
```

### Analyser les CV avec IA Gemini
```http
POST /api/job-posts/{jobId}/analyze-cvs
Content-Type: application/json
Authorization: Bearer {token}

{
  "candidateIds": ["65f...", "65f...", "65f..."]
}
```

**Ce que fait l'IA :**
1. Extrait le texte du CV (PDF ou Word)
2. Envoie à Gemini pour extraction de données structurées
3. Compare avec les critères de l'offre
4. Calcule un **score de matching (0-100)**
5. Identifie les forces et faiblesses
6. Génère une recommandation

**Réponse :**
```json
{
  "success": true,
  "data": {
    "analyzed": 3,
    "failed": 0,
    "results": [
      {
        "candidateId": "65f...",
        "status": "success",
        "score": 85
      }
    ]
  }
}
```

### Lister les candidats (triés par score)
```http
GET /api/job-posts/{jobId}/candidates?status=new&minScore=70&sortBy=matchingAnalysis.globalScore&sortOrder=desc
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "_id": "65f...",
        "cvData": {
          "personalInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "+237691234567"
          },
          "experiences": [...],
          "skills": [...]
        },
        "matchingAnalysis": {
          "globalScore": 85,
          "skillsScore": 90,
          "experienceScore": 80,
          "educationScore": 85,
          "matchedSkills": ["JavaScript", "React", "Node.js"],
          "missingSkills": ["TypeScript"],
          "strengths": ["Excellente maîtrise de React", "5 ans d'expérience"],
          "weaknesses": ["Pas de TypeScript"],
          "recommendation": "Candidat très prometteur..."
        },
        "status": "new",
        "createdAt": "2026-02-26T00:00:00Z"
      }
    ],
    "pagination": {...},
    "averageScore": 75
  }
}
```

### Détails d'un candidat
```http
GET /api/candidates/{id}
Authorization: Bearer {token}
```

### Changer le statut d'un candidat
```http
PUT /api/candidates/{id}/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "shortlisted",
  "notes": "Excellent profil, à contacter rapidement"
}
```

**Statuts disponibles :**
- `new` - Nouveau
- `reviewed` - Examiné
- `shortlisted` - Présélectionné
- `interview` - En entretien
- `offer` - Offre envoyée
- `hired` - Embauché
- `rejected` - Rejeté

### Ajouter une note
```http
POST /api/candidates/{id}/notes
Content-Type: application/json
Authorization: Bearer {token}

{
  "note": "Très bon feeling lors de l'entretien téléphonique"
}
```

### Télécharger le CV original
```http
GET /api/candidates/{id}/download-cv
Authorization: Bearer {token}
```

---

## 📊 **3. ANALYTICS & STATISTIQUES**

### Dashboard général
```http
GET /api/analytics/dashboard?period=month
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "totalJobPosts": 25,
    "activeJobPosts": 10,
    "totalApplications": 150,
    "newApplications": 20,
    "shortlistedCandidates": 15,
    "averageScore": 72,
    "topPerformingJobs": [...],
    "applicationTrend": [
      { "date": "2026-02-20", "count": 5 },
      { "date": "2026-02-21", "count": 8 }
    ]
  }
}
```

### Analytics compétences
```http
GET /api/analytics/skills?period=month
Authorization: Bearer {token}
```

### Analytics candidats
```http
GET /api/analytics/candidates?period=month
Authorization: Bearer {token}
```

---

## 🔔 **4. NOTIFICATIONS**

### Lister les notifications
```http
GET /api/notifications?read=false&page=1&limit=20
Authorization: Bearer {token}
```

**Types de notifications :**
- `new_application` - Nouvelle candidature
- `high_score_candidate` - Candidat avec score élevé (≥80%)
- `deadline_reminder` - Rappel de deadline
- `job_published` - Offre publiée
- `job_closed` - Offre fermée

### Marquer comme lu
```http
PUT /api/notifications/{id}/read
Authorization: Bearer {token}
```

### Tout marquer comme lu
```http
PUT /api/notifications/mark-all-read
Authorization: Bearer {token}
```

### Préférences de notification
```http
GET /api/notifications/settings
Authorization: Bearer {token}

PUT /api/notifications/settings
Content-Type: application/json
{
  "emailNotifications": true,
  "newApplications": true,
  "highScoreCandidates": true,
  "deadlineReminders": true
}
```

---

## 🎯 **WORKFLOW TYPIQUE**

### 1. Créer une offre d'emploi
```bash
POST /api/job-posts
```

### 2. Publier l'offre
```bash
POST /api/job-posts/{id}/publish
```

### 3. Recevoir des CV
```bash
POST /api/job-posts/{jobId}/upload-cvs
# Upload de 5 CV en PDF
```

### 4. Analyser avec l'IA
```bash
POST /api/job-posts/{jobId}/analyze-cvs
{
  "candidateIds": ["id1", "id2", "id3", "id4", "id5"]
}
```

### 5. Consulter les candidats triés par score
```bash
GET /api/job-posts/{jobId}/candidates?sortBy=matchingAnalysis.globalScore&sortOrder=desc
```

### 6. Présélectionner les meilleurs
```bash
PUT /api/candidates/{id}/status
{ "status": "shortlisted" }
```

### 7. Consulter les stats
```bash
GET /api/analytics/dashboard
```

---

## 🔧 **CONFIGURATION REQUISE**

### Variables d'environnement (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
BASE_URL=https://studyiacareer-backend-qpmpz.ondigitalocean.app
```

### Dépendances NPM
```json
{
  "@google/generative-ai": "^0.21.0",
  "mammoth": "^1.8.0",
  "pdf-parse": "^1.1.4",
  "multer": "^2.0.2"
}
```

---

## 📈 **LIMITES & QUOTAS**

- **Upload CV** : Max 10 fichiers par requête, 10MB par fichier
- **Formats acceptés** : PDF, DOC, DOCX
- **Analyse IA** : Pas de limite (dépend de votre quota Gemini)
- **Rate limiting** : 100 requêtes/minute par partner

---

## 🐛 **CODES D'ERREUR**

- `400` - Requête invalide (validation échouée)
- `401` - Non authentifié (token manquant/invalide)
- `403` - Non autorisé (accès à une ressource d'un autre partner)
- `404` - Ressource non trouvée
- `500` - Erreur serveur

---

## 📞 **SUPPORT**

Pour toute question ou problème :
- Email: contact@studyia.net
- Documentation complète : [Voir CAREER_PRO_API.md]

---

**Version** : 1.0.0  
**Dernière mise à jour** : 26 février 2026
