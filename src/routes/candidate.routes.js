const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidate.controller');
const { authenticatePartner } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification partner
router.use(authenticatePartner);

// Upload et analyse
router.post('/job-posts/:jobId/upload-cvs', candidateController.uploadCVs);
router.post('/job-posts/:jobId/analyze-cvs', candidateController.analyzeCVs);

// Gestion des candidats
router.get('/job-posts/:jobId/candidates', candidateController.getCandidates);
router.get('/candidates/:id', candidateController.getCandidateById);
router.put('/candidates/:id/status', candidateController.updateCandidateStatus);
router.post('/candidates/:id/notes', candidateController.addCandidateNote);
router.delete('/candidates/:id', candidateController.deleteCandidate);

// Téléchargement CV
router.get('/candidates/:id/download-cv', candidateController.downloadCV);

module.exports = router;
