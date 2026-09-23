const express = require('express');
const router = express.Router();
const { authIpLimiter, authAccountLimiter, resetAccountLimiter } = require('../middleware/rateLimit');
router.use(['/login', '/register', '/reset-password'], authIpLimiter);
router.use('/forgot-password', authIpLimiter);
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../config/notifications');

// Generate JWT Token
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
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
// @desc    Register a farmer (officer access is provisioned by an administrator)
// @access  Public
router.post('/register', [
  body('userType').equals('farmer').withMessage('Government accounts must be provisioned by an administrator'),
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
], authAccountLimiter, async (req, res) => {
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
        token: generateToken(user._id, user.tokenVersion)
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
], authAccountLimiter, async (req, res) => {
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
        token: generateToken(user._id, user.tokenVersion)
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
        token: generateToken(updatedUser._id, updatedUser.tokenVersion)
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

// @route   POST /api/auth/forgot-password
// @desc    Generate a reset token and email a reset link
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Enter valid email')
], resetAccountLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond with success, even if the user doesn't exist.
    // This avoids leaking which emails are registered.
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate raw token (sent to user) and hashed token (stored in DB)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password/${rawToken}`;

    const emailResult = await sendEmail(
      user.email,
      'Reset Your Password - Kisan App',
      `
        <h2>Password Reset Request</h2>
        <p>Dear ${user.name},</p>
        <p>We received a request to reset your Kisan App password. Click the link below to set a new password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>
      `
    );

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Roll back the token so a broken email service doesn't leave a dangling reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ message: 'Could not send reset email. Please try again later.' });
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using a valid reset token
// @access  Public
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      message: 'Password reset successful. You can now log in with your new password.',
      token: generateToken(user._id, user.tokenVersion)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
