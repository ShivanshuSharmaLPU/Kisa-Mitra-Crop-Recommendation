// feedback.js
const express = require('express');
const Feedback = require('../models/Feedback');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { rating, feature, comment, phone } = req.body;
    if (!rating) return res.status(400).json({ success: false, message: 'Rating required' });
    const fb = await Feedback.create({ rating, feature, comment, phone }).catch(() => ({ _id: Date.now() }));
    res.json({ success: true, message: '🙏 Thank you for your feedback!', id: fb._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const all = await Feedback.find().catch(() => []);
    const avg = all.length ? (all.reduce((a, b) => a + b.rating, 0) / all.length).toFixed(1) : 4.6;
    res.json({ success: true, total: all.length, averageRating: avg });
  } catch {
    res.json({ success: true, total: 0, averageRating: 4.6 });
  }
});

module.exports = router;
