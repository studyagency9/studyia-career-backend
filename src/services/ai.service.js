const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Call OpenRouter API for CV analysis
exports.analyzeCV = async (cvText) => {
  try {
    const systemPrompt = `
      Analyze a CV and extract the information in a structured JSON format with the following fields:
      - personalInfo (firstName, lastName, email, phone, city, country, summary)
      - targetJob (string)
      - experiences (array of objects with title, company, location, startDate, endDate, current, description)
      - education (array of objects with degree, school, location, startDate, endDate, description)
      - skills (array of strings)
      
      Make sure to extract as much information as possible from the CV text.
      Return ONLY the JSON object without any additional text.
    `;
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cvText }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'Studyia Career CV Builder'
        }
      }
    );
    
    // Extract the AI response
    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      // Find JSON in the response (in case the AI added extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.response?.data || error.message);
    throw new Error('Failed to analyze CV with AI');
  }
};

// Call OpenRouter API for CV optimization
exports.optimizeCV = async (cvData) => {
  try {
    const systemPrompt = `
      You are a professional CV optimization expert. Your task is to improve the provided CV data.
      Focus on:
      1. Enhancing the professional summary to be more impactful
      2. Improving experience descriptions to highlight achievements and use action verbs
      3. Optimizing skills to match the target job
      
      Return the optimized CV data in the same JSON structure as the input, along with an array of improvements made.
    `;
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(cvData) }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'Studyia Career CV Builder'
        }
      }
    );
    
    // Extract the AI response
    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the JSON response
    try {
      // Find JSON in the response (in case the AI added extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.response?.data || error.message);
    throw new Error('Failed to optimize CV with AI');
  }
};
