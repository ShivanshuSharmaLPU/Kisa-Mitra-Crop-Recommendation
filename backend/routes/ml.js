/**
 * /api/ml — ML System Management Routes
 * Node.js v23.11.1
 */
'use strict';
const express = require('express');
const path    = require('path');
const { spawn } = require('child_process');
const router  = express.Router();
const ml      = require('../../ML/bridge/mlBridge');

// GET /api/ml/status — Full ML system status
router.get('/status', async (req, res) => {
  const status = await ml.service.status();
  res.json({ success: true, ...status, nodeVersion: process.version });
});

// GET /api/ml/models — List all PKL models with metadata
router.get('/models', async (req, res) => {
  const health = await ml.service.health();
  res.json({
    success: true,
    serviceOnline: !!health,
    pklFiles: ml.service.listPklFiles(),
    crop:   ml.crop.meta(),
    soil:   ml.soil.meta(),
    pest:   ml.pest.meta(),
    market: ml.market.meta(),
  });
});

// POST /api/ml/train — Trigger retraining of PKL models
router.post('/train', (req, res) => {
  const target    = req.body.target || 'all';
  const trainDir  = path.join(__dirname, '..', '..', 'ML', 'training');
  const proc      = spawn('python3', ['train_all.py', target], { cwd: trainDir, detached: true, stdio: 'ignore' });
  proc.unref();
  res.json({ success: true, message: `Training "${target}" started in background`, pid: proc.pid });
});

// POST /api/ml/predict/crop — Direct ML prediction (without full route logic)
router.post('/predict/crop', async (req, res) => {
  try {
    const result = await ml.crop.predict(req.body);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/ml/predict/soil
router.post('/predict/soil', async (req, res) => {
  try {
    const result = await ml.soil.predict(req.body);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/ml/predict/pest
router.post('/predict/pest', async (req, res) => {
  try {
    const result = await ml.pest.predict(req.body);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/ml/predict/market
router.post('/predict/market', async (req, res) => {
  try {
    const result = await ml.market.predictTrend(req.body);
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
