const express = require('express');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ❗ JWT must exist in Render env
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in environment variables");
}

const signToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );


// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, state, district, language } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password required'
      });
    }

    const exists = await Farmer.findOne({ phone });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    const farmer = await Farmer.create({
      name,
      phone,
      password,
      state,
      district,
      language
    });

    const token = signToken(farmer._id);

    res.status(201).json({
      success: true,
      token,
      farmer
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password required'
      });
    }

    const farmer = await Farmer.findOne({ phone });

    if (!farmer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password'
      });
    }

    const isMatch = await farmer.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password'
      });
    }

    const token = signToken(farmer._id);

    res.json({
      success: true,
      token,
      farmer
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= ME =================
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    farmer: req.farmer
  });
});

module.exports = router;