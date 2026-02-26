const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobPost.controller');
const { authenticatePartner } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification partner
router.use(authenticatePartner);

// CRUD de base
router.post('/', jobPostController.createJobPost);
router.get('/', jobPostController.getJobPosts);
router.get('/:id', jobPostController.getJobPostById);
router.put('/:id', jobPostController.updateJobPost);
router.delete('/:id', jobPostController.deleteJobPost);

// Actions sur les offres
router.post('/:id/publish', jobPostController.publishJobPost);
router.post('/:id/close', jobPostController.closeJobPost);
router.post('/:id/archive', jobPostController.archiveJobPost);
router.post('/:id/duplicate', jobPostController.duplicateJobPost);

// Statistiques
router.get('/:id/stats', jobPostController.getJobPostStats);

module.exports = router;
