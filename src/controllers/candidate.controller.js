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
  const prompt = `
Tu es un expert en recrutement. Analyse ce CV et extrais les informations structurées suivantes au format JSON.

CV:
${cvText}

OFFRE D'EMPLOI:
Titre: ${jobPost.title}
Compétences requises: ${jobPost.requiredSkills.join(', ')}
Compétences optionnelles: ${jobPost.optionalSkills.join(', ')}
Expérience: ${jobPost.experience}
Éducation: ${jobPost.education.join(', ')}
Années d'expérience minimum: ${jobPost.minYearsExperience}

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

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte avant ou après.
`;

  // Appel API Gemini (non-streaming, optimisé backend)
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
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  
  // Extraction simple (format non-streaming)
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('No candidates in Gemini response');
  }
  
  const text = result.candidates[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('Empty text in Gemini response');
  }
  
  // Nettoyer la réponse pour extraire le JSON
  let jsonText = text.trim();
  
  // Supprimer les balises markdown si présentes
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }
  
  const parsedData = JSON.parse(jsonText);
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
    const candidate = await Candidate.findOne({ 
      _id: candidateId, 
      jobPostId: jobId,
      partnerId 
    });
    
    if (!candidate) {
      return {
        candidateId,
        status: 'failed',
        error: 'Candidate not found'
      };
    }
    
    // Extraire le texte du CV
    const filePath = path.join(__dirname, '../../uploads/cvs', path.basename(candidate.originalFileUrl));
    let cvText;
    
    if (candidate.fileType === 'pdf') {
      cvText = await extractTextFromPDF(filePath);
    } else {
      cvText = await extractTextFromWord(filePath);
    }
    
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
    
    // Vérifier que le job appartient au partner
    const jobPost = await JobPost.findOne({ _id: jobId, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
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
