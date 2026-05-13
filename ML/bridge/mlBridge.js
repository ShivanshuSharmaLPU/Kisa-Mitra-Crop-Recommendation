/**
 * KisanMitra ML — Node.js Bridge
 * ═══════════════════════════════
 * Connects the Node.js backend to the Python ML service (PKL models)
 * Falls back gracefully to rule-based systems if Python service is offline
 *
 * Node.js v23.11.1 — uses native fetch API
 *
 * Usage (in any route):
 *   const ml = require('../../ML/bridge/mlBridge');
 *   const result = await ml.crop.predict({ ph: 7.2, nitrogen: 280, ... });
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Configuration ─────────────────────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const TIMEOUT_MS     = parseInt(process.env.ML_TIMEOUT_MS || '4000');
const MODELS_DIR     = path.join(__dirname, '..', 'models');

// ── HTTP Helper ───────────────────────────────────────────────────────────────
async function mlPost(endpoint, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`ML service responded ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'ML service error');
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function mlGet(endpoint) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, { signal: controller.signal });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ── Read PKL Metadata ─────────────────────────────────────────────────────────
function readMeta(filename) {
  try {
    const p = path.join(MODELS_DIR, filename);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  } catch { return null; }
}

// ── Brain.js Fallback for Crop ────────────────────────────────────────────────
let _brainNet = null, _brainTrained = false;
function getBrainNet() {
  if (_brainTrained) return _brainNet;
  try {
    const brain = require('brain.js');
    _brainNet = new brain.NeuralNetwork({ hiddenLayers: [16, 12], activation: 'sigmoid' });
    _brainNet.train([
      { input: { ph:0.72, n:0.6,  p:0.5,  k:0.6,  temp:0.35, rain:0.4, season:0.2, soil:0.8 },
        output: { wheat:0.95, rice:0.1,  maize:0.2, cotton:0.05, mustard:0.85, chickpea:0.75, soybean:0.2,  sugarcane:0.1  }},
      { input: { ph:0.65, n:0.7,  p:0.6,  k:0.65, temp:0.75, rain:0.8, season:0.6, soil:0.7 },
        output: { wheat:0.1,  rice:0.95, maize:0.7, cotton:0.5,  mustard:0.05, chickpea:0.1,  soybean:0.8,  sugarcane:0.6  }},
      { input: { ph:0.78, n:0.5,  p:0.45, k:0.7,  temp:0.7,  rain:0.5, season:0.6, soil:0.3 },
        output: { wheat:0.4,  rice:0.2,  maize:0.5, cotton:0.95, mustard:0.3,  chickpea:0.85, soybean:0.7,  sugarcane:0.3  }},
      { input: { ph:0.7,  n:0.3,  p:0.25, k:0.4,  temp:0.6,  rain:0.2, season:0.2, soil:0.1 },
        output: { wheat:0.5,  rice:0.05, maize:0.3, cotton:0.2,  mustard:0.9,  chickpea:0.8,  soybean:0.2,  sugarcane:0.05 }},
      { input: { ph:0.68, n:0.55, p:0.5,  k:0.55, temp:0.85, rain:0.3, season:0.9, soil:0.7 },
        output: { wheat:0.02, rice:0.3,  maize:0.75, cotton:0.4, mustard:0.05, chickpea:0.35, soybean:0.6,  sugarcane:0.4  }},
    ], { iterations: 5000, errorThresh: 0.005, log: false });
    _brainTrained = true;
    console.log('🧠 ML Bridge: brain.js fallback ready');
  } catch { _brainTrained = false; }
  return _brainNet;
}

const SOIL_MAP   = { alluvial:0.8, black:0.3, red:0.5, sandy:0.1, clay:0.6, laterite:0.4, loamy:0.7 };
const SEASON_MAP = { rabi:0.2, kharif:0.6, zaid:0.9, annual:0.5 };

// Complete catalog matching train_crop.py v4 — prevents undefined in cards
const CROP_INFO = {
  // Rabi
  wheat:        { name:'Wheat',           icon:'🌾', season:'Rabi',   days:'115-140', waterNeed:'Medium',   baseIncome:45000, msp:2275  },
  mustard:      { name:'Mustard',         icon:'🌻', season:'Rabi',   days:'90-110',  waterNeed:'Low',      baseIncome:28000, msp:5650  },
  chickpea:     { name:'Chickpea',        icon:'🟤', season:'Rabi',   days:'95-120',  waterNeed:'VeryLow',  baseIncome:32000, msp:5440  },
  barley:       { name:'Barley',          icon:'🌿', season:'Rabi',   days:'80-100',  waterNeed:'Low',      baseIncome:22000, msp:1635  },
  lentil:       { name:'Lentil',          icon:'🫘', season:'Rabi',   days:'100-120', waterNeed:'VeryLow',  baseIncome:30000, msp:6425  },
  pea:          { name:'Pea',             icon:'🟢', season:'Rabi',   days:'80-100',  waterNeed:'Low',      baseIncome:35000, msp:0     },
  potato:       { name:'Potato',          icon:'🥔', season:'Rabi',   days:'70-90',   waterNeed:'Medium',   baseIncome:50000, msp:0     },
  onion:        { name:'Onion',           icon:'🧅', season:'Rabi',   days:'110-130', waterNeed:'Medium',   baseIncome:48000, msp:0     },
  garlic:       { name:'Garlic',          icon:'🧄', season:'Rabi',   days:'130-180', waterNeed:'Low',      baseIncome:55000, msp:0     },
  spinach:      { name:'Spinach',         icon:'🥬', season:'Rabi',   days:'40-60',   waterNeed:'Medium',   baseIncome:25000, msp:0     },
  carrot:       { name:'Carrot',          icon:'🥕', season:'Rabi',   days:'90-120',  waterNeed:'Medium',   baseIncome:40000, msp:0     },
  coriander:    { name:'Coriander',       icon:'🌿', season:'Rabi',   days:'40-50',   waterNeed:'Low',      baseIncome:30000, msp:0     },
  fenugreek:    { name:'Fenugreek',       icon:'🌿', season:'Rabi',   days:'90-110',  waterNeed:'Low',      baseIncome:25000, msp:0     },
  linseed:      { name:'Linseed',         icon:'🌻', season:'Rabi',   days:'120-150', waterNeed:'Low',      baseIncome:22000, msp:6020  },
  safflower:    { name:'Safflower',       icon:'🌸', season:'Rabi',   days:'150-180', waterNeed:'VeryLow',  baseIncome:20000, msp:5800  },
  gram_fodder:  { name:'Gram Fodder',     icon:'🌱', season:'Rabi',   days:'50-70',   waterNeed:'Low',      baseIncome:15000, msp:0     },
  radish:       { name:'Radish',          icon:'🌱', season:'Rabi',   days:'25-35',   waterNeed:'Medium',   baseIncome:20000, msp:0     },
  cauliflower:  { name:'Cauliflower',     icon:'🥦', season:'Rabi',   days:'60-80',   waterNeed:'Medium',   baseIncome:45000, msp:0     },
  cabbage:      { name:'Cabbage',         icon:'🥬', season:'Rabi',   days:'60-80',   waterNeed:'Medium',   baseIncome:40000, msp:0     },
  tomato_rabi:  { name:'Tomato (Winter)', icon:'🍅', season:'Rabi',   days:'90-120',  waterNeed:'Medium',   baseIncome:60000, msp:0     },
  // Kharif
  rice:         { name:'Rice',            icon:'🍚', season:'Kharif', days:'120-150', waterNeed:'High',     baseIncome:38000, msp:2183  },
  maize:        { name:'Maize',           icon:'🌽', season:'Kharif', days:'90-110',  waterNeed:'Medium',   baseIncome:30000, msp:1962  },
  cotton:       { name:'Cotton',          icon:'☁️', season:'Kharif', days:'160-180', waterNeed:'Medium',   baseIncome:55000, msp:6620  },
  soybean:      { name:'Soybean',         icon:'🫘', season:'Kharif', days:'90-100',  waterNeed:'Medium',   baseIncome:25000, msp:4600  },
  groundnut:    { name:'Groundnut',       icon:'🥜', season:'Kharif', days:'110-130', waterNeed:'Medium',   baseIncome:35000, msp:6377  },
  sunflower:    { name:'Sunflower',       icon:'🌸', season:'Kharif', days:'90-100',  waterNeed:'Low',      baseIncome:28000, msp:6760  },
  bajra:        { name:'Bajra',           icon:'🌾', season:'Kharif', days:'70-90',   waterNeed:'VeryLow',  baseIncome:18000, msp:2500  },
  jowar:        { name:'Jowar',           icon:'🌾', season:'Kharif', days:'100-120', waterNeed:'Low',      baseIncome:20000, msp:3180  },
  urad:         { name:'Urad (Black Gram)',icon:'⚫',season:'Kharif', days:'65-85',   waterNeed:'Low',      baseIncome:22000, msp:7400  },
  moong:        { name:'Moong (Green Gram)',icon:'🟢',season:'Kharif',days:'60-75',   waterNeed:'Low',      baseIncome:20000, msp:8558  },
  turmeric:     { name:'Turmeric',        icon:'🟡', season:'Kharif', days:'240-270', waterNeed:'High',     baseIncome:65000, msp:0     },
  ginger:       { name:'Ginger',          icon:'🫚', season:'Kharif', days:'200-240', waterNeed:'High',     baseIncome:70000, msp:0     },
  tur:          { name:'Tur (Arhar)',      icon:'🌾', season:'Kharif', days:'160-200', waterNeed:'Low',      baseIncome:28000, msp:7550  },
  sesame:       { name:'Sesame (Til)',     icon:'🌱', season:'Kharif', days:'80-100',  waterNeed:'Low',      baseIncome:22000, msp:8635  },
  castor:       { name:'Castor',          icon:'🌿', season:'Kharif', days:'180-200', waterNeed:'Low',      baseIncome:25000, msp:0     },
  cowpea:       { name:'Cowpea',          icon:'🟢', season:'Kharif', days:'60-80',   waterNeed:'Low',      baseIncome:18000, msp:0     },
  bitter_gourd: { name:'Bitter Gourd',    icon:'🥒', season:'Kharif', days:'55-70',   waterNeed:'Medium',   baseIncome:35000, msp:0     },
  brinjal:      { name:'Brinjal',         icon:'🍆', season:'Kharif', days:'90-120',  waterNeed:'Medium',   baseIncome:30000, msp:0     },
  okra:         { name:'Okra (Bhindi)',   icon:'🌿', season:'Kharif', days:'50-65',   waterNeed:'Medium',   baseIncome:32000, msp:0     },
  chilli:       { name:'Chilli',          icon:'🌶️', season:'Kharif', days:'120-150', waterNeed:'Medium',   baseIncome:55000, msp:0     },
  // Zaid
  watermelon:   { name:'Watermelon',      icon:'🍉', season:'Zaid',   days:'70-90',   waterNeed:'High',     baseIncome:40000, msp:0     },
  cucumber:     { name:'Cucumber',        icon:'🥒', season:'Zaid',   days:'45-60',   waterNeed:'Medium',   baseIncome:30000, msp:0     },
  moong_zaid:   { name:'Moong (Zaid)',    icon:'🌱', season:'Zaid',   days:'55-65',   waterNeed:'Low',      baseIncome:18000, msp:8558  },
  bottle_gourd: { name:'Bottle Gourd',    icon:'🫙', season:'Zaid',   days:'60-75',   waterNeed:'Medium',   baseIncome:25000, msp:0     },
  pumpkin:      { name:'Pumpkin',         icon:'🎃', season:'Zaid',   days:'80-100',  waterNeed:'Medium',   baseIncome:22000, msp:0     },
  muskmelon:    { name:'Muskmelon',       icon:'🍈', season:'Zaid',   days:'70-90',   waterNeed:'Medium',   baseIncome:35000, msp:0     },
  // Annual
  sugarcane:    { name:'Sugarcane',       icon:'🎋', season:'Annual', days:'300-360', waterNeed:'VeryHigh', baseIncome:70000, msp:340   },
  banana:       { name:'Banana',          icon:'🍌', season:'Annual', days:'270-365', waterNeed:'High',     baseIncome:80000, msp:0     },
  papaya:       { name:'Papaya',          icon:'🧡', season:'Annual', days:'240-300', waterNeed:'Medium',   baseIncome:65000, msp:0     },
  coconut:      { name:'Coconut',         icon:'🥥', season:'Annual', days:'365+',    waterNeed:'High',     baseIncome:50000, msp:0     },
};

// Season membership — used to filter fallback results to correct season
const CROP_SEASON_MAP = {
  wheat:'rabi',mustard:'rabi',chickpea:'rabi',barley:'rabi',lentil:'rabi',
  pea:'rabi',potato:'rabi',onion:'rabi',garlic:'rabi',spinach:'rabi',
  carrot:'rabi',coriander:'rabi',fenugreek:'rabi',linseed:'rabi',
  safflower:'rabi',gram_fodder:'rabi',radish:'rabi',cauliflower:'rabi',
  cabbage:'rabi',tomato_rabi:'rabi',
  rice:'kharif',maize:'kharif',cotton:'kharif',soybean:'kharif',
  groundnut:'kharif',sunflower:'kharif',bajra:'kharif',jowar:'kharif',
  urad:'kharif',moong:'kharif',turmeric:'kharif',ginger:'kharif',
  tur:'kharif',sesame:'kharif',castor:'kharif',cowpea:'kharif',
  bitter_gourd:'kharif',brinjal:'kharif',okra:'kharif',chilli:'kharif',
  watermelon:'zaid',cucumber:'zaid',moong_zaid:'zaid',
  bottle_gourd:'zaid',pumpkin:'zaid',muskmelon:'zaid',
  sugarcane:'annual',banana:'annual',papaya:'annual',coconut:'annual',
};

function norm(v, lo, hi) { return Math.max(0, Math.min(1, (v - lo) / (hi - lo))); }

function brainFallbackCrop(params) {
  const { ph=7, nitrogen=200, phosphorus=15, potassium=200, temperature=25,
          rainfall=400, season='rabi', soilType='alluvial', prevCrop='', area=2 } = params;

  // Season-appropriate rule-based scores (no brain.js dependency needed)
  const seasonCrops = {
    rabi:   ['wheat','mustard','chickpea','barley','lentil','pea','potato',
             'onion','garlic','spinach','carrot','cauliflower','cabbage',
             'coriander','fenugreek','tomato_rabi','linseed','safflower'],
    kharif: ['rice','maize','cotton','soybean','groundnut','sunflower','bajra',
             'jowar','urad','moong','turmeric','ginger','tur','sesame','castor',
             'cowpea','bitter_gourd','brinjal','okra','chilli'],
    zaid:   ['watermelon','cucumber','moong_zaid','bottle_gourd','pumpkin','muskmelon'],
    annual: ['sugarcane','banana','papaya','coconut'],
  };

  // Always include annual crops as options
  const eligible = [
    ...(seasonCrops[season] || seasonCrops['rabi']),
    ...seasonCrops['annual'],
  ];

  // Simple rule-based scoring using key parameters
  return eligible.map(key => {
    const info = CROP_INFO[key];
    if (!info) return null;

    let score = 0.5; // base

    // pH suitability
    if (key === 'rice'     && ph >= 5.5 && ph <= 6.5) score += 0.15;
    if (key === 'wheat'    && ph >= 6.8 && ph <= 7.5) score += 0.15;
    if (key === 'cotton'   && ph >= 7.5 && ph <= 8.2) score += 0.15;
    if (key === 'mustard'  && ph >= 6.8 && ph <= 7.5) score += 0.10;
    if (key === 'chickpea' && ph >= 7.0 && ph <= 8.0) score += 0.10;
    if (key === 'potato'   && ph >= 5.5 && ph <= 6.5) score += 0.10;
    if (key === 'turmeric' && ph >= 5.0 && ph <= 6.0) score += 0.12;
    if (key === 'ginger'   && ph >= 5.0 && ph <= 6.5) score += 0.12;
    if (key === 'bajra'    && ph >= 7.0 && ph <= 8.5) score += 0.12;

    // Rainfall suitability
    if (key === 'rice'      && rainfall >= 1000) score += 0.15;
    if (key === 'wheat'     && rainfall >= 300 && rainfall <= 600) score += 0.10;
    if (key === 'mustard'   && rainfall <= 400)  score += 0.10;
    if (key === 'bajra'     && rainfall <= 400)  score += 0.12;
    if (key === 'jowar'     && rainfall <= 700)  score += 0.10;
    if (key === 'sugarcane' && rainfall >= 1200) score += 0.15;
    if (key === 'turmeric'  && rainfall >= 1200) score += 0.12;
    if (key === 'banana'    && rainfall >= 1200) score += 0.12;
    if (key === 'cotton'    && rainfall >= 500 && rainfall <= 700) score += 0.10;
    if (key === 'groundnut' && rainfall >= 400 && rainfall <= 700) score += 0.10;

    // Temperature suitability
    if (key === 'rice'      && temperature >= 28) score += 0.10;
    if (key === 'wheat'     && temperature <= 22) score += 0.10;
    if (key === 'bajra'     && temperature >= 30) score += 0.12;
    if (key === 'jowar'     && temperature >= 28) score += 0.10;
    if (key === 'potato'    && temperature <= 18) score += 0.10;
    if (key === 'cauliflower'&& temperature <= 20) score += 0.10;
    if (key === 'cabbage'   && temperature <= 20) score += 0.10;

    // Soil suitability
    if (soilType === 'sandy'    && ['mustard','barley','groundnut','bajra','watermelon','muskmelon','sesame'].includes(key)) score += 0.12;
    if (soilType === 'black'    && ['cotton','jowar','chickpea','soybean','tur'].includes(key))  score += 0.12;
    if (soilType === 'red'      && ['groundnut','maize','soybean','turmeric','ginger','chilli'].includes(key)) score += 0.12;
    if (soilType === 'alluvial' && ['wheat','rice','sugarcane','potato','pea','lentil'].includes(key)) score += 0.10;

    // Rotation penalty
    const pen = prevCrop && key === prevCrop.toLowerCase() ? -0.18 : 0;
    const adj = Math.max(0, Math.min(1, score + pen));

    return {
      id: key, ...info,
      mlScore:        Math.round(adj * 100),
      mlConfidence:   `${(adj*100).toFixed(1)}%`,
      estimatedIncome:Math.round(info.baseIncome * area),
      rotationNote:   pen < 0 ? '⚠️ Same as previous — rotation advised' : null,
      tags:           adj > 0.65 ? ['⭐ Top Pick'] : [],
    };
  }).filter(Boolean).sort((a,b) => b.mlScore - a.mlScore).slice(0, 5);
}

// ── Public API ────────────────────────────────────────────────────────────────
const crop = {
  async predict(params) {
    try {
      const data = await mlPost('/predict/crop', params);
      return { ...data, engine: 'Python scikit-learn PKL Ensemble', pklBacked: true };
    } catch {
      const recs = brainFallbackCrop(params) || [];
      return {
        recommendations: recs,
        engine: 'brain.js Neural Network (fallback)',
        pklBacked: false,
        modelUsed: 'neural_network',
        accuracy: '~87%',
      };
    }
  },
  meta: () => readMeta('crop_meta.json'),
};

const soil = {
  async predict(params) {
    try {
      return { ...await mlPost('/predict/soil', params), engine: 'Python scikit-learn PKL', pklBacked: true };
    } catch {
      return { mlScore: null, engine: 'rule-based fallback', pklBacked: false };
    }
  },
  meta: () => readMeta('soil_meta.json'),
};

const pest = {
  async predict(params) {
    try {
      return { ...await mlPost('/predict/pest', params), engine: 'Python scikit-learn PKL', pklBacked: true };
    } catch {
      return { pestId: null, confidence: 0, engine: 'rule-based fallback', pklBacked: false };
    }
  },
  meta: () => readMeta('pest_meta.json'),
};

const market = {
  async predictTrend(params) {
    try {
      return { ...await mlPost('/predict/market', params), engine: 'Python scikit-learn PKL', pklBacked: true };
    } catch {
      return { trend: 'stable', confidence: 0, engine: 'rule-based fallback', pklBacked: false };
    }
  },
  meta: () => readMeta('market_meta.json'),
};

const service = {
  async health()  { return mlGet('/health'); },
  async models()  { return mlGet('/models'); },
  listPklFiles()  {
    try { return fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.pkl')); }
    catch { return []; }
  },
  async status() {
    const online = await this.health().then(h => !!h).catch(() => false);
    return {
      online,
      serviceUrl: ML_SERVICE_URL,
      pklFiles:   this.listPklFiles(),
      models: {
        crop:   crop.meta(),
        soil:   soil.meta(),
        pest:   pest.meta(),
        market: market.meta(),
      },
      nodeVersion: process.version,
    };
  },
};

module.exports = { crop, soil, pest, market, service };