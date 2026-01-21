# Documentation API - Gestion des CV

Ce document détaille les endpoints de gestion des CV de l'API Studyia Career Backend.

## Table des matières

- [Récupérer tous les CV](#récupérer-tous-les-cv)
- [Récupérer un CV spécifique](#récupérer-un-cv-spécifique)
- [Créer un nouveau CV](#créer-un-nouveau-cv)
- [Mettre à jour un CV](#mettre-à-jour-un-cv)
- [Supprimer un CV](#supprimer-un-cv)
- [Acheter un CV (public)](#acheter-un-cv-public)

## Récupérer tous les CV

Récupère la liste des CV du partenaire authentifié.

**URL** : `/api/cvs`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Paramètres de requête

- `search` (optionnel) : Terme de recherche pour filtrer les CV
- `page` (optionnel, défaut: 1) : Numéro de page pour la pagination
- `limit` (optionnel, défaut: 20) : Nombre d'éléments par page

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "cvs": [
      {
        "id": "60d21b4667d0d8992e610c86",
        "name": "CV Jean Dupont",
        "language": "fr",
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "id": "60d21b4667d0d8992e610c87",
        "name": "CV Marie Martin",
        "language": "fr",
        "createdAt": "2026-01-10T14:20:00.000Z",
        "updatedAt": "2026-01-10T14:20:00.000Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### Réponses d'erreur

**Condition** : Non authentifié

**Code** : `401 Unauthorized`

**Contenu** :

```json
{
  "success": false,
  "error": "Non authentifié"
}
```

## Récupérer un CV spécifique

Récupère les détails d'un CV spécifique.

**URL** : `/api/cvs/:id`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "partnerId": "60d21b4667d0d8992e610c85",
    "name": "CV Jean Dupont",
    "language": "fr",
    "data": {
      "personalInfo": {
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean.dupont@example.com",
        "phone": "+33612345678",
        "address": "123 Rue de Paris, 75001 Paris",
        "dateOfBirth": "1990-01-15",
        "position": "Développeur Full Stack"
      },
      "education": [
        {
          "institution": "Université de Paris",
          "degree": "Master en Informatique",
          "startDate": "2010-09",
          "endDate": "2012-06",
          "description": "Spécialisation en développement web"
        }
      ],
      "experience": [
        {
          "company": "Tech Solutions",
          "position": "Développeur Full Stack",
          "startDate": "2012-09",
          "endDate": "2020-12",
          "description": "Développement d'applications web avec React et Node.js"
        }
      ],
      "skills": [
        "JavaScript",
        "React",
        "Node.js",
        "MongoDB",
        "Express"
      ]
    },
    "pdfUrl": "https://storage.example.com/cv/60d21b4667d0d8992e610c86.pdf",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### Réponses d'erreur

**Condition** : CV non trouvé ou n'appartenant pas au partenaire

**Code** : `404 Not Found`

**Contenu** :

```json
{
  "success": false,
  "error": "CV non trouvé"
}
```

## Créer un nouveau CV

Crée un nouveau CV pour le partenaire authentifié.

**URL** : `/api/cvs`

**Méthode** : `POST`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "name": "CV Jean Dupont",
  "language": "fr",
  "data": {
    "personalInfo": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33612345678",
      "address": "123 Rue de Paris, 75001 Paris",
      "dateOfBirth": "1990-01-15",
      "position": "Développeur Full Stack"
    },
    "education": [
      {
        "institution": "Université de Paris",
        "degree": "Master en Informatique",
        "startDate": "2010-09",
        "endDate": "2012-06",
        "description": "Spécialisation en développement web"
      }
    ],
    "experience": [
      {
        "company": "Tech Solutions",
        "position": "Développeur Full Stack",
        "startDate": "2012-09",
        "endDate": "2020-12",
        "description": "Développement d'applications web avec React et Node.js"
      }
    ],
    "skills": [
      "JavaScript",
      "React",
      "Node.js",
      "MongoDB",
      "Express"
    ]
  },
  "pdfUrl": "https://storage.example.com/cv/60d21b4667d0d8992e610c86.pdf" // Optionnel
}
```

### Réponse en cas de succès

**Code** : `201 Created`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "partnerId": "60d21b4667d0d8992e610c85",
    "name": "CV Jean Dupont",
    "language": "fr",
    "data": {
      // Données complètes du CV
    },
    "pdfUrl": "https://storage.example.com/cv/60d21b4667d0d8992e610c86.pdf",
    "createdAt": "2026-01-21T19:45:00.000Z",
    "updatedAt": "2026-01-21T19:45:00.000Z"
  }
}
```

### Réponses d'erreur

**Condition** : Quota mensuel dépassé

**Code** : `403 Forbidden`

**Contenu** :

```json
{
  "success": false,
  "error": "Quota mensuel dépassé"
}
```

**Condition** : Données invalides

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Données invalides"
}
```

## Mettre à jour un CV

Met à jour un CV existant.

**URL** : `/api/cvs/:id`

**Méthode** : `PUT`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "name": "CV Jean Dupont - Mis à jour",
  "data": {
    // Données mises à jour du CV
  }
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c86",
    "partnerId": "60d21b4667d0d8992e610c85",
    "name": "CV Jean Dupont - Mis à jour",
    "language": "fr",
    "data": {
      // Données mises à jour du CV
    },
    "pdfUrl": "https://storage.example.com/cv/60d21b4667d0d8992e610c86.pdf",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-21T19:45:00.000Z"
  }
}
```

### Réponses d'erreur

**Condition** : CV non trouvé ou n'appartenant pas au partenaire

**Code** : `404 Not Found`

**Contenu** :

```json
{
  "success": false,
  "error": "CV non trouvé"
}
```

## Supprimer un CV

Supprime un CV existant.

**URL** : `/api/cvs/:id`

**Méthode** : `DELETE`

**Authentification requise** : Oui (Bearer Token)

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "message": "CV supprimé avec succès"
}
```

### Réponses d'erreur

**Condition** : CV non trouvé ou n'appartenant pas au partenaire

**Code** : `404 Not Found`

**Contenu** :

```json
{
  "success": false,
  "error": "CV non trouvé"
}
```

## Acheter un CV (public)

Permet à un utilisateur public d'acheter un CV.

**URL** : `/api/cv/purchase`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "paymentToken": "tok_visa_1234567890",
  "cvData": {
    "personalInfo": {
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33612345678",
      "address": "123 Rue de Paris, 75001 Paris",
      "dateOfBirth": "1990-01-15",
      "position": "Développeur Full Stack"
    },
    "education": [
      // Données d'éducation
    ],
    "experience": [
      // Données d'expérience
    ],
    "skills": [
      // Compétences
    ]
  },
  "referralCode": "ABC123" // Optionnel, code de parrainage
}
```

### Réponse en cas de succès

**Code** : `201 Created`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "cvId": "60d21b4667d0d8992e610c86",
    "downloadUrl": "/api/cv/download/60d21b4667d0d8992e610c86",
    "message": "Payment successful, CV created."
  }
}
```

### Réponses d'erreur

**Condition** : Erreur de paiement ou données invalides

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Erreur lors du traitement du paiement"
}
```
