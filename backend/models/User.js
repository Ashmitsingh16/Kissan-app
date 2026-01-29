const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Demo mode - skip strict validation for testing
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const userSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ['farmer', 'government'],
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        if (DEMO_MODE) return true;
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please enter a valid 10-digit Indian phone number'
    }
  },
  idType: {
    type: String,
    enum: ['aadhar', 'pan'],
    required: true
  },
  idNumber: {
    type: String,
    required: [true, 'Aadhar/PAN number is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  numberOfFarms: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
