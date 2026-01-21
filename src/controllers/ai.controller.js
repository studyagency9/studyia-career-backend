const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const aiService = require('../services/ai.service');
const pdfParse = require('pdf-parse');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to extract text from PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const readFile = promisify(fs.readFile);
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Analyze uploaded CV
exports.analyzeCV = async (req, res) => {
  try {
    // Handle file upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 5MB'
          });
        }
        
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      try {
        // Extract text from PDF
        const filePath = req.file.path;
        const cvText = await extractTextFromPDF(filePath);
        
        // Analyze CV with AI
        const analyzedData = await aiService.analyzeCV(cvText);
        
        // Clean up uploaded file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
        
        return res.status(200).json({
          success: true,
          data: analyzedData
        });
      } catch (error) {
        // Clean up uploaded file in case of error
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
        
        console.error('Error analyzing CV:', error);
        return res.status(503).json({
          success: false,
          error: 'AI service unavailable'
        });
      }
    });
  } catch (error) {
    console.error('Error in analyzeCV controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while analyzing CV'
    });
  }
};

// Optimize existing CV
exports.optimizeCV = async (req, res) => {
  try {
    const { cvData } = req.body;
    
    if (!cvData) {
      return res.status(400).json({
        success: false,
        error: 'CV data is required'
      });
    }
    
    // Optimize CV with AI
    const optimizedData = await aiService.optimizeCV(cvData);
    
    return res.status(200).json({
      success: true,
      data: optimizedData
    });
  } catch (error) {
    console.error('Error optimizing CV:', error);
    return res.status(503).json({
      success: false,
      error: 'AI service unavailable'
    });
  }
};
