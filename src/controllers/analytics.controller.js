const JobPost = require('../models/jobPost.model');
const Candidate = require('../models/candidate.model');

// Dashboard général du partenaire
exports.getDashboard = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { period = 'month' } = req.query;
    
    // Calculer la date de début selon la période
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    // Statistiques générales
    const [
      totalJobPosts,
      activeJobPosts,
      totalApplications,
      newApplications,
      shortlistedCandidates,
      averageScore,
      topPerformingJobs,
      applicationTrend
    ] = await Promise.all([
      // Total des offres
      JobPost.countDocuments({ partnerId }),
      
      // Offres actives
      JobPost.countDocuments({ partnerId, status: 'active' }),
      
      // Total candidatures
      Candidate.countDocuments({ partnerId }),
      
      // Nouvelles candidatures
      Candidate.countDocuments({ 
        partnerId, 
        status: 'new',
        createdAt: { $gte: startDate }
      }),
      
      // Candidats shortlistés
      Candidate.countDocuments({ 
        partnerId, 
        status: 'shortlisted'
      }),
      
      // Score moyen
      Candidate.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            'matchingAnalysis.globalScore': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$matchingAnalysis.globalScore' }
          }
        }
      ]),
      
      // Top 5 offres avec le plus de candidatures
      JobPost.aggregate([
        { $match: { partnerId: partnerId } },
        {
          $lookup: {
            from: 'candidates',
            localField: '_id',
            foreignField: 'jobPostId',
            as: 'candidates'
          }
        },
        {
          $project: {
            title: 1,
            company: 1,
            status: 1,
            candidateCount: { $size: '$candidates' },
            createdAt: 1
          }
        },
        { $sort: { candidateCount: -1 } },
        { $limit: 5 }
      ]),
      
      // Tendance des candidatures (30 derniers jours)
      Candidate.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        totalJobPosts,
        activeJobPosts,
        totalApplications,
        newApplications,
        shortlistedCandidates,
        averageScore: averageScore[0]?.avgScore || 0,
        topPerformingJobs,
        applicationTrend: applicationTrend.map(item => ({
          date: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Statistiques sur les compétences
exports.getSkillsAnalytics = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    // Compétences les plus demandées
    const mostDemandedSkills = await JobPost.aggregate([
      { 
        $match: { 
          partnerId: partnerId,
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$requiredSkills' },
      {
        $group: {
          _id: '$requiredSkills',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          skill: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Compétences les plus difficiles à trouver (faible taux de match)
    const hardestToFindSkills = await JobPost.aggregate([
      { 
        $match: { 
          partnerId: partnerId,
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$requiredSkills' },
      {
        $lookup: {
          from: 'candidates',
          let: { jobId: '$_id', skill: '$requiredSkills' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$jobPostId', '$$jobId'] },
                    { $in: ['$$skill', '$matchingAnalysis.matchedSkills'] }
                  ]
                }
              }
            }
          ],
          as: 'matchedCandidates'
        }
      },
      {
        $lookup: {
          from: 'candidates',
          localField: '_id',
          foreignField: 'jobPostId',
          as: 'allCandidates'
        }
      },
      {
        $project: {
          skill: '$requiredSkills',
          matchRate: {
            $cond: [
              { $gt: [{ $size: '$allCandidates' }, 0] },
              {
                $multiply: [
                  { $divide: [{ $size: '$matchedCandidates' }, { $size: '$allCandidates' }] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$skill',
          avgMatchRate: { $avg: '$matchRate' }
        }
      },
      { $sort: { avgMatchRate: 1 } },
      { $limit: 10 },
      {
        $project: {
          skill: '$_id',
          matchRate: { $round: ['$avgMatchRate', 2] },
          _id: 0
        }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        mostDemandedSkills,
        hardestToFindSkills
      }
    });
  } catch (error) {
    console.error('Error fetching skills analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching skills analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

// Statistiques sur les candidats
exports.getCandidatesAnalytics = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const [
      totalCandidates,
      candidatesByExperience,
      candidatesByEducation,
      scoreDistribution
    ] = await Promise.all([
      // Total candidats
      Candidate.countDocuments({ 
        partnerId,
        createdAt: { $gte: startDate }
      }),
      
      // Répartition par niveau d'expérience
      Candidate.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            createdAt: { $gte: startDate },
            'matchingAnalysis.yearsOfExperience': { $exists: true }
          }
        },
        {
          $bucket: {
            groupBy: '$matchingAnalysis.yearsOfExperience',
            boundaries: [0, 2, 5, 10, 20, 100],
            default: 'Unknown',
            output: {
              count: { $sum: 1 },
              level: {
                $switch: {
                  branches: [
                    { case: { $lt: ['$matchingAnalysis.yearsOfExperience', 2] }, then: 'Entry' },
                    { case: { $lt: ['$matchingAnalysis.yearsOfExperience', 5] }, then: 'Junior' },
                    { case: { $lt: ['$matchingAnalysis.yearsOfExperience', 10] }, then: 'Mid' },
                    { case: { $lt: ['$matchingAnalysis.yearsOfExperience', 20] }, then: 'Senior' }
                  ],
                  default: 'Expert'
                }
              }
            }
          }
        }
      ]),
      
      // Répartition par niveau d'éducation
      Candidate.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            createdAt: { $gte: startDate },
            'matchingAnalysis.educationLevel': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$matchingAnalysis.educationLevel',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            level: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]),
      
      // Distribution des scores
      Candidate.aggregate([
        { 
          $match: { 
            partnerId: partnerId,
            createdAt: { $gte: startDate },
            'matchingAnalysis.globalScore': { $exists: true }
          }
        },
        {
          $bucket: {
            groupBy: '$matchingAnalysis.globalScore',
            boundaries: [0, 20, 40, 60, 80, 100],
            default: 'Other',
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ])
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        candidatesByExperience,
        candidatesByEducation,
        scoreDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching candidates analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching candidates analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

module.exports = exports;
