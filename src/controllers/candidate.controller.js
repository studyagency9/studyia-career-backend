const Candidate = require('../models/candidate.model');
const JobPost = require('../models/jobPost.model');
const Notification = require('../models/notification.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
// Configuration Gemini AI - Endpoint v1beta avec modèle disponible
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// Configuration multer pour upload CV
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/cvs');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
}); 

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
}).array('files', 10); // Max 10 fichiers

// Upload multiple CV
exports.uploadCVs = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    try {
      const { jobId } = req.params;
      const partnerId = req.partner.id;
      
      // Vérifier que le job appartient au partner
      const jobPost = await JobPost.findOne({ _id: jobId, partnerId });
      
      if (!jobPost) {
        // Supprimer les fichiers uploadés
        for (const file of req.files) {
          await fs.unlink(file.path);
        }
        
        return res.status(404).json({
          success: false,
          error: 'Job post not found'
        });
      }
      
      // Créer les candidats
      const uploadedFiles = [];
      const baseUrl = process.env.BASE_URL || 'https://studyiacareer-backend-qpmpz.ondigitalocean.app';
      
      for (const file of req.files) {
        const fileUrl = `${baseUrl}/uploads/cvs/${file.filename}`;
        const fileType = path.extname(file.originalname).substring(1).toLowerCase();
        
        const candidate = await Candidate.create({
          jobPostId: jobId,
          partnerId,
          originalFileName: file.originalname,
          originalFileUrl: fileUrl,
          fileSize: file.size,
          fileType: fileType === 'docx' || fileType === 'doc' ? 'docx' : 'pdf',
          status: 'new'
        });
        
        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: fileUrl,
          candidateId: candidate._id
        });
      }
      
      // Incrémenter le compteur de candidatures
      await jobPost.incrementApplications();
      
      // Créer une notification
      await Notification.createNotification({
        partnerId,
        type: 'new_application',
        title: 'Nouvelles candidatures',
        message: `${uploadedFiles.length} nouveau(x) CV reçu(s) pour "${jobPost.title}"`,
        priority: 'high',
        data: {
          jobPostId: jobPost._id,
          count: uploadedFiles.length
        },
        actionUrl: `/jobs/${jobPost._id}/candidates`
      });
      
      return res.status(200).json({
        success: true,
        message: `${uploadedFiles.length} CV uploaded successfully`,
        data: {
          uploadedFiles,
          totalUploaded: uploadedFiles.length
        }
      });
    } catch (error) {
      console.error('Error uploading CVs:', error);
      
      // Nettoyer les fichiers en cas d'erreur
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
          }
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Error uploading CVs',
        details: process.env.NODE_ENV === 'development' ? error.message : null
      });
    }
  });
};

// Extraire le texte d'un PDF
async function extractTextFromPDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

// Extraire le texte d'un document Word
async function extractTextFromWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

// Analyser un CV avec Gemini AI
async function analyzeCVWithGemini(cvText, jobPost) {
  // Validation stricte
  if (!jobPost) {
    throw new Error('JobPost is required for CV analysis');
  }

  // Construction intelligente du contexte du job
  const jobContext = {
    title: jobPost.title,
    description: jobPost.description,
    company: jobPost.company,
    experience: jobPost.experience,
    minYearsExperience: jobPost.minYearsExperience || 0,
    contractType: jobPost.contractType,
    city: jobPost.city,
    country: jobPost.country,
    remote: jobPost.remote
  };

  // Compétences (vérifier si non vides)
  const hasRequiredSkills = Array.isArray(jobPost.requiredSkills) && jobPost.requiredSkills.length > 0;
  const hasOptionalSkills = Array.isArray(jobPost.optionalSkills) && jobPost.optionalSkills.length > 0;
  const hasEducation = Array.isArray(jobPost.education) && jobPost.education.length > 0;

  // Construire la section compétences du prompt
  let skillsSection = '';
  if (hasRequiredSkills) {
    skillsSection += `Compétences REQUISES: ${jobPost.requiredSkills.join(', ')}\n`;
  }
  if (hasOptionalSkills) {
    skillsSection += `Compétences OPTIONNELLES: ${jobPost.optionalSkills.join(', ')}\n`;
  }
  if (!hasRequiredSkills && !hasOptionalSkills) {
    skillsSection += `Compétences: À évaluer selon la description du poste\n`;
  }

  // Construire la section éducation
  const educationLabels = {
    'high_school': 'Baccalauréat',
    'bachelor': 'Licence/Bachelor',
    'master': 'Master',
    'phd': 'Doctorat'
  };
  let educationSection = '';
  if (hasEducation) {
    const educationList = jobPost.education.map(e => educationLabels[e] || e).join(', ');
    educationSection = `Niveau d'éducation requis: ${educationList}\n`;
  } else {
    educationSection = `Niveau d'éducation: À évaluer selon l'expérience\n`;
  }

  // Niveau d'expérience
  const experienceLabels = {
    'entry': 'Débutant (0-1 an)',
    'junior': 'Junior (1-3 ans)',
    'mid': 'Intermédiaire (3-5 ans)',
    'senior': 'Senior (5-10 ans)',
    'expert': 'Expert (10+ ans)'
  };
  const experienceLevel = experienceLabels[jobPost.experience] || jobPost.experience;

  console.log('🔍 Analyse CV avec JobPost:', {
    title: jobContext.title,
    hasRequiredSkills,
    hasOptionalSkills,
    hasEducation,
    experience: experienceLevel
  });

  const prompt = `
Tu es un expert en recrutement. Analyse ce CV et extrais les informations structurées suivantes au format JSON.

CV:
${cvText}

OFFRE D'EMPLOI:
Titre du poste: ${jobContext.title}
Entreprise: ${jobContext.company}
Description: ${jobContext.description}
Localisation: ${jobContext.city}, ${jobContext.country}${jobContext.remote ? ' (Télétravail possible)' : ''}
Type de contrat: ${jobContext.contractType}

CRITÈRES DE SÉLECTION:
${skillsSection}${educationSection}Niveau d'expérience: ${experienceLevel}
Années d'expérience minimum: ${jobContext.minYearsExperience} ans

Retourne un JSON avec cette structure exacte:
{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "city": "string",
    "country": "string",
    "dateOfBirth": "YYYY-MM-DD ou null",
    "nationality": "string",
    "maritalStatus": "string",
    "gender": "string",
    "drivingLicense": "string"
  },
  "professionalSummary": "string",
  "experiences": [
    {
      "company": "string",
      "position": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD ou null",
      "current": boolean,
      "description": "string",
      "location": "string"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD ou null",
      "current": boolean,
      "description": "string"
    }
  ],
  "skills": [
    {
      "name": "string",
      "level": "beginner|intermediate|advanced|expert",
      "category": "string"
    }
  ],
  "languages": [
    {
      "name": "string",
      "level": "basic|intermediate|fluent|native"
    }
  ],
  "certifications": [],
  "projects": [],
  "references": [],
  "matchingAnalysis": {
    "globalScore": 0-100,
    "skillsScore": 0-100,
    "experienceScore": 0-100,
    "educationScore": 0-100,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3", "skill4"],
    "strengths": ["point fort 1", "point fort 2"],
    "weaknesses": ["point faible 1", "point faible 2"],
    "recommendation": "Recommandation détaillée",
    "yearsOfExperience": number,
    "educationLevel": "string",
    "languageMatch": boolean,
    "locationMatch": boolean
  }
}

INSTRUCTIONS POUR LE MATCHING:
1. **globalScore**: Score global de 0 à 100 basé sur l'adéquation globale avec le poste
   - Compare les compétences du CV avec celles requises/optionnelles (si spécifiées)
   - Compare l'expérience du candidat avec le niveau requis
   - Compare l'éducation du candidat avec le niveau requis (si spécifié)
   - Évalue la cohérence du profil avec la description du poste

2. **skillsScore**: Score de 0 à 100 pour les compétences
   - Si des compétences REQUISES sont spécifiées: évalue le % de compétences possédées
   - Si aucune compétence spécifiée: évalue les compétences par rapport à la description du poste
   - Bonus pour les compétences optionnelles

3. **experienceScore**: Score de 0 à 100 pour l'expérience
   - Compare les années d'expérience du candidat avec le minimum requis
   - Évalue la pertinence des expériences passées avec le poste
   - Niveau requis: ${experienceLevel} (${jobContext.minYearsExperience}+ ans)

4. **educationScore**: Score de 0 à 100 pour l'éducation
   ${hasEducation ? `- Niveau requis: ${jobPost.education.map(e => educationLabels[e] || e).join(', ')}` : '- Évalue l\'éducation par rapport aux exigences du poste'}
   - Considère aussi l'expérience compensatoire

5. **matchedSkills**: Liste des compétences du candidat qui correspondent aux exigences
6. **missingSkills**: Liste des compétences requises manquantes (si spécifiées)
7. **strengths**: 2-3 points forts du candidat pour ce poste
8. **weaknesses**: 2-3 points faibles ou axes d'amélioration
9. **recommendation**: Recommandation claire (Fortement recommandé / Recommandé / À considérer / Non recommandé)

IMPORTANT - RÈGLES DE SCORING STRICTES: 
- **TOUS les scores doivent être des nombres entre 0 et 100**
- **NE JAMAIS mettre 0 par défaut** - évalue toujours l'adéquation réelle
- Le globalScore doit refléter une vraie adéquation basée sur l'analyse complète
- Échelle de scoring:
  * 90-100: Candidat exceptionnel, dépasse largement les exigences
  * 75-89: Excellent candidat, correspond très bien au poste
  * 60-74: Bon candidat, correspond bien avec quelques manques mineurs
  * 45-59: Candidat moyen, correspond partiellement
  * 30-44: Candidat faible, manque plusieurs compétences clés
  * 0-29: Ne correspond pas du tout au poste

EXEMPLE DE SCORING:
- Si le candidat a 6/8 compétences requises → skillsScore = 75
- Si le candidat a 5 ans d'expérience pour un poste senior (5+ ans) → experienceScore = 85
- Si le candidat a un Master pour un poste qui demande un Master → educationScore = 100

**CALCUL DU GLOBAL SCORE:**
globalScore = (skillsScore × 0.4) + (experienceScore × 0.3) + (educationScore × 0.3)

Retourne UNIQUEMENT le JSON, sans texte avant ou après.
`;

  // Appel API Gemini avec retry automatique (non-streaming, optimisé backend)
  const maxRetries = 3;
  let lastError;
  let result;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitTime = Math.pow(2, attempt - 1) * 1000; // Backoff exponentiel: 2s, 4s, 8s
        console.log(`⏳ Tentative ${attempt}/${maxRetries} après ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const response = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = JSON.parse(errorText);
        
        // Si erreur 503 (service unavailable) ou 429 (rate limit), on retry
        if (errorData.error?.code === 503 || errorData.error?.code === 429) {
          console.warn(`⚠️ Gemini temporairement indisponible (${errorData.error.code}), tentative ${attempt}/${maxRetries}`);
          lastError = new Error(`Gemini API Error: ${errorText}`);
          continue; // Retry
        }
        
        // Pour les autres erreurs, on throw immédiatement
        throw new Error(`Gemini API Error: ${errorText}`);
      }
      
      // Succès
      result = await response.json();
      console.log(`✅ Gemini API répondu avec succès (tentative ${attempt}/${maxRetries})`);
      break; // Succès, on sort de la boucle
      
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        console.error(`❌ Échec après ${maxRetries} tentatives`);
      }
    }
  }

  if (!result) {
    throw lastError || new Error('Failed to get response from Gemini API');
  }

  // Extraction simple (format non-streaming)
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('No candidates in Gemini response');
  }
  
  const text = result.candidates[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('Empty text in Gemini response');
  }
  
  console.log('📥 Réponse brute de Gemini (premiers 500 chars):', text.substring(0, 500));
  console.log('📏 Taille totale de la réponse:', text.length, 'caractères');
  
  // Nettoyer la réponse pour extraire le JSON
  let jsonText = text.trim();
  
  // Supprimer les balises markdown si présentes
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }
  
  const parsedData = JSON.parse(jsonText);
  
  // Validation stricte du matchingAnalysis
  if (!parsedData.matchingAnalysis) {
    console.error('❌ matchingAnalysis manquant dans la réponse Gemini');
    console.error('📄 Réponse parsée:', JSON.stringify(parsedData, null, 2).substring(0, 500));
    throw new Error('matchingAnalysis is missing from Gemini response');
  }
  
  // Vérifier que les scores sont présents et valides
  const ma = parsedData.matchingAnalysis;
  if (typeof ma.globalScore !== 'number' || ma.globalScore === 0) {
    console.warn('⚠️ globalScore invalide ou à 0:', ma.globalScore);
  }
  if (typeof ma.skillsScore !== 'number' || ma.skillsScore === 0) {
    console.warn('⚠️ skillsScore invalide ou à 0:', ma.skillsScore);
  }
  if (typeof ma.experienceScore !== 'number' || ma.experienceScore === 0) {
    console.warn('⚠️ experienceScore invalide ou à 0:', ma.experienceScore);
  }
  
  console.log('✅ matchingAnalysis validé:', {
    globalScore: ma.globalScore,
    skillsScore: ma.skillsScore,
    experienceScore: ma.experienceScore,
    educationScore: ma.educationScore,
    matchedSkills: ma.matchedSkills?.length || 0,
    missingSkills: ma.missingSkills?.length || 0
  });
  
  return parsedData;
}

// Fonction helper pour diviser un tableau en chunks
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Analyser un seul CV (fonction helper)
async function analyzeSingleCV(candidateId, jobId, jobPost, partnerId) {
  try {
    console.log(`📄 Analyse du candidat ${candidateId} pour le job ${jobId}`);
    
    // Vérifier que jobPost est bien défini
    if (!jobPost) {
      console.error('❌ JobPost est undefined dans analyzeSingleCV');
      return {
        candidateId,
        status: 'failed',
        error: 'JobPost is undefined'
      };
    }

    console.log(`✅ JobPost trouvé: ${jobPost.title} (ID: ${jobPost._id})`);

    const candidate = await Candidate.findOne({ 
      _id: candidateId, 
      jobPostId: jobId,
      partnerId 
    });
    
    if (!candidate) {
      console.error(`❌ Candidat ${candidateId} non trouvé`);
      return {
        candidateId,
        status: 'failed',
        error: 'Candidate not found'
      };
    }
    
    console.log(`✅ Candidat trouvé: ${candidate.originalFileName}`);
    
    // Extraire le texte du CV
    const filePath = path.join(__dirname, '../../uploads/cvs', path.basename(candidate.originalFileUrl));
    let cvText;
    
    if (candidate.fileType === 'pdf') {
      cvText = await extractTextFromPDF(filePath);
    } else {
      cvText = await extractTextFromWord(filePath);
    }
    
    console.log(`✅ Texte extrait: ${cvText.length} caractères`);
    
    // Analyser avec Gemini
    const analysisData = await analyzeCVWithGemini(cvText, jobPost);
    
    // Mettre à jour le candidat
    candidate.cvData = {
      personalInfo: analysisData.personalInfo,
      professionalSummary: analysisData.professionalSummary,
      experiences: analysisData.experiences,
      education: analysisData.education,
      skills: analysisData.skills,
      languages: analysisData.languages,
      certifications: analysisData.certifications || [],
      projects: analysisData.projects || [],
      references: analysisData.references || []
    };
    
    candidate.matchingAnalysis = {
      ...analysisData.matchingAnalysis,
      analyzedAt: new Date()
    };
    
    await candidate.save();
    
    // Notification si score élevé
    if (analysisData.matchingAnalysis.globalScore >= 80) {
      await Notification.createNotification({
        partnerId,
        type: 'high_score_candidate',
        title: 'Candidat à fort potentiel',
        message: `Un candidat avec un score de ${analysisData.matchingAnalysis.globalScore}% pour "${jobPost.title}"`,
        priority: 'high',
        data: {
          jobPostId: jobPost._id,
          candidateId: candidate._id,
          score: analysisData.matchingAnalysis.globalScore
        },
        actionUrl: `/jobs/${jobPost._id}/candidates/${candidate._id}`
      });
    }
    
    return {
      candidateId,
      status: 'success',
      score: analysisData.matchingAnalysis.globalScore
    };
    
  } catch (error) {
    console.error(`Error analyzing candidate ${candidateId}:`, error);
    return {
      candidateId,
      status: 'failed',
      error: error.message
    };
  }
}

// Analyser les CV avec IA (traitement par batch de 5)
exports.analyzeCVs = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { candidateIds } = req.body;
    const partnerId = req.partner.id;
    
    console.log(`🎯 Début de l'analyse pour le job ${jobId}, partner ${partnerId}`);
    
    // Vérifier que le job appartient au partner
    const jobPost = await JobPost.findOne({ _id: jobId, partnerId });
    
    if (!jobPost) {
      console.error(`❌ Job post ${jobId} non trouvé pour le partner ${partnerId}`);
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    console.log(`✅ Job post trouvé: "${jobPost.title}"`);
    console.log(`📊 Compétences requises: ${jobPost.requiredSkills?.length || 0}`);
    console.log(`📊 Compétences optionnelles: ${jobPost.optionalSkills?.length || 0}`);
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'candidateIds array is required'
      });
    }
    
    const results = [];
    const BATCH_SIZE = 5; // Traiter 5 CV en parallèle
    const batches = chunkArray(candidateIds, BATCH_SIZE);
    
    console.log(`🚀 Analyse de ${candidateIds.length} CV en ${batches.length} batch(s) de ${BATCH_SIZE}`);
    
    // Traiter chaque batch en parallèle
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Traitement du batch ${i + 1}/${batches.length} (${batch.length} CV)`);
      
      // Analyser tous les CV du batch en parallèle
      const batchResults = await Promise.all(
        batch.map(candidateId => analyzeSingleCV(candidateId, jobId, jobPost, partnerId))
      );
      
      results.push(...batchResults);
      
      // Pause de 4 secondes entre chaque batch (respecter les 15 RPM de Gemini)
      if (i < batches.length - 1) {
        console.log('⏳ Pause de 4 secondes avant le prochain batch...');
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }
    
    // Compter les succès et échecs
    const analyzed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Analyse terminée: ${analyzed} succès, ${failed} échecs`);
    
    return res.status(200).json({
      success: true,
      message: `Analysis completed: ${analyzed} successful, ${failed} failed`,
      data: {
        analyzed,
        failed,
        results
      }
    });
  } catch (error) {
    console.error('Error analyzing CVs:', error);
    return res.status(500).json({
      success: false,
      error: 'Error analyzing CVs',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer tous les candidats d'un partner (tous jobs confondus)
exports.getAllCandidates = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const {
      status,
      page = 1,
      limit = 20,
      minScore,
      maxScore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      skills,
      search
    } = req.query;
    
    // Construire le filtre
    const filter = { partnerId };
    
    if (status) {
      filter.status = status;
    }
    
    if (minScore || maxScore) {
      filter['matchingAnalysis.globalScore'] = {};
      if (minScore) filter['matchingAnalysis.globalScore'].$gte = parseInt(minScore);
      if (maxScore) filter['matchingAnalysis.globalScore'].$lte = parseInt(maxScore);
    }
    
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filter['matchingAnalysis.matchedSkills'] = { $in: skillsArray };
    }
    
    // Recherche textuelle (nom, email)
    if (search) {
      filter.$or = [
        { 'cvData.personalInfo.fullName': { $regex: search, $options: 'i' } },
        { 'cvData.personalInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Requête
    const [candidates, total, stats] = await Promise.all([
      Candidate.find(filter)
        .populate('jobPostId', 'title company location')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-cvData.references -notes'),
      
      Candidate.countDocuments(filter),
      
      Candidate.aggregate([
        { $match: { partnerId } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$matchingAnalysis.globalScore' },
            totalCandidates: { $sum: 1 },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            reviewedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] }
            },
            shortlistedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] }
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            }
          }
        }
      ])
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        stats: stats[0] || {
          avgScore: 0,
          totalCandidates: 0,
          pendingCount: 0,
          reviewedCount: 0,
          shortlistedCount: 0,
          rejectedCount: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all candidates:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching candidates',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer les candidats d'une offre
exports.getCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;
    const partnerId = req.partner.id;
    const {
      status,
      page = 1,
      limit = 20,
      minScore,
      maxScore,
      sortBy = 'matchingAnalysis.globalScore',
      sortOrder = 'desc',
      skills
    } = req.query;
    
    // Vérifier que le job appartient au partner
    const jobPost = await JobPost.findOne({ _id: jobId, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    // Construire le filtre
    const filter = { jobPostId: jobId, partnerId };
    
    if (status) {
      filter.status = status;
    }
    
    if (minScore || maxScore) {
      filter['matchingAnalysis.globalScore'] = {};
      if (minScore) filter['matchingAnalysis.globalScore'].$gte = parseInt(minScore);
      if (maxScore) filter['matchingAnalysis.globalScore'].$lte = parseInt(maxScore);
    }
    
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filter['matchingAnalysis.matchedSkills'] = { $in: skillsArray };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Requête
    const [candidates, total, averageScore] = await Promise.all([
      Candidate.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-cvData.references -notes'),
      
      Candidate.countDocuments(filter),
      
      Candidate.aggregate([
        { $match: filter },
        { $group: { _id: null, avgScore: { $avg: '$matchingAnalysis.globalScore' } } }
      ])
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        averageScore: averageScore[0]?.avgScore || 0
      }
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching candidates',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer un candidat spécifique
exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const candidate = await Candidate.findOne({ _id: id, partnerId })
      .populate('jobPostId', 'title company');
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    // Marquer comme vu
    await candidate.markAsViewed();
    
    return res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching candidate',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Changer le statut d'un candidat
exports.updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const partnerId = req.partner.id;
    
    const candidate = await Candidate.findOne({ _id: id, partnerId });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    await candidate.changeStatus(status, partnerId, notes);
    
    return res.status(200).json({
      success: true,
      message: 'Candidate status updated successfully',
      data: candidate
    });
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating candidate status',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Ajouter une note
exports.addCandidateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const partnerId = req.partner.id;
    
    const candidate = await Candidate.findOne({ _id: id, partnerId });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    await candidate.addNote(note, partnerId);
    
    return res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: candidate
    });
  } catch (error) {
    console.error('Error adding note:', error);
    return res.status(500).json({
      success: false,
      error: 'Error adding note',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Supprimer un candidat
exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const candidate = await Candidate.findOne({ _id: id, partnerId });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    // Supprimer le fichier CV
    const filePath = path.join(__dirname, '../../uploads/cvs', path.basename(candidate.originalFileUrl));
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting CV file:', error);
    }
    
    await candidate.deleteOne();
    
    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting candidate',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Télécharger le CV original
exports.downloadCV = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const candidate = await Candidate.findOne({ _id: id, partnerId });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }
    
    const filePath = path.join(__dirname, '../../uploads/cvs', path.basename(candidate.originalFileUrl));
    
    res.download(filePath, candidate.originalFileName);
  } catch (error) {
    console.error('Error downloading CV:', error);
    return res.status(500).json({
      success: false,
      error: 'Error downloading CV',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

module.exports = exports;
