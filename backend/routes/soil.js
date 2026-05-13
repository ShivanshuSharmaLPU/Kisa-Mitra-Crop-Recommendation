/**
 * /api/soil — Soil Health Routes v4
 * 6 features: ph, organicCarbon, nitrogen, phosphorus, potassium, zinc
 * Uses ML/bridge/mlBridge.js → Python PKL models → rule-based fallback
 */
'use strict';
const express = require('express');
const router  = express.Router();
const ml      = require('../../ML/bridge/mlBridge');

// ── Optimal ranges (ICAR norms) ───────────────────────────────────────────────
const OPTIMAL = {
  ph:           { min:6.5, max:7.5, weight:20 },
  organicCarbon:{ min:0.8, max:2.0, weight:20 },
  nitrogen:     { min:250, max:450, weight:20 },
  phosphorus:   { min:20,  max:50,  weight:15 },
  potassium:    { min:180, max:350, weight:15 },
  zinc:         { min:0.8, max:3.0, weight:10 },
};

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreParam(val, opt) {
  if (val >= opt.min && val <= opt.max) return opt.weight;
  if (val < opt.min) return Math.max(0, opt.weight * (1 - (opt.min - val) / opt.min));
  return Math.max(0, opt.weight * (1 - (val - opt.max) / opt.max * 0.5));
}

function getStatus(val, opt) {
  if (val < opt.min * 0.7) return 'critically_low';
  if (val < opt.min)       return 'deficient';
  if (val > opt.max * 1.3) return 'excess';
  if (val > opt.max)       return 'high';
  return 'optimal';
}

// ── Deficiency detection ──────────────────────────────────────────────────────
function detectDeficiencies(v) {
  const d = [];

  if (v.ph < 5.5)
    d.push({ nutrient:'pH', issue:'Strongly Acidic', remedy:'Apply Agricultural Lime 2-3 tonnes/acre', severity:'high' });
  else if (v.ph < 6.5)
    d.push({ nutrient:'pH', issue:'Mildly Acidic', remedy:'Apply Lime 1 tonne/acre', severity:'medium' });
  else if (v.ph > 8.5)
    d.push({ nutrient:'pH', issue:'Highly Alkaline', remedy:'Apply Gypsum 2-3 t/acre + Sulphur 50 kg/acre', severity:'high' });

  if (v.organicCarbon < 0.5)
    d.push({ nutrient:'Organic Carbon', issue:'Very Low OC', remedy:'Apply 8T FYM/acre + Dhaincha green manuring', severity:'high' });
  else if (v.organicCarbon < 0.8)
    d.push({ nutrient:'Organic Carbon', issue:'Low OC', remedy:'Apply 5T FYM/acre', severity:'medium' });

  if (v.nitrogen < 150)
    d.push({ nutrient:'Nitrogen (N)', issue:'Severely Deficient', remedy:'Extra 30 kg Urea/acre + foliar spray 2% Urea', severity:'high' });
  else if (v.nitrogen < 250)
    d.push({ nutrient:'Nitrogen (N)', issue:'Deficient', remedy:'Extra 15 kg Urea/acre', severity:'medium' });

  if (v.phosphorus < 10)
    d.push({ nutrient:'Phosphorus (P)', issue:'Deficient', remedy:'Apply 50 kg SSP/acre or 25 kg DAP/acre', severity:'high' });
  else if (v.phosphorus < 20)
    d.push({ nutrient:'Phosphorus (P)', issue:'Low', remedy:'Apply 25 kg SSP/acre as basal dose', severity:'medium' });

  if (v.potassium < 100)
    d.push({ nutrient:'Potassium (K)', issue:'Deficient', remedy:'Apply 30 kg MOP/acre', severity:'medium' });
  else if (v.potassium < 180)
    d.push({ nutrient:'Potassium (K)', issue:'Low', remedy:'Apply 20 kg MOP/acre', severity:'medium' });

  if (v.zinc < 0.5)
    d.push({ nutrient:'Zinc (Zn)', issue:'Deficient', remedy:'Apply 10 kg ZnSO4/acre + foliar spray ZnSO4 0.5%', severity:'medium' });

  return d;
}

// ── Fertilizer schedule ───────────────────────────────────────────────────────
function buildFertSchedule(v) {
  const znNote  = v.zinc < 0.6         ? 'Zinc Sulphate 10 kg/acre as basal' : 'Not required';
  const dacNote = v.phosphorus < 10    ? '55' : '50';
  const mopNote = v.potassium  < 100   ? '30' : '20';
  const ureaN1  = v.nitrogen   < 250   ? '35' : '30';

  return {
    wheat: {
      basal:         `DAP ${dacNote} kg/acre + MOP ${mopNote} kg/acre at sowing`,
      topDressing1:  `Urea ${ureaN1} kg/acre at 21-25 days (after 1st irrigation)`,
      topDressing2:  `Urea 25 kg/acre at 45-50 days (after 2nd irrigation)`,
      micronutrient: znNote,
    },
    rice: {
      basal:         `DAP 40 kg/acre + MOP 15 kg/acre at transplanting`,
      topDressing1:  `Urea ${ureaN1} kg/acre at active tillering (25 days)`,
      topDressing2:  `Urea 20 kg/acre at panicle initiation (50 days)`,
      micronutrient: znNote,
    },
    mustard: {
      basal:         `DAP 25 kg/acre + MOP 15 kg/acre + Gypsum 15 kg/acre at sowing`,
      topDressing:   `Urea 25 kg/acre at pre-flowering (25-30 days)`,
      micronutrient: `Boron 1-2 g/L spray at flower initiation`,
    },
  };
}

// ── POST /api/soil/analyze ────────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const {
      ph            = 7.0,
      organicCarbon = 0.5,
      nitrogen      = 200,
      phosphorus    = 15,
      potassium     = 200,
      zinc          = 0.6,
      soilType      = 'alluvial',
      lang          = 'en',
    } = req.body;

    const vals = { ph, organicCarbon, nitrogen, phosphorus, potassium, zinc };

    // ── Rule-based scoring ────────────────────────────────────────
    let total = 0;
    const parameters = {};
    for (const [key, opt] of Object.entries(OPTIMAL)) {
      const s = scoreParam(vals[key], opt);
      total  += s;
      parameters[key] = {
        value:    vals[key],
        score:    Math.round(s * 10) / 10,
        maxScore: opt.weight,
        status:   getStatus(vals[key], opt),
      };
    }

    const deficiencies    = detectDeficiencies(vals);
    const recommendations = deficiencies.length === 0
      ? [{ type:'success', text:'Soil health is excellent! Maintain with 3T FYM/year and crop rotation.' }]
      : deficiencies.map(d => ({
          type: d.severity === 'high' ? 'danger' : 'warning',
          text: `${d.nutrient}: ${d.issue} — ${d.remedy}`,
        }));

    // ── ML prediction (6 features) ────────────────────────────────
    const mlResult = await ml.soil.predict({
      ph, organicCarbon, nitrogen, phosphorus, potassium, zinc,
    });

    const score  = mlResult.mlScore ?? Math.round(total);
    const grade  = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
    const rating = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Moderate' : 'Poor';

    res.json({
      success: true,
      score, grade, rating,
      parameters,
      deficiencies,
      recommendations,
      fertSchedule:    buildFertSchedule(vals),
      soilType,
      mlEngine:        mlResult.engine         || 'rule-based',
      mlR2Score:       mlResult.r2Score,
      confidenceRange: mlResult.confidenceRange,
      scoresByModel:   mlResult.scoresByModel,
      pklBacked:       mlResult.pklBacked,
    });

  } catch (err) {
    console.error('Soil analyze error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/soil/params ──────────────────────────────────────────────────────
router.get('/params', (req, res) => {
  res.json({
    success: true,
    parameters: [
      { key:'ph',            label:'Soil pH',        unit:'',      min:4, max:10,  optimal:'6.5-7.5', description:'Acidity/alkalinity of soil'    },
      { key:'organicCarbon', label:'Organic Carbon', unit:'%',     min:0, max:5,   optimal:'0.8-2.0', description:'Soil organic matter indicator' },
      { key:'nitrogen',      label:'Nitrogen (N)',   unit:'kg/ha', min:0, max:500, optimal:'250-450', description:'Available nitrogen content'    },
      { key:'phosphorus',    label:'Phosphorus (P)', unit:'kg/ha', min:0, max:100, optimal:'20-50',   description:'Available phosphorus content'  },
      { key:'potassium',     label:'Potassium (K)',  unit:'kg/ha', min:0, max:500, optimal:'180-350', description:'Available potassium content'   },
      { key:'zinc',          label:'Zinc (Zn)',      unit:'ppm',   min:0, max:10,  optimal:'0.8-3.0', description:'Zinc micronutrient level'      },
    ],
  });
});

// ── GET /api/soil/ml-info ─────────────────────────────────────────────────────
router.get('/ml-info', (req, res) => {
  res.json({ success: true, meta: ml.soil.meta(), nodeVersion: process.version });
});

module.exports = router;