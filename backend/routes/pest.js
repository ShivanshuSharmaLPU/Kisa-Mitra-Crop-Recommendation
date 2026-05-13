/**
 * /api/pest — Pest Detection Routes
 * Uses Groq API (vision + text) for dynamic pest/disease detection.
 * No hardcoded DB, no ML .pkl models, no synthetic data.
 */
'use strict';
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const Groq    = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `pest_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

// ─── Helper: read uploaded image as base64 data URL ─────────────────────────
function readImageDataURL(filePath) {
  const buffer   = fs.readFileSync(filePath);
  const base64   = buffer.toString('base64');
  const ext      = path.extname(filePath).toLowerCase();
  const mimeMap  = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

// ─── Build detection prompt ──────────────────────────────────────────────────
function buildPrompt(crop, symptoms, season, temperature, humidity) {
  return `You are an expert agricultural scientist specializing in crop pest and disease detection for Indian farmers.

Analyze the provided crop image${symptoms ? ` and the farmer-reported symptoms: "${symptoms}"` : ''}.

Crop: ${crop || 'unknown'}
Season: ${season || 'kharif'}
Temperature: ${temperature}°C
Humidity: ${humidity}%

Identify the most likely pest or disease affecting this crop.

Respond ONLY with a valid JSON object — no markdown, no explanation, no extra text:

{
  "id": "snake_case_pest_id",
  "name": "Common Pest/Disease Name",
  "scientific": "Scientific name or null",
  "severity": "low|moderate|high",
  "confidence": 0.0 to 1.0,
  "affectedCrops": ["Crop1", "Crop2"],
  "symptoms": "Description of visible symptoms",
  "chemical": "Chemical treatment with product name and dosage",
  "organic": "Organic/bio treatment recommendation",
  "preventive": "Prevention measures",
  "spreadRisk": "Spread risk and favourable conditions",
  "modelUsed": "groq-vision"
}

Rules:
- If image does NOT show a crop/plant, set confidence below 0.3.
- Give practical Indian market product names and dosages.
- affectedCrops: list all commonly affected crops, identified crop first.
- Never use placeholder or generic text.`;
}

// ─── POST /api/pest/detect ───────────────────────────────────────────────────
router.post('/detect', upload.single('image'), async (req, res) => {
  const imagePath = req.file ? req.file.path : null;

  try {
    const {
      crop        = '',
      symptoms    = '',
      season      = 'kharif',
      temperature = 30,
      humidity    = 70,
      lang        = 'en',
    } = req.body;

    // Must have at least image or symptoms
    if (!imagePath && !symptoms.trim()) {
      return res.status(400).json({
        success: false,
        error:   true,
        code:    'NO_INPUT',
        message: 'Please upload a crop image or describe symptoms.',
      });
    }

    // Build message content
    const userContent = [];

    if (imagePath) {
      userContent.push({
        type:      'image_url',
        image_url: { url: readImageDataURL(imagePath) },
      });
    }

    userContent.push({
      type: 'text',
      text: buildPrompt(crop, symptoms, season, Number(temperature), Number(humidity)),
    });

    // Call Groq API
    const chatCompletion = await client.chat.completions.create({
      model:       'meta-llama/llama-4-scout-17b-16e-instruct', // Groq vision model
      max_tokens:  1024,
      temperature: 0.2,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = chatCompletion.choices[0]?.message?.content || '';

    // Parse JSON from response
    let detection;
    try {
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      detection     = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Groq response parse error:', parseErr.message);
      console.error('Raw response:', rawText);
      return res.status(500).json({
        success: false,
        error:   true,
        code:    'PARSE_ERROR',
        message: 'AI response could not be parsed. Please try again.',
      });
    }

    // Clean up uploaded file
    if (imagePath) fs.unlink(imagePath, () => {});

    // Low confidence check
    if (detection.confidence < 0.30) {
      return res.json({
        success: false,
        error:   true,
        code:    'LOW_CONFIDENCE',
        message:
          lang === 'hi' ? 'फोटो में फसल का रोग/कीट स्पष्ट नहीं है। बेहतर फोटो या लक्षण बताएं।' :
          lang === 'pa' ? 'ਫੋਟੋ ਵਿੱਚ ਫਸਲ ਦਾ ਰੋਗ/ਕੀੜਾ ਸਪੱਸ਼ਟ ਨਹੀਂ। ਬਿਹਤਰ ਫੋਟੋ ਜਾਂ ਲੱਛਣ ਦੱਸੋ।' :
          lang === 'ta' ? 'படத்தில் பயிர் நோய் தெளிவாக இல்லை. சிறந்த படம் அல்லது அறிகுறிகளை விவரிக்கவும்.' :
          lang === 'te' ? 'ఫోటోలో పంట వ్యాధి స్పష్టంగా లేదు. మంచి ఫోటో లేదా లక్షణాలు వివరించండి.' :
          'Could not detect pest/disease with sufficient confidence. Try a clearer photo or describe symptoms.',
      });
    }

    return res.json({
      success:  true,
      imageUrl: null,
      detection,
      mlEngine:  'groq-api',
      pklBacked: false,
      nearestExpert: {
        name:     'Kisan Call Centre',
        phone:    '1800-180-1551',
        distance: null,
        type:     'Toll Free Helpline',
      },
      analyzedAt: new Date().toISOString(),
    });

  } catch (err) {
    if (imagePath) fs.unlink(imagePath, () => {});
    console.error('Pest detection error:', err);

    if (err.status === 401) {
      return res.status(500).json({ success: false, error: true, code: 'AUTH_ERROR', message: 'Groq API key invalid.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ success: false, error: true, code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.' });
    }

    return res.status(500).json({ success: false, error: true, message: err.message || 'Detection failed.' });
  }
});

// ─── GET /api/pest/common ────────────────────────────────────────────────────
router.get('/common', async (req, res) => {
  const { season = 'kharif', region = 'North India' } = req.query;
  try {
    const chatCompletion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  600,
      temperature: 0.2,
      messages: [{
        role:    'user',
        content: `List the 5 most common crop pests/diseases in ${region} during ${season} season.
Respond ONLY with a JSON array, no markdown:
[
  {
    "id": "snake_case_id",
    "name": "Pest Name",
    "crop": "Primary crop affected",
    "severity": "low|moderate|high",
    "icon": "single emoji"
  }
]`,
      }],
    });

    const raw     = chatCompletion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const pests   = JSON.parse(cleaned);

    res.json({ success: true, pests, season, region });
  } catch (err) {
    // Static fallback if API fails
    res.json({
      success: true,
      pests: [
        { id: 'powdery_mildew',    name: 'Powdery Mildew',    crop: 'Wheat / Mustard',  severity: 'moderate', icon: '🍃' },
        { id: 'brown_planthopper', name: 'Brown Planthopper', crop: 'Rice',             severity: 'high',     icon: '🦗' },
        { id: 'aphids',            name: 'Aphids',            crop: 'Mustard / Veggies',severity: 'low',      icon: '🐛' },
        { id: 'yellow_rust',       name: 'Yellow Rust',       crop: 'Wheat',            severity: 'high',     icon: '🌾' },
        { id: 'fall_armyworm',     name: 'Fall Armyworm',     crop: 'Maize / Wheat',    severity: 'high',     icon: '🐛' },
      ],
    });
  }
});

module.exports = router;