const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Farm = require('../models/Farm');
const { protect, farmerOnly } = require('../middleware/auth');

// Indian states list
const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// @route   POST /api/farms
// @desc    Register a new farm
// @access  Private (Farmers only)
router.post('/', protect, farmerOnly, [
  body('farmName').trim().notEmpty().withMessage('Farm name is required'),
  body('location.state').isIn(indianStates).withMessage('Select a valid Indian state'),
  body('location.district').trim().notEmpty().withMessage('District is required'),
  body('totalArea').isFloat({ min: 0.1 }).withMessage('Total area must be greater than 0'),
  body('areaUnit').isIn(['acres', 'hectares', 'bigha']).withMessage('Invalid area unit')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farm = await Farm.create({
      farmer: req.user._id,
      ...req.body
    });

    res.status(201).json(farm);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/farms
// @desc    Get all farms for logged in farmer
// @access  Private (Farmers only)
router.get('/', protect, farmerOnly, async (req, res) => {
  try {
    const farms = await Farm.find({ farmer: req.user._id, isActive: true });
    res.json(farms);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/farms/states
// @desc    Get list of Indian states
// @access  Public
router.get('/states', (req, res) => {
  res.json(indianStates);
});

// @route   GET /api/farms/:id
// @desc    Get single farm by ID
// @access  Private (Farmers only)
router.get('/:id', protect, farmerOnly, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    res.json(farm);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/farms/:id
// @desc    Update farm details
// @access  Private (Farmers only)
router.put('/:id', protect, farmerOnly, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const updatedFarm = await Farm.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json(updatedFarm);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/farms/:id/crops
// @desc    Add a crop to farm
// @access  Private (Farmers only)
router.post('/:id/crops', protect, farmerOnly, [
  body('cropName').trim().notEmpty().withMessage('Crop name is required'),
  body('cropType').isIn(['kharif', 'rabi', 'zaid']).withMessage('Invalid crop type'),
  body('sowingDate').isISO8601().withMessage('Invalid sowing date'),
  body('areaUnderCrop').isFloat({ min: 0.1 }).withMessage('Area under crop must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farm = await Farm.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    farm.crops.push(req.body);
    await farm.save();

    res.status(201).json(farm);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/farms/:farmId/crops/:cropId
// @desc    Update crop status
// @access  Private (Farmers only)
router.put('/:farmId/crops/:cropId', protect, farmerOnly, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.farmId, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const crop = farm.crops.id(req.params.cropId);

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    Object.assign(crop, req.body);
    await farm.save();

    res.json(farm);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/farms/:id
// @desc    Delete (deactivate) a farm
// @access  Private (Farmers only)
router.delete('/:id', protect, farmerOnly, async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, farmer: req.user._id });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    farm.isActive = false;
    await farm.save();

    res.json({ message: 'Farm removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
