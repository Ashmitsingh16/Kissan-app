const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateContent(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

async function predictHarvestDate(cropData) {
  const prompt = `You are an agricultural expert AI assistant. Based on the following crop information, predict the expected harvest date and provide farming recommendations.

Crop Details:
- Crop Name: ${cropData.cropName}
- Crop Type/Season: ${cropData.cropType}
- Sowing Date: ${cropData.sowingDate}
- Location (State): ${cropData.state}
- District: ${cropData.district}
- Soil Type: ${cropData.soilType || 'Not specified'}
- Irrigation Type: ${cropData.irrigationType || 'Not specified'}
- Area Under Crop: ${cropData.areaUnderCrop} ${cropData.areaUnit || 'acres'}

Please provide your response in the following JSON format only (no markdown, no code blocks, just pure JSON):
{
  "expectedHarvestDate": "YYYY-MM-DD",
  "daysToHarvest": <number>,
  "confidenceLevel": "high/medium/low",
  "growthStage": "current stage of crop",
  "estimatedYield": "<number> quintals per acre",
  "recommendations": [
    "recommendation 1",
    "recommendation 2",
    "recommendation 3"
  ],
  "warnings": [
    "any weather or pest warnings if applicable"
  ],
  "bestPractices": [
    "practice 1",
    "practice 2"
  ]
}`;

  try {
    const response = await generateContent(prompt);
    // Clean the response - remove any markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    return JSON.parse(cleanedResponse.trim());
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse AI response');
  }
}

async function getStrawSellingAdvice(strawData) {
  const prompt = `You are an agricultural market expert. Provide advice for a farmer selling crop straw.

Straw Details:
- Crop Type: ${strawData.cropType}
- Quantity: ${strawData.quantity} ${strawData.quantityUnit}
- Location (State): ${strawData.state}
- Current Month: ${new Date().toLocaleString('en-IN', { month: 'long' })}

Provide your response in the following JSON format only (no markdown, no code blocks, just pure JSON):
{
  "marketAnalysis": "brief market analysis",
  "priceRange": {
    "min": <number in INR per quintal>,
    "max": <number in INR per quintal>,
    "average": <number in INR per quintal>
  },
  "bestTimeToSell": "advice on timing",
  "storageAdvice": "how to store straw if needed",
  "environmentalBenefit": "benefit of selling vs burning",
  "tips": [
    "tip 1",
    "tip 2"
  ]
}`;

  try {
    const response = await generateContent(prompt);
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    return JSON.parse(cleanedResponse.trim());
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse AI response');
  }
}

async function getCropRecommendations(farmData) {
  const prompt = `You are an agricultural expert AI. Based on the farm details, suggest the best crops to grow.

Farm Details:
- Location (State): ${farmData.state}
- District: ${farmData.district}
- Soil Type: ${farmData.soilType || 'Not specified'}
- Irrigation Type: ${farmData.irrigationType || 'Not specified'}
- Total Area: ${farmData.totalArea} ${farmData.areaUnit}
- Current Season: ${getCurrentSeason()}
- Current Month: ${new Date().toLocaleString('en-IN', { month: 'long' })}

Provide your response in the following JSON format only (no markdown, no code blocks, just pure JSON):
{
  "recommendedCrops": [
    {
      "cropName": "crop name",
      "season": "kharif/rabi/zaid",
      "sowingWindow": "best time to sow",
      "expectedYield": "yield per acre",
      "waterRequirement": "low/medium/high",
      "profitPotential": "low/medium/high",
      "reason": "why this crop suits the farm"
    }
  ],
  "soilHealthTips": [
    "tip 1",
    "tip 2"
  ],
  "seasonalAdvice": "advice for current season"
}`;

  try {
    const response = await generateContent(prompt);
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    return JSON.parse(cleanedResponse.trim());
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse AI response');
  }
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return 'Kharif (Monsoon)';
  if (month >= 10 || month <= 2) return 'Rabi (Winter)';
  return 'Zaid (Summer)';
}

module.exports = {
  generateContent,
  predictHarvestDate,
  getStrawSellingAdvice,
  getCropRecommendations
};
