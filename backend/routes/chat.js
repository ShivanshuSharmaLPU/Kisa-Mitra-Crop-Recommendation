// chat.js — KisanBot backend with DYNAMIC AI responses via Groq (Free)
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are KisanBot, an expert AI agricultural assistant for Indian farmers. You were built for the KisanMitra platform.

Your expertise covers:
- All major Indian crops: wheat, rice/paddy, barley, mustard, maize, cotton, sugarcane, soybean, potato, onion, tomato, chili, gram/chickpea, groundnut, lentil/masoor, turmeric, and more
- Fertilizer schedules (DAP, Urea, MOP, micronutrients like Zinc Sulphate, Boron, Gypsum)
- Pest and disease identification and treatment (fungicides, insecticides, dosages)
- Irrigation planning and water management
- Indian government schemes: PM-KISAN, PMFBY (crop insurance), Kisan Credit Card (KCC), SMAM, eNAM, Soil Health Card
- Mandi prices, MSP (Minimum Support Price) for all crops (use 2024-25 MSP values where known)
- Soil health analysis (pH, OC, N, P, K, Zinc, Boron, Iron deficiencies and corrections)
- Seasonal calendar (Kharif: June-Oct, Rabi: Nov-Apr, Zaid: Mar-Jun)
- Weather-based farm advisory

Key MSP values 2024-25 (rupees per quintal):
Wheat: 2275 | Paddy: 2300 | Maize: 2225 | Barley: 1735 | Gram: 5440
Mustard: 5650 | Soybean: 4892 | Groundnut: 6377 | Cotton long: 7121
Lentil: 6425 | Sunflower: 7280 | Sugarcane FRP: 315 per quintal

Language rules (VERY IMPORTANT):
- The user language will be specified as a tag at the start of their message like [lang:hi] or [lang:en]
- [lang:hi] means Reply ONLY in Hindi using Devanagari script. Use simple rural Hindi not formal.
- [lang:pa] means Reply ONLY in Punjabi using Gurmukhi script.
- [lang:ta] means Reply ONLY in Tamil script.
- [lang:te] means Reply ONLY in Telugu script.
- [lang:en] means Reply in English but you may mix common Hindi agricultural terms.
- Always match the script and language of your response to the user language tag. Never switch language mid-response.

Formatting rules:
- Use emojis to make responses friendly like 🌾 🐛 💊 💧 🌡️ 📊 🏛️ 🧪
- Use *bold* for section headers and important numbers
- Use bullet points for lists
- Keep responses practical, specific and actionable. Give exact quantities like kg per acre or ml per litre, timings like days after sowing, and product names
- For pest or disease questions always give the pesticide name plus dose plus timing
- For fertilizer questions always give the schedule with basal and top dressing with exact quantities
- End with a helpful follow-up tip or suggestion when relevant
- If you do not know exact current mandi prices say so honestly and direct them to enam.gov.in or agmarknet.gov.in
- Never make up government scheme details. If unsure direct to official portals
- You are friendly and helpful and speak like a knowledgeable agricultural extension officer who respects and understands farmers.`;

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { message = '', language = 'en', history = [] } = req.body;

  const lang = ['en', 'hi', 'pa', 'ta', 'te'].includes(language) ? language : 'en';

  if (!message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  try {
    // Build messages array with history
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Add last 10 conversation turns for context
    const recentHistory = history.slice(-10);
    for (const turn of recentHistory) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        messages.push({ role: turn.role, content: turn.content });
      }
    }

    // Add current user message with language tag
    messages.push({
      role: 'user',
      content: `[lang:${lang}] ${message}`,
    });

    // Call Groq API — llama3 is free and very capable
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const botReply = completion.choices[0]?.message?.content || '';

    return res.json({
      success: true,
      response: botReply,
      language: lang,
    });

  } catch (error) {
    console.error('Groq API error:', error);

    // Rate limit error
    if (error.status === 429) {
      const quotaMsgs = {
        en: '⚠️ Too many requests right now. Please wait a moment and try again.',
        hi: '⚠️ अभी बहुत अनुरोध हैं। कृपया थोड़ा रुकें और पुनः प्रयास करें।',
        pa: '⚠️ ਹੁਣ ਬਹੁਤ ਬੇਨਤੀਆਂ ਹਨ। ਕਿਰਪਾ ਥੋੜਾ ਰੁਕੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
        ta: '⚠️ இப்போது அதிக கோரிக்கைகள். சற்று நேரம் காத்து மீண்டும் முயற்சிக்கவும்.',
        te: '⚠️ ఇప్పుడు చాలా అభ్యర్థనలు ఉన్నాయి. కొంచెం ఆగి మళ్ళీ ప్రయత్నించండి.',
      };
      return res.status(429).json({
        success: false,
        response: quotaMsgs[lang] || quotaMsgs.en,
      });
    }

    // General error
    const errorMsgs = {
      en: '⚠️ Sorry, I am unable to respond right now. Please check your internet and try again.',
      hi: '⚠️ क्षमा करें, अभी जवाब देने में असमर्थ हूँ। इंटरनेट जांचें और पुनः प्रयास करें।',
      pa: '⚠️ ਮਾਫ਼ ਕਰੋ, ਹੁਣ ਜਵਾਬ ਦੇਣ ਵਿੱਚ ਅਸਮਰੱਥ ਹਾਂ। ਇੰਟਰਨੈੱਟ ਜਾਂਚੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      ta: '⚠️ மன்னிக்கவும், இப்போது பதில் அளிக்க முடியவில்லை. இணையம் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
      te: '⚠️ క్షమించండి, ఇప్పుడు స్పందించడం సాధ్యం కావడం లేదు. ఇంటర్నెట్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.',
    };

    return res.status(500).json({
      success: false,
      response: errorMsgs[lang] || errorMsgs.en,
      error: error.message,
    });
  }
});

module.exports = router;