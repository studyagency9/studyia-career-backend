const gmailService = require('../services/gmail.service');
const Candidate = require('../models/candidate.model');
const JobPost = require('../models/jobPost.model');
const fs = require('fs').promises;
const path = require('path');

exports.getAuthUrl = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const authUrl = gmailService.generateAuthUrl(partnerId);
    
    return res.status(200).json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('[Gmail] Error generating auth URL:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
};

exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/pro/gmail/error?reason=no_code`);
    }

    const tokens = await gmailService.exchangeCodeForTokens(code);
    const email = await gmailService.getUserEmail(tokens.access_token);
    
    const partnerId = state || req.session?.partnerId;
    
    if (!partnerId) {
      return res.redirect(`${process.env.FRONTEND_URL}/pro/gmail/error?reason=no_partner`);
    }

    await gmailService.saveTokens(partnerId, tokens, email);
    
    console.log('[Gmail] Connexion réussie:', email);
    
    return res.redirect(`${process.env.FRONTEND_URL}/pro/gmail/success`);
  } catch (error) {
    console.error('[Gmail] Error in callback:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/pro/gmail/error?reason=auth_failed`);
  }
};

exports.getStatus = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const status = await gmailService.getStatus(partnerId);
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[Gmail] Error getting status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get Gmail status'
    });
  }
};

exports.listEmails = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { maxResults, query, pageToken } = req.query;
    
    const result = await gmailService.listEmails(
      partnerId,
      maxResults,
      query,
      pageToken
    );
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Gmail] Error listing emails:', error);
    
    if (error.message === 'Gmail not connected') {
      return res.status(401).json({
        success: false,
        error: 'Gmail not connected. Please connect your Gmail account first.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to list emails'
    });
  }
};

exports.getAttachment = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { messageId, attachmentId } = req.params;
    
    const buffer = await gmailService.getAttachment(partnerId, messageId, attachmentId);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    return res.send(buffer);
  } catch (error) {
    console.error('[Gmail] Error getting attachment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download attachment'
    });
  }
};

exports.importToJob = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { jobPostId, attachments } = req.body;
    
    if (!jobPostId || !attachments || !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        error: 'jobPostId and attachments array are required'
      });
    }

    const jobPost = await JobPost.findOne({ _id: jobPostId, partnerId });
    
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }

    const results = [];
    let imported = 0;
    let failed = 0;

    for (const attachment of attachments) {
      try {
        const { messageId, attachmentId, filename, senderEmail } = attachment;
        
        const buffer = await gmailService.getAttachment(partnerId, messageId, attachmentId);
        
        const uploadDir = path.join(__dirname, '../../uploads/cvs');
        await fs.mkdir(uploadDir, { recursive: true });
        
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        
        await fs.writeFile(filePath, buffer);
        
        const fileExtension = path.extname(filename).toLowerCase().replace('.', '');
        const fileType = fileExtension === 'docx' || fileExtension === 'doc' ? 'docx' : fileExtension;
        
        const candidate = new Candidate({
          jobPostId,
          partnerId,
          originalFileName: filename,
          originalFileUrl: `uploads/cvs/${uniqueFilename}`,
          fileSize: buffer.length,
          fileType: fileType,
          cvData: {
            personalInfo: {
              email: senderEmail
            }
          },
          status: 'new',
          pipelineStage: 'new'
        });
        
        await candidate.save();
        
        console.log('[Gmail] Import:', { jobPostId, filename, candidateId: candidate._id });
        
        results.push({
          filename,
          status: 'success',
          candidateId: candidate._id
        });
        
        imported++;
      } catch (error) {
        console.error('[Gmail] Error importing attachment:', error);
        results.push({
          filename: attachment.filename,
          status: 'failed',
          error: error.message
        });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        imported,
        failed,
        results
      }
    });
  } catch (error) {
    console.error('[Gmail] Error in import:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to import CVs'
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    
    await gmailService.disconnect(partnerId);
    
    return res.status(200).json({
      success: true,
      message: 'Gmail déconnecté'
    });
  } catch (error) {
    console.error('[Gmail] Error disconnecting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disconnect Gmail'
    });
  }
};
