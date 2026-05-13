const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.farmer = await Farmer.findById(decoded.id).select('-password').catch(() => null);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.farmer = await Farmer.findById(decoded.id).select('-password').catch(() => null);
    } catch {}
  }
  next();
};

module.exports = { protect, optionalAuth };
