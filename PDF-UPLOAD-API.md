# 📄 API Upload PDF - Documentation

## 🎯 Vue d'ensemble

API complète pour uploader des PDFs générés par le frontend et les stocker sur le serveur DigitalOcean.

## 🛠️ Endpoints Disponibles

### 1. **Upload PDF**
```
POST /api/pdfs/upload
```

**Headers :**
- `Content-Type: multipart/form-data`

**Body (FormData) :**
- `pdf` (File) : Le fichier PDF à uploader
- `pdfId` (String, optionnel) : ID unique du PDF
- `personnelId` (String, optionnel) : ID du personnel à mettre à jour
- `price` (Number, optionnel) : Prix du CV

**Réponse Succès :**
```json
{
  "success": true,
  "message": "PDF uploadé avec succès",
  "data": {
    "pdfId": "pdf_abc123_xyz789",
    "filename": "pdf_abc123_xyz789.pdf",
    "originalName": "cv-jean-dupont.pdf",
    "size": 150000,
    "url": "https://studyiacareer-backend-qpmpz.ondigitalocean.app/uploads/pdfs/pdf_abc123_xyz789.pdf",
    "uploadedAt": "2026-02-12T22:03:00.000Z"
  }
}
```

**Réponse Erreur :**
```json
{
  "success": false,
  "error": "Aucun fichier PDF fourni"
}
```

---

### 2. **Vérification PDF**
```
GET /api/pdfs/verify/:filename
```

**Réponse Succès :**
```json
{
  "success": true,
  "data": {
    "filename": "pdf_abc123_xyz789.pdf",
    "size": 150000,
    "createdAt": "2026-02-12T22:03:00.000Z",
    "accessible": true
  }
}
```

---

### 3. **Download PDF**
```
GET /api/pdfs/download/:filename
```

**Headers :**
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="pdf_abc123_xyz789.pdf"`

---

### 4. **Accès Direct (Statique)**
```
GET /uploads/pdfs/:filename
```

**URL directe accessible dans le navigateur :**
```
https://studyiacareer-backend-qpmpz.ondigitalocean.app/uploads/pdfs/pdf_abc123_xyz789.pdf
```

---

## 🔄 Intégration Frontend

### **JavaScript/TypeScript**
```javascript
class PDFUploader {
  static async uploadPDFToServer(cvData, pdfBlob, options = {}) {
    const formData = new FormData();
    
    // Ajouter le fichier PDF
    formData.append('pdf', pdfBlob, `cv-${cvData.personalInfo?.firstName || 'unknown'}-${cvData.personalInfo?.lastName || 'unknown'}.pdf`);
    
    // Ajouter les métadonnées
    if (options.pdfId) formData.append('pdfId', options.pdfId);
    if (options.personnelId) formData.append('personnelId', options.personnelId);
    if (options.price) formData.append('price', options.price);
    
    try {
      const response = await fetch('https://studyiacareer-backend-qpmpz.ondigitalocean.app/api/pdfs/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ PDF uploadé avec succès !');
        console.log('🔗 URL:', result.data.url);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Erreur upload PDF:', error);
      throw error;
    }
  }
  
  static async verifyPDFExists(pdfUrl) {
    try {
      const filename = pdfUrl.split('/').pop();
      const response = await fetch(`https://studyiacareer-backend-qpmpz.ondigitalocean.app/api/pdfs/verify/${filename}`);
      
      const result = await response.json();
      return result.success && result.data.accessible;
    } catch (error) {
      console.error('❌ Erreur vérification PDF:', error);
      return false;
    }
  }
}

// 🎯 Exemple d'utilisation complet
async function handleCVUpload(cvData, price, personnelId) {
  try {
    console.log('🎯 DÉBUT - UPLOAD RÉEL DU PDF');
    console.log('============================================================');
    console.log('📋 INFOS DU CV :');
    console.log(`   👤 Nom: ${cvData.personalInfo?.firstName} ${cvData.personalInfo?.lastName}`);
    console.log(`   📧 Email: ${cvData.personalInfo?.email}`);
    console.log(`   💰 Prix: ${price} FCFA`);
    
    // 1. Générer le PDF (avec votre bibliothèque préférée)
    const pdfBlob = await generatePDFBlob(cvData);
    console.log('📊 INFOS DU PDF :');
    console.log(`   📊 Taille: ${pdfBlob.size} bytes`);
    console.log(`   📄 Type: ${pdfBlob.type}`);
    
    // 2. Uploader vers le serveur
    const pdfId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🌐 Upload vers le serveur DigitalOcean...');
    
    const uploadResult = await PDFUploader.uploadPDFToServer(cvData, pdfBlob, {
      pdfId,
      personnelId,
      price
    });
    
    console.log('✅ PDF uploadé avec succès !');
    console.log('🔗 URL DU PDF :');
    console.log(`   ${uploadResult.url}`);
    
    // 3. Vérifier l'accessibilité
    console.log('🔍 Vérification de l\'accessibilité du PDF...');
    const isAccessible = await PDFUploader.verifyPDFExists(uploadResult.url);
    console.log(`   📄 PDF accessible: ${isAccessible ? '✅ Oui' : '❌ Non'}`);
    
    if (isAccessible) {
      console.log('✅ PDF accessible via l\'URL - Vous pouvez l\'ouvrir dans votre navigateur !');
    }
    
    console.log('🎉 RÉSUMÉ :');
    console.log(`   🔗 URL: ${uploadResult.url}`);
    console.log(`   🆔 ID: ${uploadResult.pdfId}`);
    console.log(`   💰 Prix: ${price} FCFA`);
    console.log('============================================================');
    
    return uploadResult;
    
  } catch (error) {
    console.error('❌ Erreur complète:', error);
    throw error;
  }
}
```

---

## 🎨 React Hook

```typescript
import { useState } from 'react';

export function usePDFUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const uploadPDF = async (cvData: any, pdfBlob: Blob, options?: any) => {
    setUploading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('pdf', pdfBlob);
      
      if (options.pdfId) formData.append('pdfId', options.pdfId);
      if (options.personnelId) formData.append('personnelId', options.personnelId);
      if (options.price) formData.append('price', options.price);
      
      // Simulation de progression (vous pouvez utiliser XMLHttpRequest pour une vraie progression)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const response = await fetch('/api/pdfs/upload', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };
  
  return { uploadPDF, uploading, progress };
}
```

---

## 🔧 Configuration Serveur

### **Variables d'environnement recommandées :**
```env
BASE_URL=https://studyiacareer-backend-qpmpz.ondigitalocean.app
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=uploads/pdfs
```

### **Structure des dossiers :**
```
studyia-career-backend/
├── uploads/
│   └── pdfs/
│       ├── pdf_abc123_xyz789.pdf
│       ├── pdf_def456_uvw012.pdf
│       └── ...
├── src/
│   ├── routes/
│   │   └── pdf.routes.js
│   └── app.js
```

---

## 🚀 Déploiement

### **DigitalOcean App Platform :**
1. ✅ **Routes créées** : `/api/pdfs/*`
2. ✅ **Dossier uploads** : Créé automatiquement
3. ✅ **Middleware Multer** : Configuré
4. ✅ **Service statique** : `/uploads/pdfs/*`

### **Commandes de déploiement :**
```bash
# Ajouter les fichiers
git add src/routes/pdf.routes.js
git add src/app.js
git add PDF-UPLOAD-API.md

# Commit
git commit -m "🆕 Ajout API upload PDF avec stockage serveur"

# Push
git push origin main

# DigitalOcean va automatiquement redéployer
```

---

## 🎯 Test de l'API

### **cURL Test :**
```bash
# Test upload
curl -X POST \
  https://studyiacareer-backend-qpmpz.ondigitalocean.app/api/pdfs/upload \
  -F "pdf=@/path/to/your/file.pdf" \
  -F "pdfId=test_pdf_123" \
  -F "personnelId=507f1f77bcf86cd799439011" \
  -F "price=5000"

# Test vérification
curl https://studyiacareer-backend-qpmpz.ondigitalocean.app/api/pdfs/verify/test_pdf_123.pdf

# Test download
curl https://studyiacareer-backend-qpmpz.ondigitalocean.app/uploads/pdfs/test_pdf_123.pdf
```

---

## 📊 Monitoring

### **Logs serveur attendus :**
```
🎯 DÉBUT - RÉCEPTION UPLOAD PDF
📋 INFOS REÇUES :
   🆔 PDF ID: pdf_abc123_xyz789
   👤 Personnel ID: 507f1f77bcf86cd799439011
   💰 Prix: 5000 FCFA
   📊 Taille fichier: 150000 bytes
✅ PDF reçu et sauvegardé !
🔗 URL générée: https://studyiacareer-backend-qpmpz.ondigitalocean.app/uploads/pdfs/pdf_abc123_xyz789.pdf
👤 Personnel 507f1f77bcf86cd799439011 mis à jour avec l'URL PDF
🎉 UPLOAD TERMINÉ AVEC SUCCÈS !
```

---

**🎉 L'API est prête ! Votre système d'upload PDF va maintenant fonctionner avec de vrais fichiers sur votre serveur DigitalOcean !**
