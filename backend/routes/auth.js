const express = require('express');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const { protect } = require('../middleware/auth');
const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, state, district, language } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ success: false, message: 'Name, phone, and password required' });
    const exists = await Farmer.findOne({ phone }).catch(() => null);
    if (exists) return res.status(400).json({ success: false, message: 'Phone number already registered' });
    const farmer = await Farmer.create({ name, phone, password, state, district, language }).catch(() => null);
    if (!farmer) return res.status(400).json({ success: false, message: 'Registration failed' });
    res.status(201).json({ success: true, token: signToken(farmer._id), farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const farmer = await Farmer.findOne({ phone }).catch(() => null);
    if (!farmer || !(await farmer.matchPassword(password).catch(() => false))) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }
    res.json({ success: true, token: signToken(farmer._id), farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, farmer: req.farmer });
});

module.exports = router;
