const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Demo mode - allows any random data for testing
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Validation for Aadhar (12 digits) or PAN (10 alphanumeric)
const validateIdNumber = (value, { req }) => {
  // Skip validation in demo mode
  if (DEMO_MODE) return true;

  if (req.body.idType === 'aadhar') {
    if (!/^\d{12}$/.test(value)) {
      throw new Error('Aadhar must be 12 digits');
    }
  } else if (req.body.idType === 'pan') {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
      throw new Error('Invalid PAN format (e.g., ABCDE1234F)');
    }
  }
  return true;
};

// @route   POST /api/auth/register
// @desc    Register a new user (farmer or government)
// @access  Public
router.post('/register', [
  body('userType').isIn(['farmer', 'government']).withMessage('Invalid user type'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').custom((value) => {
    if (DEMO_MODE) return true;
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Enter valid 10-digit phone number');
    }
    return true;
  }),
  body('idType').isIn(['aadhar', 'pan']).withMessage('Select Aadhar or PAN'),
  body('idNumber').custom(validateIdNumber),
  body('email').isEmail().normalizeEmail().withMessage('Enter valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('numberOfFarms').optional().isInt({ min: 0, max: 10 }).withMessage('Number of farms must be 0-10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userType, name, phone, idType, idNumber, email, password, numberOfFarms } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if Aadhar/PAN already registered
    const idExists = await User.findOne({ idNumber });
    if (idExists) {
      return res.status(400).json({ message: 'This Aadhar/PAN is already registered' });
    }

    // Create user
    const user = await User.create({
      userType,
      name,
      phone,
      idType,
      idNumber,
      email,
      password,
      numberOfFarms: userType === 'farmer' ? (numberOfFarms || 0) : 0
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        numberOfFarms: user.numberOfFarms,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Enter valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        phone: user.phone,
        numberOfFarms: user.numberOfFarms,
        isVerified: user.isVerified,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        userType: updatedUser.userType,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/auth/bank-details
// @desc    Update bank details
// @access  Private
router.put('/bank-details', protect, [
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('ifscCode').custom((value) => {
    if (DEMO_MODE) return true;
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
      throw new Error('Invalid IFSC code');
    }
    return true;
  }),
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountHolderName').notEmpty().withMessage('Account holder name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountNumber, ifscCode, bankName, accountHolderName } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.bankDetails = {
        accountNumber,
        ifscCode,
        bankName,
        accountHolderName
      };

      await user.save();

      res.json({ message: 'Bank details updated successfully', bankDetails: user.bankDetails });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
