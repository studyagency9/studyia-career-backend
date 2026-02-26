const JobPost = require('../models/jobPost.model');
const Candidate = require('../models/candidate.model');
const Notification = require('../models/notification.model');

// Créer une nouvelle offre d'emploi
exports.createJobPost = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.create({
      ...req.body,
      partnerId,
      status: 'draft'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Job post created successfully',
      data: jobPost
    });
  } catch (error) {
    console.error('Error creating job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error creating job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer toutes les offres du partenaire
exports.getJobPosts = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { 
      status, 
      page = 1, 
      limit = 20, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Construire le filtre
    const filter = { partnerId };
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Requête
    const [jobPosts, total] = await Promise.all([
      JobPost.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      JobPost.countDocuments(filter)
    ]);
    
    // Enrichir avec le nombre de candidatures
    const jobPostsWithStats = await Promise.all(
      jobPosts.map(async (job) => {
        const candidateCount = await Candidate.countDocuments({ jobPostId: job._id });
        const newCandidateCount = await Candidate.countDocuments({ 
          jobPostId: job._id, 
          status: 'new' 
        });
        
        return {
          ...job.toObject(),
          stats: {
            totalCandidates: candidateCount,
            newCandidates: newCandidateCount
          }
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      data: {
        jobPosts: jobPostsWithStats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching job posts:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching job posts',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Récupérer une offre spécifique
exports.getJobPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    // Statistiques détaillées
    const [
      totalCandidates,
      newCandidates,
      reviewedCandidates,
      shortlistedCandidates,
      rejectedCandidates,
      averageScore
    ] = await Promise.all([
      Candidate.countDocuments({ jobPostId: id }),
      Candidate.countDocuments({ jobPostId: id, status: 'new' }),
      Candidate.countDocuments({ jobPostId: id, status: 'reviewed' }),
      Candidate.countDocuments({ jobPostId: id, status: 'shortlisted' }),
      Candidate.countDocuments({ jobPostId: id, status: 'rejected' }),
      Candidate.aggregate([
        { $match: { jobPostId: jobPost._id, 'matchingAnalysis.globalScore': { $exists: true } } },
        { $group: { _id: null, avgScore: { $avg: '$matchingAnalysis.globalScore' } } }
      ])
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        jobPost: jobPost.toObject(),
        stats: {
          totalCandidates,
          newCandidates,
          reviewedCandidates,
          shortlistedCandidates,
          rejectedCandidates,
          averageScore: averageScore[0]?.avgScore || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Mettre à jour une offre
exports.updateJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOneAndUpdate(
      { _id: id, partnerId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Job post updated successfully',
      data: jobPost
    });
  } catch (error) {
    console.error('Error updating job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Supprimer une offre
exports.deleteJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    // Vérifier s'il y a des candidatures
    const candidateCount = await Candidate.countDocuments({ jobPostId: id });
    
    if (candidateCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete job post with existing candidates. Archive it instead.',
        candidateCount
      });
    }
    
    const jobPost = await JobPost.findOneAndDelete({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Job post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Publier une offre
exports.publishJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    await jobPost.publish();
    
    // Créer une notification
    await Notification.createNotification({
      partnerId,
      type: 'job_published',
      title: 'Offre publiée',
      message: `Votre offre "${jobPost.title}" a été publiée avec succès`,
      priority: 'medium',
      data: {
        jobPostId: jobPost._id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Job post published successfully',
      data: jobPost
    });
  } catch (error) {
    console.error('Error publishing job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error publishing job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Fermer une offre
exports.closeJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    await jobPost.close();
    
    // Créer une notification
    await Notification.createNotification({
      partnerId,
      type: 'job_closed',
      title: 'Offre fermée',
      message: `Votre offre "${jobPost.title}" a été fermée`,
      priority: 'low',
      data: {
        jobPostId: jobPost._id
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Job post closed successfully',
      data: jobPost
    });
  } catch (error) {
    console.error('Error closing job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error closing job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Archiver une offre
exports.archiveJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    await jobPost.archive();
    
    return res.status(200).json({
      success: true,
      message: 'Job post archived successfully',
      data: jobPost
    });
  } catch (error) {
    console.error('Error archiving job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error archiving job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Dupliquer une offre
exports.duplicateJobPost = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const originalJobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!originalJobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    // Créer une copie
    const jobPostData = originalJobPost.toObject();
    delete jobPostData._id;
    delete jobPostData.createdAt;
    delete jobPostData.updatedAt;
    delete jobPostData.publishedAt;
    delete jobPostData.closedAt;
    delete jobPostData.viewCount;
    delete jobPostData.applicationCount;
    
    jobPostData.title = `${jobPostData.title} (Copie)`;
    jobPostData.status = 'draft';
    
    const newJobPost = await JobPost.create(jobPostData);
    
    return res.status(201).json({
      success: true,
      message: 'Job post duplicated successfully',
      data: newJobPost
    });
  } catch (error) {
    console.error('Error duplicating job post:', error);
    return res.status(500).json({
      success: false,
      error: 'Error duplicating job post',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Obtenir les statistiques d'une offre
exports.getJobPostStats = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.partner.id;
    
    const jobPost = await JobPost.findOne({ _id: id, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    
    // Statistiques détaillées
    const [
      totalCandidates,
      statusBreakdown,
      scoreDistribution,
      applicationsByDay,
      topCandidates
    ] = await Promise.all([
      Candidate.countDocuments({ jobPostId: id }),
      
      Candidate.aggregate([
        { $match: { jobPostId: jobPost._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      Candidate.aggregate([
        { $match: { jobPostId: jobPost._id, 'matchingAnalysis.globalScore': { $exists: true } } },
        {
          $bucket: {
            groupBy: '$matchingAnalysis.globalScore',
            boundaries: [0, 20, 40, 60, 80, 100],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      
      Candidate.aggregate([
        { $match: { jobPostId: jobPost._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      
      Candidate.find({ jobPostId: id })
        .sort({ 'matchingAnalysis.globalScore': -1 })
        .limit(5)
        .select('cvData.personalInfo matchingAnalysis.globalScore status')
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        scoreDistribution,
        applicationsByDay: applicationsByDay.map(item => ({
          date: item._id,
          count: item.count
        })),
        topCandidates,
        viewCount: jobPost.viewCount
      }
    });
  } catch (error) {
    console.error('Error fetching job post stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching job post stats',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
