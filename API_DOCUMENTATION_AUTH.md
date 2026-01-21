# Documentation API - Authentification

Ce document détaille les endpoints d'authentification de l'API Studyia Career Backend.

## Table des matières

- [Inscription d'un nouveau partenaire](#inscription-dun-nouveau-partenaire)
- [Connexion d'un partenaire](#connexion-dun-partenaire)
- [Rafraîchissement du token](#rafraîchissement-du-token)
- [Déconnexion](#déconnexion)

## Inscription d'un nouveau partenaire

Crée un nouveau compte partenaire.

**URL** : `/api/auth/signup`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "email": "partenaire@example.com",
  "password": "MotDePasse123",
  "firstName": "Prénom",
  "lastName": "Nom",
  "company": "Nom de l'entreprise"  // Optionnel
}
```

### Réponse en cas de succès

**Code** : `201 Created`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "partner": {
      "id": "60d21b4667d0d8992e610c85",
      "email": "partenaire@example.com",
      "firstName": "Prénom",
      "lastName": "Nom",
      "company": "Nom de l'entreprise",
      "plan": "starter",
      "cvUsedThisMonth": 0,
      "planRenewalDate": "2026-02-21T19:45:00.000Z",
      "status": "active",
      "cvHistory": [],
      "createdAt": "2026-01-21T19:45:00.000Z",
      "updatedAt": "2026-01-21T19:45:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Réponses d'erreur

**Condition** : Email déjà utilisé

**Code** : `409 Conflict`

**Contenu** :

```json
{
  "success": false,
  "error": "Cet email est déjà utilisé"
}
```

**Condition** : Données invalides

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Veuillez fournir un email et un mot de passe valides"
}
```

## Connexion d'un partenaire

Authentifie un partenaire existant.

**URL** : `/api/auth/login`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "email": "partenaire@example.com",
  "password": "MotDePasse123"
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "partner": {
      "id": "60d21b4667d0d8992e610c85",
      "email": "partenaire@example.com",
      "firstName": "Prénom",
      "lastName": "Nom",
      "company": "Nom de l'entreprise",
      "plan": "starter",
      "cvUsedThisMonth": 5,
      "planRenewalDate": "2026-02-21T19:45:00.000Z",
      "status": "active",
      "cvHistory": [
        {
          "cvId": "60d21b4667d0d8992e610c86",
          "name": "CV Jean Dupont",
          "pdfUrl": "https://storage.example.com/cv/60d21b4667d0d8992e610c86.pdf",
          "createdAt": "2026-01-15T10:30:00.000Z"
        }
      ],
      "createdAt": "2026-01-01T19:45:00.000Z",
      "updatedAt": "2026-01-21T19:45:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Réponses d'erreur

**Condition** : Identifiants invalides

**Code** : `401 Unauthorized`

**Contenu** :

```json
{
  "success": false,
  "error": "Identifiants invalides"
}
```

## Rafraîchissement du token

Obtient un nouveau token d'accès à l'aide d'un refresh token.

**URL** : `/api/auth/refresh`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Réponses d'erreur

**Condition** : Token de rafraîchissement invalide ou expiré

**Code** : `401 Unauthorized`

**Contenu** :

```json
{
  "success": false,
  "error": "Token de rafraîchissement invalide ou expiré"
}
```

## Déconnexion

Révoque un refresh token.

**URL** : `/api/auth/logout`

**Méthode** : `POST`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "message": "Déconnexion réussie"
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
