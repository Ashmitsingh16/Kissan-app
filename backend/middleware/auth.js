const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'Account no longer exists' });
      if ((decoded.tokenVersion || 0) !== (req.user.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Please log in again' });
      }
      if (req.user.userType === 'government' && !req.user.isVerified) {
        return res.status(403).json({ message: 'Government account requires administrator approval' });
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const farmerOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'farmer') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Farmers only.' });
  }
};

const governmentOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'government' && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Government officers only.' });
  }
};

module.exports = { protect, farmerOnly, governmentOnly };
