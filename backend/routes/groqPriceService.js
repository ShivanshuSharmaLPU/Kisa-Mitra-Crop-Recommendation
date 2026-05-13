'use strict';
const Groq = require('groq-sdk');

// ─── MSP fallback table (₹/quintal, 2024-25) ─────────────────────────────────
const MSP_FALLBACK = {
  wheat: 2275, mustard: 5650, chickpea: 5440, barley: 1635,
  lentil: 6425, pea: 0, potato: 0, onion: 0, garlic: 0,
  spinach: 0, carrot: 0, coriander: 0, fenugreek: 0,
  linseed: 6020, safflower: 5800, gram_fodder: 0, radish: 0,
  cauliflower: 0, cabbage: 0, tomato_rabi: 0,
  rice: 2183, maize: 1962, cotton: 6620, soybean: 4600,
  groundnut: 6377, sunflower: 6760, bajra: 2500, jowar: 3180,
  urad: 7400, moong: 8558, turmeric: 0, ginger: 0,
  tur: 7550, sesame: 8635, castor: 0, cowpea: 0,
  bitter_gourd: 0, brinjal: 0, okra: 0, chilli: 0,
  watermelon: 0, cucumber: 0, moong_zaid: 8558, bottle_gourd: 0,
  pumpkin: 0, muskmelon: 0,
  sugarcane: 340, banana: 0, papaya: 0, coconut: 0,
};

// ─── Typical yield in quintals/acre ──────────────────────────────────────────
const YIELD_PER_ACRE = {
  wheat: 20, mustard: 8, chickpea: 10, barley: 18, lentil: 8,
  pea: 30, potato: 100, onion: 80, garlic: 40, spinach: 60,
  carrot: 80, coriander: 6, fenugreek: 8, linseed: 7, safflower: 6,
  gram_fodder: 80, radish: 90, cauliflower: 90, cabbage: 90, tomato_rabi: 120,
  rice: 18, maize: 20, cotton: 10, soybean: 12, groundnut: 14,
  sunflower: 8, bajra: 8, jowar: 12, urad: 6, moong: 5,
  turmeric: 30, ginger: 40, tur: 6, sesame: 4, castor: 8,
  cowpea: 5, bitter_gourd: 50, brinjal: 80, okra: 40, chilli: 20,
  watermelon: 100, cucumber: 80, moong_zaid: 5, bottle_gourd: 80,
  pumpkin: 80, muskmelon: 80,
  sugarcane: 300, banana: 200, papaya: 150, coconut: 6,
};

// ─── Regional yield multipliers ───────────────────────────────────────────────
// Adjusts yield up/down based on how well a state grows that crop
const REGION_YIELD_MULTIPLIER = {
  'Punjab':           { wheat: 1.25, rice: 1.20, maize: 1.10, potato: 1.15 },
  'Haryana':          { wheat: 1.20, rice: 1.10, mustard: 1.15, sugarcane: 1.10 },
  'Uttar Pradesh':    { sugarcane: 1.30, wheat: 1.10, potato: 1.20 },
  'Madhya Pradesh':   { soybean: 1.25, chickpea: 1.20, wheat: 1.05, cotton: 1.10 },
  'Maharashtra':      { cotton: 1.20, soybean: 1.15, onion: 1.25, sugarcane: 1.15 },
  'Andhra Pradesh':   { rice: 1.15, chilli: 1.30, turmeric: 1.20, groundnut: 1.15 },
  'Telangana':        { rice: 1.15, cotton: 1.15, maize: 1.10, turmeric: 1.20 },
  'Karnataka':        { rice: 1.10, maize: 1.15, sunflower: 1.20, jowar: 1.10 },
  'Tamil Nadu':       { rice: 1.20, banana: 1.25, coconut: 1.30, turmeric: 1.15 },
  'Kerala':           { coconut: 1.40, ginger: 1.30, banana: 1.20 },
  'Gujarat':          { groundnut: 1.20, cotton: 1.15, castor: 1.25, bajra: 1.10 },
  'Rajasthan':        { mustard: 1.20, bajra: 1.15, barley: 1.10, coriander: 1.25 },
  'Bihar':            { rice: 1.10, wheat: 1.05, maize: 1.15, lentil: 1.10 },
  'West Bengal':      { rice: 1.20, potato: 1.15, brinjal: 1.20 },
  'Odisha':           { rice: 1.15, turmeric: 1.10, groundnut: 1.10 },
  'Himachal Pradesh': { potato: 1.20, pea: 1.25, cauliflower: 1.20 },
  'Uttarakhand':      { rice: 1.05, wheat: 1.05, potato: 1.10 },
  'Assam':            { rice: 1.15, ginger: 1.20 },
};

// ─── Cache: one entry per "state|district" so regions don't share stale data ──
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const priceCache   = new Map();

// ─── Groq client (lazy) ───────────────────────────────────────────────────────
let groqClient = null;
function getGroqClient() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function cacheKey(state, district) {
  return `${(state || 'national').toLowerCase()}|${(district || '').toLowerCase()}`;
}

// ─── Core: ask Groq for region-specific mandi prices ─────────────────────────
async function fetchRegionalPricesFromGroq(cropKeys, state, district) {
  const client   = getGroqClient();
  const location = [district, state].filter(Boolean).join(', ') || 'India';

  const prompt = `You are an Indian agricultural mandi price expert with deep knowledge
of local APMC wholesale markets.

Return ONLY a valid JSON object (no markdown, no explanation) mapping each crop key to
its current LOCAL wholesale mandi price in Indian Rupees per quintal (100 kg)
specifically for the ${location} region in India.

Key regional factors to consider for ${location}:
- Which crops are SURPLUS in this region (price will be lower — more supply)
- Which crops are DEFICIT in this region (price will be higher — less local supply)
- Distance from the nearest major mandi / APMC
- State government's SAP (State Advised Price) where applicable, e.g. UP for sugarcane
- Typical premium or discount vs national MSP for this area

Crop keys: ${cropKeys.join(', ')}

Rules:
- Use realistic 2024-25 season local mandi prices
- Prices may vary 10-40% from national MSP based on local supply/demand
- All values must be positive integers (no decimals, no units)

JSON format (example): {"wheat":2320,"rice":2150,"onion":1800,...}`;

  const response = await client.chat.completions.create({
    model:           'llama-3.3-70b-versatile',
    messages:        [{ role: 'user', content: prompt }],
    temperature:     0.15,
    max_tokens:      900,
    response_format: { type: 'json_object' },
  });

  const text   = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(text);

  // Validate — replace bad values with MSP fallback
  const out = {};
  for (const key of cropKeys) {
    const val = Number(parsed[key]);
    out[key]  = (val > 0 && isFinite(val))
      ? Math.round(val)
      : (MSP_FALLBACK[key] > 0 ? MSP_FALLBACK[key] : 1500);
  }
  return out;
}

// ─── Get prices for a region (cached) ────────────────────────────────────────
async function getRegionalPrices(state, district) {
  const key = cacheKey(state, district);
  const now = Date.now();
  const hit = priceCache.get(key);

  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    return { prices: hit.data, source: 'groq-live' };
  }

  try {
    const prices = await fetchRegionalPricesFromGroq(Object.keys(MSP_FALLBACK), state, district);
    priceCache.set(key, { data: prices, fetchedAt: now });
    console.log(`[GroqPriceService] Prices fetched for ${location}`);
    return { prices, source: 'groq-live' };
  } catch (err) {
    console.warn(`[GroqPriceService] Groq failed (${state}/${district}), using MSP fallback:`, err.message);
    const fallback = Object.fromEntries(
      Object.entries(MSP_FALLBACK).map(([k, v]) => [k, v > 0 ? v : 1500])
    );
    return { prices: fallback, source: 'msp-fallback' };
  }
}

// ─── Regional yield (base × state multiplier) ────────────────────────────────
function getRegionalYield(cropKey, state) {
  const base       = YIELD_PER_ACRE[cropKey] ?? 10;
  const multiplier = REGION_YIELD_MULTIPLIER[state]?.[cropKey] ?? 1.0;
  return Math.round(base * multiplier * 10) / 10;
}

// ─── Main export: enrich ML recommendations with regional income ──────────────
async function enrichRecommendations(recommendations, areaAcres = 1, state = 'Punjab', district = '') {
  const { prices, source } = await getRegionalPrices(state, district);

  return recommendations.map(crop => {
    const key = (
      crop.id ??
      crop.name?.toLowerCase().replace(/[\s()]/g, '_').replace(/_+/g, '_')
    )?.toLowerCase();

    const pricePerQuintal = prices[key] ?? (MSP_FALLBACK[key] > 0 ? MSP_FALLBACK[key] : 1500);
    const yieldPerAcre    = getRegionalYield(key, state);
    const baseIncome      = Math.round(pricePerQuintal * yieldPerAcre);
    const estimatedIncome = Math.round(baseIncome * areaAcres);

    return {
      ...crop,
      pricePerQuintal,
      yieldPerAcre,
      baseIncome,
      estimatedIncome,
      priceSource:  source,
      priceRegion:  [district, state].filter(Boolean).join(', '),
    };
  });
}

// ─── Utility exports ──────────────────────────────────────────────────────────
async function getAllPrices(state = 'Punjab', district = '') {
  return getRegionalPrices(state, district);
}

async function refreshPrices(state, district) {
  priceCache.delete(cacheKey(state, district));
  return getRegionalPrices(state, district);
}

module.exports = { getAllPrices, enrichRecommendations, refreshPrices, getRegionalYield };