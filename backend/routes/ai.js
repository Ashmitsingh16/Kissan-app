const express = require('express');
const router = express.Router();
const { protect, farmerOnly } = require('../middleware/auth');
const { predictHarvestDate, getStrawSellingAdvice, getCropRecommendations } = require('../config/gemini');
const Farm = require('../models/Farm');

// @route   POST /api/ai/predict-harvest
// @desc    Predict harvest date for a crop
// @access  Private (Farmers only)
router.post('/predict-harvest', protect, farmerOnly, async (req, res) => {
  try {
    const { farmId, cropId } = req.body;

    // Get farm and crop details
    const farm = await Farm.findOne({ _id: farmId, farmer: req.user._id });
    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const crop = farm.crops.id(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    const cropData = {
      cropName: crop.cropName,
      cropType: crop.cropType,
      sowingDate: crop.sowingDate,
      state: farm.location.state,
      district: farm.location.district,
      soilType: farm.soilType,
      irrigationType: farm.irrigationType,
      areaUnderCrop: crop.areaUnderCrop,
      areaUnit: farm.areaUnit
    };

    const prediction = await predictHarvestDate(cropData);

    // Update crop with predicted harvest date
    if (prediction.expectedHarvestDate) {
      crop.expectedHarvestDate = new Date(prediction.expectedHarvestDate);
      await farm.save();
    }

    res.json({
      success: true,
      prediction,
      crop: {
        cropName: crop.cropName,
        sowingDate: crop.sowingDate,
        expectedHarvestDate: prediction.expectedHarvestDate
      }
    });
  } catch (error) {
    console.error('AI Prediction Error:', error);
    res.status(500).json({ message: 'Failed to get prediction', error: error.message });
  }
});

// @route   POST /api/ai/straw-advice
// @desc    Get advice for straw selling
// @access  Private (Farmers only)
router.post('/straw-advice', protect, farmerOnly, async (req, res) => {
  try {
    const { cropType, quantity, quantityUnit, farmId } = req.body;

    const farm = await Farm.findOne({ _id: farmId, farmer: req.user._id });
    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const strawData = {
      cropType,
      quantity,
      quantityUnit,
      state: farm.location.state
    };

    const advice = await getStrawSellingAdvice(strawData);

    res.json({
      success: true,
      advice
    });
  } catch (error) {
    console.error('AI Advice Error:', error);
    res.status(500).json({ message: 'Failed to get advice', error: error.message });
  }
});

// @route   POST /api/ai/crop-recommendations
// @desc    Get crop recommendations for a farm
// @access  Private (Farmers only)
router.post('/crop-recommendations', protect, farmerOnly, async (req, res) => {
  try {
    const { farmId } = req.body;

    const farm = await Farm.findOne({ _id: farmId, farmer: req.user._id });
    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const farmData = {
      state: farm.location.state,
      district: farm.location.district,
      soilType: farm.soilType,
      irrigationType: farm.irrigationType,
      totalArea: farm.totalArea,
      areaUnit: farm.areaUnit
    };

    const recommendations = await getCropRecommendations(farmData);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({ message: 'Failed to get recommendations', error: error.message });
  }
});

module.exports = router;
