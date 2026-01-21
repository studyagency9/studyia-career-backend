# Documentation API - Gestion des Associés

Ce document détaille les endpoints de gestion des associés et du programme d'affiliation de l'API Studyia Career Backend.

## Table des matières

- [Inscription d'un nouvel associé](#inscription-dun-nouvel-associé)
- [Connexion d'un associé](#connexion-dun-associé)
- [Tableau de bord de l'associé](#tableau-de-bord-de-lassocié)
- [Statistiques de parrainage](#statistiques-de-parrainage)
- [Demande de retrait de fonds](#demande-de-retrait-de-fonds)
- [Historique des retraits](#historique-des-retraits)
- [Profil de l'associé](#profil-de-lassocié)
- [Mise à jour du profil](#mise-à-jour-du-profil)
- [Changement de mot de passe](#changement-de-mot-de-passe)

## Inscription d'un nouvel associé

Crée un nouveau compte associé.

**URL** : `/api/associates/signup`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "email": "associe@example.com",
  "password": "MotDePasse123",
  "firstName": "Prénom",
  "lastName": "Nom",
  "phone": "+237612345678",
  "country": "Cameroun",
  "city": "Douala"
}
```

### Réponse en cas de succès

**Code** : `201 Created`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "associate": {
      "id": "60d21b4667d0d8992e610c88",
      "email": "associe@example.com",
      "firstName": "Prénom",
      "lastName": "Nom",
      "phone": "+237612345678",
      "country": "Cameroun",
      "city": "Douala",
      "referralCode": "ABC123",
      "referralLink": "https://studyia.com/ref/ABC123",
      "referralStats": {
        "totalCVs": 0,
        "cvsByMonth": {}
      },
      "totalSales": 0,
      "totalCommission": 0,
      "availableBalance": 0,
      "withdrawnAmount": 0,
      "withdrawalHistory": [],
      "status": "active",
      "isVerified": false,
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

## Connexion d'un associé

Authentifie un associé existant.

**URL** : `/api/associates/login`

**Méthode** : `POST`

**Authentification requise** : Non

### Données attendues

```json
{
  "email": "associe@example.com",
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
    "associate": {
      "id": "60d21b4667d0d8992e610c88",
      "email": "associe@example.com",
      "firstName": "Prénom",
      "lastName": "Nom",
      "phone": "+237612345678",
      "country": "Cameroun",
      "city": "Douala",
      "referralCode": "ABC123",
      "referralLink": "https://studyia.com/ref/ABC123",
      "referralStats": {
        "totalCVs": 10,
        "cvsByMonth": {
          "2026-01": 5,
          "2025-12": 5
        }
      },
      "totalSales": 50000,
      "totalCommission": 10000,
      "availableBalance": 8000,
      "withdrawnAmount": 2000,
      "status": "active",
      "isVerified": true
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

**Condition** : Compte suspendu ou banni

**Code** : `403 Forbidden`

**Contenu** :

```json
{
  "success": false,
  "error": "Votre compte est suspendu"
}
```

## Tableau de bord de l'associé

Récupère les statistiques du tableau de bord de l'associé.

**URL** : `/api/associates/dashboard`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "totalCVs": 10,
    "totalSales": 50000,
    "totalCommission": 10000,
    "availableBalance": 8000,
    "withdrawnAmount": 2000,
    "recentActivity": [
      {
        "type": "cv_purchase",
        "amount": 5000,
        "commission": 1000,
        "date": "2026-01-15T10:30:00.000Z"
      },
      {
        "type": "withdrawal",
        "amount": 2000,
        "status": "completed",
        "date": "2026-01-10T14:20:00.000Z"
      }
    ],
    "monthlySummary": [
      {
        "month": "2026-01",
        "cvs": 5,
        "sales": 25000,
        "commission": 5000
      },
      {
        "month": "2025-12",
        "cvs": 5,
        "sales": 25000,
        "commission": 5000
      }
    ]
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

## Statistiques de parrainage

Récupère les statistiques détaillées de parrainage.

**URL** : `/api/associates/referrals`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "referralLink": "https://studyia.com/ref/ABC123",
    "totalCVs": 10,
    "cvsByMonth": {
      "2026-01": 5,
      "2025-12": 5
    },
    "recentReferrals": [
      {
        "cvId": "60d21b4667d0d8992e610c89",
        "name": "CV Pierre Martin",
        "date": "2026-01-15T10:30:00.000Z",
        "amount": 5000,
        "commission": 1000
      },
      {
        "cvId": "60d21b4667d0d8992e610c90",
        "name": "CV Sophie Dubois",
        "date": "2026-01-10T14:20:00.000Z",
        "amount": 5000,
        "commission": 1000
      }
    ],
    "commissionRate": "20%"
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

## Demande de retrait de fonds

Crée une nouvelle demande de retrait de fonds.

**URL** : `/api/associates/withdrawal`

**Méthode** : `POST`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "amount": 5000,
  "paymentMethod": "mobile_money",
  "paymentDetails": {
    "phoneNumber": "+237612345678",
    "provider": "Orange Money"
  }
}
```

### Réponse en cas de succès

**Code** : `201 Created`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "withdrawal": {
      "id": "60d21b4667d0d8992e610c91",
      "amount": 5000,
      "fee": 100,
      "netAmount": 4900,
      "status": "pending",
      "paymentMethod": "mobile_money",
      "paymentDetails": {
        "phoneNumber": "+237612345678",
        "provider": "Orange Money"
      },
      "requestDate": "2026-01-21T19:45:00.000Z"
    },
    "newBalance": 3000
  }
}
```

### Réponses d'erreur

**Condition** : Solde insuffisant

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Solde insuffisant"
}
```

**Condition** : Montant minimum non atteint

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Le montant minimum de retrait est de 5000 FCFA"
}
```

## Historique des retraits

Récupère l'historique des demandes de retrait.

**URL** : `/api/associates/withdrawals`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Paramètres de requête

- `page` (optionnel, défaut: 1) : Numéro de page pour la pagination
- `limit` (optionnel, défaut: 20) : Nombre d'éléments par page
- `status` (optionnel) : Filtre par statut ('pending', 'completed', 'rejected')

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "withdrawals": [
      {
        "id": "60d21b4667d0d8992e610c91",
        "amount": 5000,
        "fee": 100,
        "netAmount": 4900,
        "status": "pending",
        "paymentMethod": "mobile_money",
        "paymentDetails": {
          "phoneNumber": "+237612345678",
          "provider": "Orange Money"
        },
        "requestDate": "2026-01-21T19:45:00.000Z"
      },
      {
        "id": "60d21b4667d0d8992e610c92",
        "amount": 2000,
        "fee": 40,
        "netAmount": 1960,
        "status": "completed",
        "paymentMethod": "bank_transfer",
        "paymentDetails": {
          "bankName": "BICEC",
          "accountNumber": "1234567890"
        },
        "requestDate": "2026-01-10T14:20:00.000Z",
        "completionDate": "2026-01-12T09:15:00.000Z",
        "transactionId": "TRX123456"
      }
    ],
    "pagination": {
      "total": 2,
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

## Profil de l'associé

Récupère les informations du profil de l'associé.

**URL** : `/api/associates/profile`

**Méthode** : `GET`

**Authentification requise** : Oui (Bearer Token)

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c88",
    "email": "associe@example.com",
    "firstName": "Prénom",
    "lastName": "Nom",
    "phone": "+237612345678",
    "country": "Cameroun",
    "city": "Douala",
    "referralCode": "ABC123",
    "referralLink": "https://studyia.com/ref/ABC123",
    "status": "active",
    "isVerified": true,
    "createdAt": "2026-01-01T19:45:00.000Z",
    "updatedAt": "2026-01-21T19:45:00.000Z"
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

## Mise à jour du profil

Met à jour les informations du profil de l'associé.

**URL** : `/api/associates/profile`

**Méthode** : `PUT`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "firstName": "Nouveau Prénom",
  "lastName": "Nouveau Nom",
  "phone": "+237612345679",
  "country": "Cameroun",
  "city": "Yaoundé"
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "data": {
    "id": "60d21b4667d0d8992e610c88",
    "email": "associe@example.com",
    "firstName": "Nouveau Prénom",
    "lastName": "Nouveau Nom",
    "phone": "+237612345679",
    "country": "Cameroun",
    "city": "Yaoundé",
    "referralCode": "ABC123",
    "referralLink": "https://studyia.com/ref/ABC123",
    "status": "active",
    "isVerified": true,
    "updatedAt": "2026-01-21T19:45:00.000Z"
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

## Changement de mot de passe

Change le mot de passe de l'associé.

**URL** : `/api/associates/password`

**Méthode** : `PUT`

**Authentification requise** : Oui (Bearer Token)

### Données attendues

```json
{
  "currentPassword": "MotDePasse123",
  "newPassword": "NouveauMotDePasse456"
}
```

### Réponse en cas de succès

**Code** : `200 OK`

**Contenu de la réponse** :

```json
{
  "success": true,
  "message": "Mot de passe mis à jour avec succès"
}
```

### Réponses d'erreur

**Condition** : Mot de passe actuel incorrect

**Code** : `400 Bad Request`

**Contenu** :

```json
{
  "success": false,
  "error": "Mot de passe actuel incorrect"
}
```

**Condition** : Non authentifié

**Code** : `401 Unauthorized`

**Contenu** :

```json
{
  "success": false,
  "error": "Non authentifié"
}
```
