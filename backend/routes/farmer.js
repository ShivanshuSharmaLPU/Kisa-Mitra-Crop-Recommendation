const express = require('express');
const Farmer = require('../models/Farmer');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/profile', protect, (req, res) => res.json({ success: true, farmer: req.farmer }));

router.put('/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    const farmer = await Farmer.findByIdAndUpdate(req.farmer._id, updates, { new: true }).catch(() => null);
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
    res.json({ success: true, farmer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
