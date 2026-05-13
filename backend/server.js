/**
 * KisanMitra — Backend Server v2
 * ════════════════════════════════
 * Node.js v23.11.1  |  Express  |  MongoDB
 * ML: Python scikit-learn PKL models (ML/service/ml_server.py)
 *     + brain.js neural network fallback (automatic)
 */
'use strict';

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
require('dotenv').config();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/crops',   require('./routes/crops'));
app.use('/api/soil',    require('./routes/soil'));
app.use('/api/pest',    require('./routes/pest'));
app.use('/api/market',  require('./routes/market'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/chat',    require('./routes/chat'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/feedback',require('./routes/feedback'));
app.use('/api/farmer',  require('./routes/farmer'));
app.use('/api/ml',      require('./routes/ml'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status:      'ok',
  message:     '🌾 KisanMitra API v2',
  nodeVersion: process.version,
  timestamp:   new Date().toISOString(),
}));

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ── Connect & Start ───────────────────────────────────────────────────────────
const PORT      = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kisanmitra';

mongoose.connect(MONGO_URI)
  .then(startServer)
  .catch(() => { console.warn('⚠️  MongoDB unavailable — demo mode'); startServer(); });

async function startServer() {
  app.listen(PORT, async () => {
    const ml = require('../ML/bridge/mlBridge');
    const status = await ml.service.status().catch(() => ({ online: false, pklFiles: [] }));

    console.log(`\n${'═'.repeat(56)}`);
    console.log(`  🌾 KisanMitra API v2 → http://localhost:${PORT}`);
    console.log(`  🟢 Node.js    : ${process.version}`);
    console.log(`  🧠 ML Engine  : ${status.online
      ? `✅ Python PKL service (port 5001)`
      : `⚠️  brain.js fallback (Python service offline)`}`);
    console.log(`  📦 PKL Models : ${status.pklFiles?.length || 0} files`);
    console.log(`  📊 ML Status  : GET /api/ml/status`);

    if (!status.online) {
      console.log(`\n  💡 To enable PKL ML predictions:`);
      console.log(`     cd ML && npm run serve`);
      console.log(`     (or: cd ML/service && python3 ml_server.py)`);
    }
    console.log(`${'═'.repeat(56)}\n`);
  });
}
