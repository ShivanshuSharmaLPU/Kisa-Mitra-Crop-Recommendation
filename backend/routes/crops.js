'use strict';
const express          = require('express');
const router           = express.Router();
const ml               = require('../../ML/bridge/mlBridge');
const groqPriceService = require('./groqPriceService'); // adjust path if needed

// POST /api/crops/recommend
router.post('/recommend', async (req, res) => {
  try {
    const {
      ph = 7, organicCarbon = 0.5, nitrogen = 200, phosphorus = 15,
      potassium = 200, zinc = 0.6, temperature = 22, rainfall = 400,
      season = 'rabi', soilType = 'alluvial', prevCrop = null,
      area = 2, humidity = 60, windSpeed = 12,
      state = 'Punjab', district = 'Phagwara',   // ← used for regional pricing
    } = req.body;

    // 1️⃣  ML prediction
    const result = await ml.crop.predict({
      ph, organicCarbon, nitrogen, phosphorus, potassium, zinc,
      temperature, rainfall, season, soilType, prevCrop,
      area, humidity, windSpeed,
    });

    // 2️⃣  Enrich with region-specific prices from Groq
    //     state + district are passed so Groq returns local mandi prices
    const enriched = await groqPriceService.enrichRecommendations(
      result.recommendations,
      area,
      state,      // ← NEW
      district,   // ← NEW
    );

    res.json({
      success:         true,
      location:        `${district}, ${state}`,
      season,
      soilType,
      area,
      recommendations: enriched,
      advisoryNote:    getSeasonNote(season),
      mlEngine:        result.engine,
      modelUsed:       result.modelUsed,
      accuracy:        result.accuracy,
      pklBacked:       result.pklBacked,
      priceSource:     enriched[0]?.priceSource ?? 'msp-fallback',
      priceRegion:     enriched[0]?.priceRegion ?? `${district}, ${state}`,
      generatedAt:     new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/crops/recommend]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/crops/ml-info
router.get('/ml-info', async (req, res) => {
  const status = await ml.service.status();
  res.json({ success: true, ...status, meta: ml.crop.meta() });
});

// GET /api/crops/prices?state=Punjab&district=Ludhiana
router.get('/prices', async (req, res) => {
  try {
    const { state = 'Punjab', district = '' } = req.query;
    const { prices, source } = await groqPriceService.getAllPrices(state, district);
    res.json({ success: true, region: [district, state].filter(Boolean).join(', '), source, prices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/crops/prices/refresh?state=Punjab&district=Ludhiana
router.post('/prices/refresh', async (req, res) => {
  try {
    const { state = 'Punjab', district = '' } = req.query;
    const { prices, source } = await groqPriceService.refreshPrices(state, district);
    res.json({ success: true, message: 'Cache refreshed', region: `${district}, ${state}`, source, count: Object.keys(prices).length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/crops/calendar
router.get('/calendar', (req, res) => {
  res.json({
    success: true,
    calendar: [
      { month: 'Oct-Nov', season: 'Rabi',   crops: ['Wheat', 'Mustard', 'Chickpea', 'Barley'],          activity: 'Sowing'  },
      { month: 'Feb-Mar', season: 'Rabi',   crops: ['Wheat', 'Mustard'],                                activity: 'Harvest' },
      { month: 'Jun-Jul', season: 'Kharif', crops: ['Rice', 'Maize', 'Cotton', 'Soybean', 'Groundnut'], activity: 'Sowing'  },
      { month: 'Sep-Oct', season: 'Kharif', crops: ['Rice', 'Soybean', 'Maize', 'Groundnut'],            activity: 'Harvest' },
      { month: 'Mar-Apr', season: 'Zaid',   crops: ['Watermelon', 'Moong', 'Cucumber'],                 activity: 'Sowing'  },
    ],
  });
});

function getSeasonNote(s) {
  return {
    rabi:   '🌡️ Rabi season: Ensure adequate irrigation. Watch for frost in December-January.',
    kharif: '🌧️ Kharif season: Monsoon-dependent crops. Ensure proper drainage.',
    zaid:   '☀️ Zaid season: High temperature crops. Frequent irrigation needed.',
  }[s] || '';
}

module.exports = router;