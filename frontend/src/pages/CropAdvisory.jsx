import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import INDIA_STATES_CITIES from '../utils/indiaCities';
import { detectSoilType } from '../utils/soilMap';
import { getPrevCrops }   from '../utils/prevCropsMap';

import imgUrea from '../assets/fertilizer/urea.png';
import imgDAP  from '../assets/fertilizer/dap.png';
import imgMOP  from '../assets/fertilizer/mop.png';
const FERT_IMG = { urea: imgUrea, dap: imgDAP, mop: imgMOP };

// ─── Crop name translation table (used ONLY for prevCrop dropdown) ────────────
const CROP_NAMES = {
  wheat:       { en:'Wheat',       hi:'गेहूं',      pa:'ਕਣਕ',       ta:'கோதுமை',          te:'గోధుమ'           },
  rice:        { en:'Rice',        hi:'धान',         pa:'ਝੋਨਾ',      ta:'நெல்',            te:'వరి'             },
  paddy:       { en:'Paddy',       hi:'धान',         pa:'ਝੋਨਾ',      ta:'நெல்',            te:'వరి'             },
  maize:       { en:'Maize',       hi:'मक्का',       pa:'ਮੱਕੀ',      ta:'மக்காச்சோளம்',    te:'మొక్కజొన్న'      },
  corn:        { en:'Corn',        hi:'मक्का',       pa:'ਮੱਕੀ',      ta:'மக்காச்சோளம்',    te:'మొక్కజొన్న'      },
  cotton:      { en:'Cotton',      hi:'कपास',        pa:'ਕਪਾਹ',      ta:'பருத்தி',         te:'పత్తి'           },
  mustard:     { en:'Mustard',     hi:'सरसों',       pa:'ਸਰ੍ਹੋਂ',    ta:'கடுகு',           te:'ఆవాలు'           },
  sugarcane:   { en:'Sugarcane',   hi:'गन्ना',       pa:'ਗੰਨਾ',      ta:'கரும்பு',         te:'చెరకు'           },
  soybean:     { en:'Soybean',     hi:'सोयाबीन',     pa:'ਸੋਇਆਬੀਨ',   ta:'சோயாபீன்',        te:'సోయాబీన్'        },
  tomato:      { en:'Tomato',      hi:'टमाटर',       pa:'ਟਮਾਟਰ',     ta:'தக்காளி',         te:'టమాట'            },
  onion:       { en:'Onion',       hi:'प्याज',       pa:'ਪਿਆਜ਼',     ta:'வெங்காயம்',       te:'ఉల్లిపాయ'        },
  potato:      { en:'Potato',      hi:'आलू',         pa:'ਆਲੂ',       ta:'உருளைக்கிழங்கு',  te:'బంగాళాదుంప'      },
  chickpea:    { en:'Chickpea',    hi:'चना',         pa:'ਛੋਲੇ',      ta:'கொண்டைக்கடலை',    te:'శనగ'             },
  gram:        { en:'Chickpea',    hi:'चना',         pa:'ਛੋਲੇ',      ta:'கொண்டைக்கடலை',    te:'శనగ'             },
  groundnut:   { en:'Groundnut',   hi:'मूंगफली',      pa:'ਮੂੰਗਫਲੀ',   ta:'வேர்க்கடலை',      te:'వేరుశనగ'         },
  sunflower:   { en:'Sunflower',   hi:'सूरजमुखी',    pa:'ਸੂਰਜਮੁਖੀ',  ta:'சூரியகாந்தி',     te:'పొద్దుతిరుగుడు'   },
  sorghum:     { en:'Sorghum',     hi:'ज्वार',       pa:'ਜਵਾਰ',      ta:'சோளம்',           te:'జొన్న'           },
  barley:      { en:'Barley',      hi:'जौ',          pa:'ਜੌਂ',       ta:'பார்லி',          te:'యవలు'            },
  chili:       { en:'Chili',       hi:'मिर्च',       pa:'ਮਿਰਚ',      ta:'மிளகாய்',         te:'మిర్చి'          },
  brinjal:     { en:'Brinjal',     hi:'बैंगन',       pa:'ਬੈਂਗਣ',     ta:'கத்தரிக்காய்',    te:'వంకాయ'           },
  cauliflower: { en:'Cauliflower', hi:'फूलगोभी',     pa:'ਫੁੱਲਗੋਭੀ',  ta:'காலிஃப்ளவர்',     te:'కాలీఫ్లవర్'      },
  lentil:      { en:'Lentil',      hi:'मसूर',        pa:'ਮਸੂਰ',      ta:'மசூர்',           te:'మసూర్'           },
  turmeric:    { en:'Turmeric',    hi:'हल्दी',       pa:'ਹਲਦੀ',      ta:'மஞ்சள்',          te:'పసుపు'           },
  pea:         { en:'Pea',         hi:'मटर',         pa:'ਮਟਰ',       ta:'பட்டாணி',         te:'బఠాణీ'           },
  moong:       { en:'Moong',       hi:'मूंग',        pa:'ਮੂੰਗ',      ta:'பாசிப்பயறு',      te:'పెసలు'           },
  arhar:       { en:'Arhar',       hi:'अरहर',        pa:'ਅਰਹਰ',      ta:'துவரம்பருப்பு',   te:'కంది'            },
  none:        { en:'None',        hi:'कोई नहीं',    pa:'ਕੋਈ ਨਹੀਂ',  ta:'எதுவுமில்லை',     te:'ఏదీ లేదு'        },
};

/**
 * Translate prevCrop dropdown label using the crop's value key.
 * ONLY used for the Previous Crop dropdown — NOT for ML result cards.
 */
function translatePrevCropLabel(cropValue, originalLabel, lang) {
  const key = (cropValue || '').toLowerCase();
  if (CROP_NAMES[key]) return CROP_NAMES[key][lang] || CROP_NAMES[key].en || originalLabel;
  const partial = Object.keys(CROP_NAMES).find(k => key.includes(k));
  if (partial) return CROP_NAMES[partial][lang] || CROP_NAMES[partial].en || originalLabel;
  return originalLabel;
}

// ─── UI Translation Map ───────────────────────────────────────────────────────
const UI = {
  pageTitle:      { en:'Crop Advisory',               hi:'फसल सलाह',               pa:'ਫਸਲ ਸਲਾਹ',               ta:'பயிர் ஆலோசனை',             te:'పంట సలహా'               },
  pageSubtitle:   { en:'AI-powered crop recommendations using ML models trained on Indian agricultural data', hi:'भारतीय कृषि डेटा पर प्रशिक्षित ML मॉडल द्वारा AI-संचालित फसल सिफारिशें', pa:'ਭਾਰਤੀ ਖੇਤੀਬਾੜੀ ਡੇਟਾ ਤੇ ਸਿਖਲਾਈ ਪ੍ਰਾਪਤ ML ਮਾਡਲਾਂ ਦੁਆਰਾ AI-ਸੰਚਾਲਿਤ ਫਸਲ ਸਿਫ਼ਾਰਸ਼ਾਂ', ta:'இந்திய வேளாண்மை தரவில் பயிற்றுவிக்கப்பட்ட ML மாதிரிகளைப் பயன்படுத்தி AI-இயக்கப்படும் பயிர் பரிந்துரைகள்', te:'భారత వ్యవసాయ డేటాపై శిక్షణ పొందిన ML మోడళ్లతో AI-ఆధారిత పంట సిఫార్సులు' },
  farmDetails:    { en:'Farm Details',                hi:'खेत की जानकारी',           pa:'ਖੇਤ ਦੀ ਜਾਣਕਾਰੀ',           ta:'பண்ணை விவரங்கள்',           te:'పొలం వివరాలు'            },
  state:          { en:'State',                       hi:'राज्य',                    pa:'ਰਾਜ',                      ta:'மாநிலம்',                   te:'రాష్ట్రం'               },
  district:       { en:'District',                    hi:'जिला',                     pa:'ਜ਼ਿਲ੍ਹਾ',                  ta:'மாவட்டம்',                  te:'జిల్లా'                  },
  season:         { en:'Season',                      hi:'सीजन',                     pa:'ਸੀਜ਼ਨ',                    ta:'சீசன்',                     te:'సీజన్'                  },
  soilType:       { en:'Soil Type',                   hi:'मिट्टी का प्रकार',          pa:'ਮਿੱਟੀ ਦੀ ਕਿਸਮ',             ta:'மண் வகை',                   te:'నేల రకం'                 },
  autoDetected:   { en:'auto-detected',               hi:'स्वतः पहचाना',              pa:'ਆਪਣੇ ਆਪ ਖੋਜਿਆ',             ta:'தானாக கண்டறியப்பட்டது',    te:'స్వయంచాలకంగా గుర్తించబడింది' },
  landArea:       { en:'Land Area (acres)',            hi:'खेत का क्षेत्र (एकड़)',      pa:'ਜ਼ਮੀਨ ਦਾ ਖੇਤਰ (ਏਕੜ)',        ta:'நில பரப்பு (ஏக்கர்)',       te:'భూ విస్తీర్ణం (ఎకరాలు)'  },
  irrigation:     { en:'Irrigation Source',           hi:'सिंचाई स्रोत',              pa:'ਸਿੰਚਾਈ ਸਰੋਤ',               ta:'நீர்ப்பாசன ஆதாரம்',        te:'నీటిపారుదల వనరు'         },
  prevCrop:       { en:'Previous Crop',               hi:'पिछली फसल',                pa:'ਪਿਛਲੀ ਫਸਲ',                ta:'முந்தைய பயிர்',             te:'మునుపటి పంట'             },
  regionAware:    { en:'region-aware',                hi:'क्षेत्र-आधारित',            pa:'ਖੇਤਰ-ਅਧਾਰਿਤ',               ta:'பகுதி-விழிப்புடன்',        te:'ప్రాంత-అవగాహన'           },
  getRecommend:   { en:'Get Recommendations',      hi:' सिफारिश पाएं',           pa:' ਸਿਫ਼ਾਰਸ਼ਾਂ ਪ੍ਰਾਪਤ ਕਰੋ',   ta:'பரிந்துரைகள் பெறுங்கள்', te:' సిఫార్సులు పొందండి'   },
  analyzing:      { en:'AI Analyzing...',             hi:'AI विश्लेषण कर रहा है...',  pa:'AI ਵਿਸ਼ਲੇਸ਼ਣ ਕਰ ਰਿਹਾ ਹੈ...', ta:'AI பகுப்பாய்வு செய்கிறது...', te:'AI విశ్లేషిస్తోంది...'   },
  aiReco:         { en:'AI Recommendations',          hi:'AI सिफारिशें',              pa:'AI ਸਿਫ਼ਾਰਸ਼ਾਂ',              ta:'AI பரிந்துரைகள்',           te:'AI సిఫార్సులు'           },
  aiScore:        { en:'AI Score',                    hi:'AI स्कोर',                  pa:'AI ਸਕੋਰ',                   ta:'AI மதிப்பெண்',              te:'AI స్కోర్'               },
  duration:       { en:'Duration',                    hi:'अवधि',                      pa:'ਮਿਆਦ',                      ta:'காலம்',                     te:'వ్యవధి'                  },
  water:          { en:'Water',                       hi:'पानी',                      pa:'ਪਾਣੀ',                      ta:'நீர்',                      te:'నీరు'                    },
  estIncome:      { en:'Est. Income',                 hi:'अनुमानित आय',               pa:'ਅਨੁਮਾਨਿਤ ਆਮਦਨ',              ta:'மதிப்பிடப்பட்ட வருமானம்',  te:'అంచనా ఆదాయం'             },
  fertSchedule:   { en:'Fertilizer Schedule',         hi:'खाद अनुसूची',               pa:'ਖਾਦ ਅਨੁਸੂਚੀ',                ta:'உர அட்டவணை',                te:'ఎరువు షెడ్యూల్'          },
  irrigPlan:      { en:'Irrigation Plan',             hi:'सिंचाई योजना',              pa:'ਸਿੰਚਾਈ ਯੋਜਨਾ',               ta:'நீர்ப்பாசன திட்டம்',       te:'నీటిపారుదల ప్రణాళిక'    },
  irrigPoints:    {
    en:['Ensure proper watering throughout crop growth.','Use drip or sprinkler irrigation for efficiency.','Timely watering improves yield quality.'],
    hi:['फसल के पूरे विकास में सही सिंचाई सुनिश्चित करें।','दक्षता के लिए ड्रिप या स्प्रिंकलर सिंचाई का उपयोग करें।','समय पर सिंचाई उपज की गुणवत्ता में सुधार करती है।'],
    pa:['ਫਸਲ ਦੇ ਪੂਰੇ ਵਿਕਾਸ ਵਿੱਚ ਸਹੀ ਸਿੰਚਾਈ ਯਕੀਨੀ ਕਰੋ।','ਦਕਸ਼ਤਾ ਲਈ ਡਰਿੱਪ ਜਾਂ ਸਪ੍ਰਿੰਕਲਰ ਸਿੰਚਾਈ ਵਰਤੋ।','ਸਮੇਂ ਸਿਰ ਸਿੰਚਾਈ ਝਾੜ ਦੀ ਗੁਣਵੱਤਾ ਸੁਧਾਰਦੀ ਹੈ।'],
    ta:['பயிர் வளர்ச்சி முழுவதும் சரியான நீர்ப்பாசனம் உறுதிசெய்யுங்கள்.','திறமைக்காக சொட்டு அல்லது தெளிப்பு நீர்ப்பாசனம் பயன்படுத்தவும்.','சரியான நேர நீர்ப்பாசனம் மகசூல் தரத்தை மேம்படுத்துகிறது.'],
    te:['పంట వృద్ధి అంతటా సరైన నీటిపారుదల నిర్ధారించండి.','సామర్థ్యం కోసం చుక్క లేదా స్ప్రింక్లర్ నీటిపారుదల వాడండి.','సకాలంలో నీటిపారుదల దిగుబడి నాణ్యతను మెరుగుపరుస్తుంది.'],
  },
  rainWarning:    { en:'Rain-fed: yield may be 20–30% lower without assured water.', hi:'वर्षा आधारित: सुनिश्चित पानी के बिना उपज 20–30% कम हो सकती है।', pa:'ਬਾਰਿਸ਼ ਆਧਾਰਿਤ: ਨਿਸ਼ਚਿਤ ਪਾਣੀ ਤੋਂ ਬਿਨਾਂ ਝਾੜ 20–30% ਘੱਟ ਹੋ ਸਕਦਾ ਹੈ।', ta:'மழை நீர்: உறுதிப்படுத்தப்பட்ட நீர் இல்லாமல் மகசூல் 20–30% குறையலாம்.', te:'వర్షాధారం: నిర్ధారిత నీరు లేకుండా దిగుబడి 20–30% తక్కువగా ఉండవచ్చు.' },
  sowingTime:     { en:'Best Time to Sow',            hi:'बुवाई का सही समय',          pa:'ਬਿਜਾਈ ਦਾ ਸਹੀ ਸਮਾਂ',          ta:'விதைக்க சிறந்த நேரம்',     te:'విత్తే సరైన సమయం'        },
  sowingPoints:   {
    en:['Sow the crop at the right time.','Timely sowing improves crop growth.','Healthy plants give higher yield.'],
    hi:['फसल को सही समय पर बोएं।','समय पर बुवाई फसल की वृद्धि में सुधार करती है।','स्वस्थ पौधे अधिक उपज देते हैं।'],
    pa:['ਫਸਲ ਨੂੰ ਸਹੀ ਸਮੇਂ ਤੇ ਬੀਜੋ।','ਸਮੇਂ ਸਿਰ ਬਿਜਾਈ ਫਸਲ ਦੇ ਵਿਕਾਸ ਨੂੰ ਸੁਧਾਰਦੀ ਹੈ।','ਸਿਹਤਮੰਦ ਪੌਦੇ ਵੱਧ ਝਾੜ ਦਿੰਦੇ ਹਨ।'],
    ta:['சரியான நேரத்தில் பயிரை விதைக்கவும்.','சரியான நேர விதைப்பு பயிர் வளர்ச்சியை மேம்படுத்துகிறது.','ஆரோக்கியமான செடிகள் அதிக மகசூல் தருகின்றன.'],
    te:['పంటను సరైన సమయంలో విత్తండి.','సకాలంలో విత్తడం పంట వృద్ధిని మెరుగుపరుస్తుంది.','ఆరోగ్యకరమైన మొక్కలు అధిక దిగుబడి ఇస్తాయి.'],
  },
  seasonLabel:    { en:'Season',    hi:'सीजन',     pa:'ਸੀਜ਼ਨ',     ta:'சீசன்',    te:'సీజన్'   },
  soilLabel:      { en:'Soil Type', hi:'मिट्टी का प्रकार', pa:'ਮਿੱਟੀ ਦੀ ਕਿਸਮ', ta:'மண் வகை', te:'నేల రకం' },
  soilSection:    { en:'Soil Type', hi:'मिट्टी का प्रकार', pa:'ਮਿੱਟੀ ਦੀ ਕਿਸਮ', ta:'மண் வகை', te:'నేల రకం' },
  soilPoints:     {
    en:['Fertile soil gives better crop growth.','Good drainage is important.','Balanced nutrients help plants grow strong.'],
    hi:['उपजाऊ मिट्टी बेहतर फसल विकास देती है।','अच्छी जल निकासी महत्वपूर्ण है।','संतुलित पोषक तत्व पौधों को मजबूत बनाते हैं।'],
    pa:['ਉਪਜਾਊ ਮਿੱਟੀ ਬਿਹਤਰ ਫਸਲ ਵਿਕਾਸ ਦਿੰਦੀ ਹੈ।','ਚੰਗੀ ਨਿਕਾਸੀ ਮਹੱਤਵਪੂਰਨ ਹੈ।','ਸੰਤੁਲਿਤ ਪੋਸ਼ਕ ਤੱਤ ਪੌਦਿਆਂ ਨੂੰ ਮਜ਼ਬੂਤ ਬਣਾਉਂਦੇ ਹਨ।'],
    ta:['வளமான மண் சிறந்த பயிர் வளர்ச்சியை தருகிறது.','நல்ல வடிகால் முக்கியமானது.','சமச்சீர் ஊட்டச்சத்துக்கள் செடிகளை வலிமையாக வளர்க்கின்றன.'],
    te:['సారవంతమైన నేల మంచి పంట వృద్ధిని ఇస్తుంది.','మంచి నీటి పారుదల ముఖ్యం.','సమతుల్యమైన పోషకాలు మొక్కలను బలంగా పెంచుతాయి.'],
  },
  cropComparison: { en:'Crop Comparison Table',   hi:'फसल तुलना तालिका',   pa:'ਫਸਲ ਤੁਲਨਾ ਸਾਰਣੀ',   ta:'பயிர் ஒப்பீட்டு அட்டவணை', te:'పంట పోలిక పట్టిక'      },
  crop:           { en:'Crop',     hi:'फसल',       pa:'ਫਸਲ',       ta:'பயிர்',    te:'పంట'     },
  best:           { en:'Best',     hi:'सर्वश्रेष्ठ', pa:'ਸਭ ਤੋਂ ਵਧੀਆ', ta:'சிறந்தது', te:'ఉత్తమం'  },
  completeFarm:   { en:'Complete Farming Guide',   hi:'पूरी खेती मार्गदर्शिका', pa:'ਪੂਰੀ ਖੇਤੀ ਮਾਰਗਦਰਸ਼ਕ', ta:'முழுமையான விவசாய வழிகாட்டி', te:'పూర్తి వ్యవసాయ మార్గదర్శకం' },
  days:           { en:'days',     hi:'दिन',        pa:'ਦਿਨ',        ta:'நாட்கள்',  te:'రోజులు'  },
  perAcre:        { en:'per acre', hi:'प्रति एकड़',  pa:'ਪ੍ਰਤੀ ਏਕੜ',  ta:'ஏக்கருக்கு', te:'ఎకరాకు' },
  notRequired:    { en:'— Not required —', hi:'— आवश्यक नहीं —', pa:'— ਲੋੜੀਂਦਾ ਨਹੀਂ —', ta:'— தேவையில்லை —', te:'— అవసరం లేదు —' },
  tips:           { en:'tips',     hi:'सुझाव',      pa:'ਸੁਝਾਅ',      ta:'குறிப்புகள்', te:'సూచనలు' },
  basalDose:      { en:'Basal Dose',       hi:'बेसल खुराक',         pa:'ਬੇਸਲ ਖੁਰਾਕ',         ta:'அடிக்கட்டு உரம்',    te:'బేసల్ మోతాదు'        },
  firstTopDress:  { en:'1st Top Dressing', hi:'पहली टॉप ड्रेसिंग',  pa:'ਪਹਿਲੀ ਟਾਪ ਡ੍ਰੈਸਿੰਗ',  ta:'1வது மேல்பூச்சு',    te:'1వ టాప్ డ్రెస్సింగ్'  },
  secondTopDress: { en:'2nd Top Dressing', hi:'दूसरी टॉप ड्रेसिंग', pa:'ਦੂਜੀ ਟਾਪ ਡ੍ਰੈਸਿੰਗ',   ta:'2வது மேல்பூச்சு',    te:'2వ టాప్ డ్రెస్సింగ్'  },
  step1:          { en:'1st Step', hi:'पहला चरण',  pa:'ਪਹਿਲਾ ਕਦਮ',  ta:'1வது படி',  te:'1వ దశ'  },
  step2:          { en:'2nd Step', hi:'दूसरा चरण', pa:'ਦੂਜਾ ਕਦਮ',   ta:'2வது படி',  te:'2వ దశ'  },
  step3:          { en:'3rd Step', hi:'तीसरा चरण', pa:'ਤੀਜਾ ਕਦਮ',   ta:'3வது படி',  te:'3వ దశ'  },
  atSowing:       { en:'At sowing time',              hi:'बुवाई के समय',              pa:'ਬਿਜਾਈ ਸਮੇਂ',                ta:'விதைக்கும் நேரத்தில்',      te:'విత్తే సమయంలో'            },
  atTransplanting:{ en:'At transplanting',             hi:'रोपाई के समय',              pa:'ਪਨੀਰੀ ਲਾਉਣ ਵੇਲੇ',           ta:'நடவு செய்யும் நேரத்தில்',   te:'నాటే సమయంలో'              },
  mixSoil:        { en:'Mix into soil before sowing',  hi:'बुवाई से पहले मिट्टी में मिलाएं', pa:'ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਮਿੱਟੀ ਵਿੱਚ ਮਿਲਾਓ', ta:'விதைப்பதற்கு முன் மண்ணில் கலக்கவும்', te:'విత్తే ముందు నేలలో కలపండి' },
  mixSoilRice:    { en:'Mix in soil before planting seedlings', hi:'पौध लगाने से पहले मिट्टी में मिलाएं', pa:'ਪਨੀਰੀ ਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਮਿੱਟੀ ਵਿੱਚ ਮਿਲਾਓ', ta:'நாற்றுகளை நடுவதற்கு முன் மண்ணில் கலக்கவும்', te:'మొక్కలు నాటే ముందు నేలలో కలపండి' },
  afterIrrig1:    { en:'After 1st irrigation',         hi:'पहली सिंचाई के बाद',         pa:'ਪਹਿਲੀ ਸਿੰਚਾਈ ਤੋਂ ਬਾਅਦ',      ta:'முதல் நீர்ப்பாசனத்திற்கு பிறகு', te:'మొదటి నీటిపారుదల తర్వాత'  },
  afterIrrig2:    { en:'After 2nd irrigation',         hi:'दूसरी सिंचाई के बाद',        pa:'ਦੂਜੀ ਸਿੰਚਾਈ ਤੋਂ ਬਾਅਦ',       ta:'இரண்டாவது நீர்ப்பாசனத்திற்கு பிறகு', te:'రెండవ నీటిపారుదల తర్వాత' },
  spreadWetField: { en:'Spread on wet field',          hi:'गीले खेत में फैलाएं',        pa:'ਗਿੱਲੇ ਖੇਤ ਵਿੱਚ ਫੈਲਾਓ',       ta:'ஈரமான வயலில் பரப்பவும்',   te:'తడి పొలంలో చల్లండి'        },
  atFlowering:    { en:'When first flowers open',      hi:'जब पहले फूल खिलें',          pa:'ਜਦੋਂ ਪਹਿਲੇ ਫੁੱਲ ਖਿੜਨ',        ta:'முதல் பூக்கள் மலரும்போது',  te:'మొదటి పూలు వచ్చినప్పుడు'  },
  mustardNoStep3: { en:'Mustard does not need this',   hi:'सरसों को इसकी जरूरत नहीं',  pa:'ਸਰ੍ਹੋਂ ਨੂੰ ਇਸ ਦੀ ਲੋੜ ਨਹੀਂ',   ta:'கடுகுக்கு இது தேவையில்லை',  te:'ఆవాలకు ఇది అవసరం లేదు'    },
  twentyDaysRice: { en:'20–25 days after planting',    hi:'रोपाई के 20–25 दिन बाद',     pa:'ਪਨੀਰੀ ਲਾਉਣ ਤੋਂ 20–25 ਦਿਨ ਬਾਅਦ', ta:'நடவுக்கு 20–25 நாட்கள் பிறகு', te:'నాటిన 20–25 రోజుల తర్వాత'  },
  twentyDaysSow:  { en:'21–25 days after sowing',      hi:'बुवाई के 21–25 दिन बाद',     pa:'ਬਿਜਾਈ ਤੋਂ 21–25 ਦਿਨ ਬਾਅਦ',   ta:'விதைத்த 21–25 நாட்கள் பிறகு', te:'విత్తిన 21–25 రోజుల తర్వాత' },
  fortyFiveDays:  { en:'45–50 days after sowing',      hi:'बुवाई के 45–50 दिन बाद',     pa:'ਬਿਜਾਈ ਤੋਂ 45–50 ਦਿਨ ਬਾਅਦ',   ta:'விதைத்த 45–50 நாட்கள் பிறகு', te:'విత్తిన 45–50 రోజుల తర్వాత' },
  fortyFiveRice:  { en:'45 days after planting',       hi:'रोपाई के 45 दिन बाद',        pa:'ਪਨੀਰੀ ਲਾਉਣ ਤੋਂ 45 ਦਿਨ ਬਾਅਦ', ta:'நடவுக்கு 45 நாட்கள் பிறகு', te:'నాటిన 45 రోజుల తర్వాత'     },
  mustardFlower:  { en:'At flowering',                 hi:'फूल आने पर',                 pa:'ਫੁੱਲ ਆਉਣ ਤੇ',               ta:'பூக்கும் நேரத்தில்',         te:'పూత సమయంలో'               },
  mustardNeed:    { en:'Not needed',                   hi:'जरूरी नहीं',                 pa:'ਲੋੜੀਂਦਾ ਨਹੀਂ',               ta:'தேவையில்லை',                 te:'అవసరం లేదు'                },
  beforeGrain:    { en:'Before grain formation',       hi:'दाना बनने से पहले',           pa:'ਦਾਣਾ ਬਣਨ ਤੋਂ ਪਹਿਲਾਂ',        ta:'தானிய உருவாக்கத்திற்கு முன்', te:'గింజ ఏర్పడే ముందు'          },
};

const u = (key, lang) => UI[key]?.[lang] || UI[key]?.en || key;

const L = {
  clickHint:    { en:'👆 Click any crop card to see the full AI guide in your language', hi:'👆 पूरी AI गाइड देखने के लिए किसी भी कार्ड पर क्लिक करें', pa:'👆 ਪੂਰੀ AI ਗਾਈਡ ਦੇਖਣ ਲਈ ਕਿਸੇ ਵੀ ਕਾਰਡ ਤੇ ਕਲਿੱਕ ਕਰੋ', ta:'👆 முழு AI வழிகாட்டியை பார்க்க எந்த அட்டையிலும் கிளிக் செய்யுங்கள்', te:'👆 పూర్తి AI గైడ్ చూడటానికి ఏదైనా కార్డ్ పై క్లిక్ చేయండి' },
  fullGuide:    { en:'Full Guide',    hi:'पूरी जानकारी',      pa:'ਪੂਰੀ ਜਾਣਕਾਰੀ',      ta:'முழு வழிகாட்டி',      te:'పూర్తి గైడ్'       },
  clickForGuide:{ en:'Farming Guide', hi:'कृषि मार्गदर्शिका', pa:'ਖੇਤੀ ਮਾਰਗਦਰਸ਼ਕ',     ta:'விவசாய வழிகாட்டி',   te:'వ్యవసాయ గైడ్'      },
  prev:         { en:'← Prev',        hi:'← पिछला',           pa:'← ਪਿਛਲਾ',            ta:'← முந்தைய',          te:'← వెనుక'           },
  next:         { en:'Next →',        hi:'अगला →',            pa:'ਅਗਲਾ →',             ta:'அடுத்து →',          te:'తదుపరి →'          },
  closeHint:    { en:'Click outside or press Esc to close', hi:'बाहर क्लिक करें या Esc दबाएं', pa:'ਬੰਦ ਕਰਨ ਲਈ ਬਾਹਰ ਕਲਿੱਕ ਕਰੋ ਜਾਂ Esc ਦਬਾਓ', ta:'மூட வெளியே கிளிக் செய்யுங்கள் அல்லது Esc அழுத்துங்கள்', te:'మూసివేయడానికి బయట క్లిక్ చేయండి లేదా Esc నొక్కండి' },
  schemeCTA:    { en:'Open the Govt Schemes tab for full eligibility details and how to apply.', hi:'पात्रता और आवेदन की पूरी जानकारी के लिए "सरकारी योजनाएं" टैब खोलें।', pa:'ਯੋਗਤਾ ਅਤੇ ਅਰਜ਼ੀ ਦੀ ਪੂਰੀ ਜਾਣਕਾਰੀ ਲਈ "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ" ਟੈਬ ਖੋਲ੍ਹੋ।', ta:'முழு விவரங்களுக்கு "அரசு திட்டங்கள்" தாவலை திறக்கவும்.', te:'పూర్తి వివరాల కోసం "ప్రభుత్వ పథకాలు" ట్యాబ్ తెరవండి.' },
};
const t = (key, lang) => L[key]?.[lang] || L[key]?.en || '';

const SECTIONS = {
  overview:   { icon:'🌾', label:{ en:'Crop Overview',       hi:'फसल सारांश',       pa:'ਫਸਲ ਸੰਖੇਪ',        ta:'பயிர் கண்ணோட்டம்',   te:'పంట సారాంశం'        }, dot:'bg-green-400',  grad:'from-green-900/60 to-emerald-900/30 border-green-500/30'  },
  sowing:     { icon:'🌱', label:{ en:'Sowing Guide',        hi:'बुवाई मार्गदर्शन',  pa:'ਬਿਜਾਈ ਗਾਈਡ',        ta:'விதைப்பு வழிகாட்டி',  te:'విత్తే మార్గదర్శకం'  }, dot:'bg-teal-400',   grad:'from-teal-900/50 to-cyan-900/25 border-teal-500/25'       },
  fertilizer: { icon:'💊', label:{ en:'Fertilizer Schedule', hi:'खाद अनुसूची',       pa:'ਖਾਦ ਅਨੁਸੂਚੀ',        ta:'உர அட்டவணை',          te:'ఎరువు షెడ్యూల్'      }, dot:'bg-amber-400',  grad:'from-amber-900/50 to-yellow-900/25 border-amber-500/25'   },
  irrigation: { icon:'💧', label:{ en:'Irrigation Plan',     hi:'सिंचाई योजना',      pa:'ਸਿੰਚਾਈ ਯੋਜਨਾ',       ta:'நீர்ப்பாசன திட்டம்',  te:'నీటిపారుదల ప్రణాళిక' }, dot:'bg-sky-400',    grad:'from-sky-900/50 to-blue-900/25 border-sky-500/25'         },
  pest:       { icon:'🐛', label:{ en:'Pest & Disease',      hi:'कीट व रोग सावधानी', pa:'ਕੀੜੇ ਤੇ ਬਿਮਾਰੀ',     ta:'பூச்சி மற்றும் நோய்', te:'తెగులు మరియు వ్యాధి'  }, dot:'bg-red-400',    grad:'from-red-900/45 to-rose-900/20 border-red-500/20'         },
  harvest:    { icon:'✂️', label:{ en:'Harvest & Storage',   hi:'कटाई व भंडारण',     pa:'ਕਟਾਈ ਤੇ ਭੰਡਾਰਣ',     ta:'அறுவடை மற்றும் சேமிப்பு', te:'పంటకోత మరియు నిల్వ' }, dot:'bg-purple-400', grad:'from-purple-900/45 to-violet-900/20 border-purple-500/20' },
  schemes:    { icon:'🏛️', label:{ en:'Govt Schemes',        hi:'सरकारी योजनाएं',    pa:'ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ',    ta:'அரசு திட்டங்கள்',    te:'ప్రభుత్వ పథకాలు'     }, dot:'bg-indigo-400', grad:'from-indigo-900/45 to-blue-900/20 border-indigo-500/20'   },
};
const SECTION_KEYS = Object.keys(SECTIONS);

const SEASON_LABELS = { en:{ rabi:'Rabi', kharif:'Kharif', zaid:'Zaid' }, hi:{ rabi:'रबी', kharif:'खरीफ', zaid:'जायद' }, pa:{ rabi:'ਰਬੀ', kharif:'ਖਰੀਫ਼', zaid:'ਜ਼ੈਦ' }, ta:{ rabi:'ரபி', kharif:'காரிஃப்', zaid:'ஜாய்த்' }, te:{ rabi:'రబీ', kharif:'ఖరీఫ్', zaid:'జాయద్' } };
const SEASON_OPTS   = { en:[['rabi','Rabi (Oct-Mar)'],['kharif','Kharif (Jun-Oct)'],['zaid','Zaid (Mar-Jun)']], hi:[['rabi','रबी (अक्टू-मार्च)'],['kharif','खरीफ (जून-अक्टू)'],['zaid','जायद (मार्च-जून)']], pa:[['rabi','ਰਬੀ (ਅਕਤੂ-ਮਾਰਚ)'],['kharif','ਖਰੀਫ਼ (ਜੂਨ-ਅਕਤੂ)'],['zaid','ਜ਼ੈਦ (ਮਾਰਚ-ਜੂਨ)']], ta:[['rabi','ரபி (அக்-மார்)'],['kharif','காரிஃப் (ஜூன்-அக்)'],['zaid','ஜாய்த் (மார்-ஜூன்)']], te:[['rabi','రబీ (అక్టో-మార్)'],['kharif','ఖరీఫ్ (జూన్-అక్టో)'],['zaid','జాయద్ (మార్-జూన్)']] };
const SOIL_LABELS   = { en:{ alluvial:'Alluvial', black:'Black', red:'Red', sandy:'Sandy', clay:'Clay' }, hi:{ alluvial:'जलोढ़', black:'काली', red:'लाल', sandy:'रेतीली', clay:'चिकनी' }, pa:{ alluvial:'ਜਲੋਢ਼', black:'ਕਾਲੀ', red:'ਲਾਲ', sandy:'ਰੇਤਲੀ', clay:'ਚਿਕਣੀ' }, ta:{ alluvial:'வண்டல்', black:'கருப்பு', red:'சிவப்பு', sandy:'மணல்', clay:'களிமண்' }, te:{ alluvial:'జలోఢ', black:'నల్లరేగడి', red:'ఎర్రనేల', sandy:'ఇసుక', clay:'బంకమట్టి' } };
const IRRIG_LABELS  = { en:{ canal:'Canal', borewell:'Borewell', rain:'Rain-fed', drip:'Drip' }, hi:{ canal:'नहर', borewell:'बोरवेल', rain:'वर्षा', drip:'ड्रिप' }, pa:{ canal:'ਨਹਿਰ', borewell:'ਬੋਰਵੈੱਲ', rain:'ਬਾਰਿਸ਼', drip:'ਡਰਿੱਪ' }, ta:{ canal:'கால்வாய்', borewell:'ஆழ்துளை கிணறு', rain:'மழை நீர்', drip:'சொட்டு நீர்' }, te:{ canal:'కాలువ', borewell:'బోర్‌వెల్', rain:'వర్షాధారం', drip:'చుక్క నీరు' } };

// ─── Modal summary builder ────────────────────────────────────────────────────
function buildSummary(crop, area, season, lang) {
  const income = (crop.baseIncome ? Math.round(crop.baseIncome * area) : crop.estimatedIncome)?.toLocaleString();
  const seasonLabel = SEASON_LABELS[lang]?.[season] || season;
  // NOTE: crop.name is always the English name from ML — kept as-is in summaries
  const content = {
    en: {
      overview:[`${crop.icon} ${crop.name} is the #1 AI-recommended crop for your farm this ${seasonLabel} season.`,`AI Suitability Score: ${crop.mlScore}% — based on your soil type, water source, and local climate.`,`Crop Duration: ${crop.days} days from sowing to harvest.`,`Water Requirement: ${crop.waterNeed} — plan your irrigation schedule accordingly.`,`Estimated Income: ₹${income} for your ${area}-acre farm at current MSP rates.`,`This recommendation factors in your previous crop, soil health, and regional suitability.`],
      sowing:[`Sow seeds at the correct depth — generally 3–5 cm deep in well-tilled soil.`,`Always use certified seeds from a government-approved variety for best germination.`,`Maintain proper row spacing so sunlight and airflow reach every plant evenly.`,`Water the field lightly after sowing to ensure good seed-to-soil contact.`,`Treat seeds with fungicide (Thiram or Carbendazim) before sowing to prevent seed-borne disease.`,`Sow at the recommended time for your season — delayed sowing reduces yield by 1–2% per week.`],
      fertilizer:[`Step 1 — At sowing: Apply DAP + MOP as basal dose; mix into soil 5–7 cm deep before sowing.`,`Step 2 — 20–25 days: First Urea top-dressing after the first irrigation. Enhances root growth.`,`Step 3 — 45–50 days: Second Urea dose after second irrigation. Critical for grain filling.`,`If Zinc is below 0.6 ppm in your soil, add Zinc Sulphate 8–10 kg/acre in the basal dose.`,`If Organic Carbon is below 0.5%, apply 4–5 tonnes of farmyard manure (FYM) before sowing.`,`Always use Neem-Coated Urea (NCU) — it releases slowly and reduces nitrogen loss by 20–30%.`],
      irrigation:[`Never let the crop face water stress — always irrigate at the critical growth stages.`,`First irrigation: 21 days after sowing (Crown Root Initiation — most sensitive stage).`,`Second irrigation: 45 days (Tillering stage — determines final plant count).`,`Third irrigation: 65 days (Jointing stage — stem elongation needs moisture).`,`Avoid irrigation if rain is forecast within 24 hours or when wind speed is high.`,`For drip irrigation, run 2–3 hours daily to maintain 60–70% field capacity.`],
      pest:[`Scout your entire field every week — early detection prevents 80% of crop losses.`,`Spray pesticides only when pest population crosses the economic threshold level (ETL).`,`Use the correct pesticide at the correct dose — always read the product label carefully.`,`Spray in early morning (before 9 AM) or evening (after 5 PM) — avoid hot afternoon spraying.`,`Rotate pesticide groups to prevent resistance — do not use the same product every spray.`,`Upload a crop photo in the KisanMitra Pest Detection tab for instant AI-powered diagnosis.`],
      harvest:[`Harvest at the right grain moisture — below 20–25% for easy threshing without shattering.`,`Do not delay harvest more than 5–7 days after crop maturity — quality drops rapidly.`,`Clean the threshing floor before harvest to prevent contamination with soil or old grain.`,`Store grain in clean, dry gunny bags at below 12% moisture to prevent fungal damage.`,`Check today's mandi rate in the Market Prices tab before deciding to sell or store.`,`If prices are trending upward, store for 2–3 weeks; if trending downward, sell immediately.`],
      schemes:[`PM-KISAN: ₹6,000/year direct bank transfer — check eligibility at pmkisan.gov.in.`,`PMFBY Crop Insurance: 1.5% premium for Rabi, 2% for Kharif — apply before sowing deadline.`,`Soil Health Card: Free soil testing every 2 years — visit your nearest KVK centre.`,`eNAM Digital Mandi: Sell your crop across 1000+ mandis online — register at enam.gov.in.`,`Kisan Credit Card (KCC): Crop loan up to ₹3 lakh at only 4% effective interest per year.`,`State subsidy schemes for seeds, fertilizers, and farm machinery — contact your agriculture office.`],
    },
    hi:{
      overview:[`${crop.icon} ${crop.name} इस ${seasonLabel} सीजन में आपके खेत के लिए AI की नंबर 1 सिफारिश है।`,`AI स्कोर: ${crop.mlScore}%`,`फसल अवधि: ${crop.days} दिन।`,`पानी की जरूरत: ${crop.waterNeed}`,`अनुमानित आय: ₹${income} — ${area} एकड़।`,`यह सिफारिश मिट्टी, पानी और क्षेत्रीय उपयुक्तता पर आधारित है।`],
      sowing:[`बीज 3–5 सेमी गहरा बोएं।`,`प्रमाणित बीज उपयोग करें।`,`कतार में सही दूरी रखें।`,`बुवाई के बाद हल्की सिंचाई करें।`,`थीरम से बीज उपचार करें।`,`सही समय पर बुवाई करें।`],
      fertilizer:[`चरण 1: DAP + MOP बेसल खुराक।`,`चरण 2 — 20–25 दिन: यूरिया पहली टॉप ड्रेसिंग।`,`चरण 3 — 45–50 दिन: यूरिया दूसरी खुराक।`,`जिंक कम हो तो जिंक सल्फेट मिलाएं।`,`जैव कार्बन कम हो तो FYM डालें।`,`नीम लेपित यूरिया (NCU) उपयोग करें।`],
      irrigation:[`फसल को पानी की कमी न होने दें।`,`पहली सिंचाई: 21 दिन बाद।`,`दूसरी: 45 दिन।`,`तीसरी: 65 दिन।`,`बारिश का अनुमान हो तो सिंचाई न करें।`,`ड्रिप के लिए रोज 2–3 घंटे चलाएं।`],
      pest:[`हर हफ्ते खेत का सर्वेक्षण करें।`,`ETL पार होने पर कीटनाशक छिड़कें।`,`सही कीटनाशक सही मात्रा में उपयोग करें।`,`सुबह या शाम छिड़काव करें।`,`हर बार अलग कीटनाशक समूह का उपयोग करें।`,`KisanMitra में फोटो अपलोड करें।`],
      harvest:[`20–25% से कम नमी पर काटें।`,`5–7 दिन से ज्यादा देरी न करें।`,`थ्रेशिंग से पहले जगह साफ करें।`,`12% से कम नमी पर अनाज रखें।`,`मंडी रेट जांचें।`,`भाव बढ़ रहे हों तो रोकें।`],
      schemes:[`PM-KISAN: ₹6,000/वर्ष।`,`PMFBY: रबी 1.5%, खरीफ 2%।`,`मृदा स्वास्थ्य कार्ड: मुफ्त जांच।`,`eNAM: ऑनलाइन मंडी।`,`KCC: ₹3 लाख तक 4% ब्याज।`,`राज्य सरकार की सब्सिडी योजनाएं।`],
    },
    pa:{
      overview:[`${crop.icon} ${crop.name} ਇਸ ${seasonLabel} ਸੀਜ਼ਨ ਵਿੱਚ ਤੁਹਾਡੇ ਖੇਤ ਲਈ AI ਦੀ ਨੰਬਰ 1 ਸਿਫ਼ਾਰਿਸ਼ ਹੈ।`,`AI ਸਕੋਰ: ${crop.mlScore}%`,`ਫਸਲ ਮਿਆਦ: ${crop.days} ਦਿਨ।`,`ਪਾਣੀ: ${crop.waterNeed}`,`ਆਮਦਨ: ₹${income} — ${area} ਏਕੜ।`,`ਇਹ ਸਿਫ਼ਾਰਿਸ਼ ਮਿੱਟੀ ਅਤੇ ਖੇਤਰ ਦੇ ਆਧਾਰ ਤੇ ਹੈ।`],
      sowing:[`ਬੀਜ 3–5 ਸੈਮੀ ਡੂੰਘਾਈ ਤੇ ਬੀਜੋ।`,`ਪ੍ਰਮਾਣਿਤ ਬੀਜਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ।`,`ਸਹੀ ਦੂਰੀ ਰੱਖੋ।`,`ਬਿਜਾਈ ਤੋਂ ਬਾਅਦ ਸਿੰਚਾਈ ਕਰੋ।`,`ਥੀਰਮ ਨਾਲ ਬੀਜ ਉਪਚਾਰ ਕਰੋ।`,`ਸਹੀ ਸਮੇਂ ਤੇ ਬਿਜਾਈ ਕਰੋ।`],
      fertilizer:[`ਕਦਮ 1: DAP + MOP।`,`ਕਦਮ 2 — 20–25 ਦਿਨ: ਯੂਰੀਆ।`,`ਕਦਮ 3 — 45–50 ਦਿਨ: ਯੂਰੀਆ।`,`ਜ਼ਿੰਕ ਘੱਟ ਹੋਵੇ ਤਾਂ ਜ਼ਿੰਕ ਸਲਫੇਟ।`,`ਜੈਵਿਕ ਕਾਰਬਨ ਘੱਟ ਹੋਵੇ ਤਾਂ ਰੂੜੀ ਖਾਦ।`,`ਨਿੰਮ ਲੇਪਿਤ ਯੂਰੀਆ ਵਰਤੋ।`],
      irrigation:[`ਪਾਣੀ ਦੀ ਕਮੀ ਨਾ ਹੋਣ ਦਿਓ।`,`ਪਹਿਲੀ ਸਿੰਚਾਈ: 21 ਦਿਨ।`,`ਦੂਜੀ: 45 ਦਿਨ।`,`ਤੀਜੀ: 65 ਦਿਨ।`,`ਮੀਂਹ ਦਾ ਅਨੁਮਾਨ ਹੋਵੇ ਤਾਂ ਨਾ ਕਰੋ।`,`ਡਰਿੱਪ ਲਈ ਰੋਜ਼ 2–3 ਘੰਟੇ।`],
      pest:[`ਹਰ ਹਫ਼ਤੇ ਖੇਤ ਦਾ ਸਰਵੇਖਣ ਕਰੋ।`,`ETL ਤੋਂ ਵੱਧਣ ਤੇ ਛਿੜਕੋ।`,`ਸਹੀ ਮਾਤਰਾ ਵਿੱਚ ਵਰਤੋ।`,`ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਛਿੜਕਾਅ।`,`ਹਰ ਵਾਰ ਵੱਖਰਾ ਕੀਟਨਾਸ਼ਕ।`,`KisanMitra ਵਿੱਚ ਫੋਟੋ ਪਾਓ।`],
      harvest:[`20–25% ਤੋਂ ਘੱਟ ਨਮੀ ਤੇ ਕੱਟੋ।`,`5–7 ਦਿਨਾਂ ਤੋਂ ਵੱਧ ਦੇਰੀ ਨਾ ਕਰੋ।`,`ਥਰੈਸ਼ਿੰਗ ਤੋਂ ਪਹਿਲਾਂ ਸਾਫ਼ ਕਰੋ।`,`12% ਤੋਂ ਘੱਟ ਨਮੀ ਤੇ ਰੱਖੋ।`,`ਮੰਡੀ ਭਾਅ ਦੇਖੋ।`,`ਭਾਅ ਵੱਧ ਰਹੇ ਹੋਣ ਤਾਂ ਰੋਕੋ।`],
      schemes:[`PM-KISAN: ₹6,000/ਸਾਲ।`,`PMFBY: ਰਬੀ 1.5%, ਖਰੀਫ਼ 2%।`,`ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ।`,`eNAM: ਔਨਲਾਈਨ ਮੰਡੀ।`,`KCC: ₹3 ਲੱਖ।`,`ਰਾਜ ਸਬਸਿਡੀਆਂ।`],
    },
    ta:{
      overview:[`${crop.icon} ${crop.name} இந்த ${seasonLabel} சீசனுக்கு AI பரிந்துரைத்த #1 பயிர்.`,`AI மதிப்பெண்: ${crop.mlScore}%`,`பயிர் காலம்: ${crop.days} நாட்கள்.`,`நீர் தேவை: ${crop.waterNeed}`,`வருமானம்: ₹${income} — ${area} ஏக்கர்.`,`இந்த பரிந்துரை மண், நீர் மற்றும் பகுதி அடிப்படையில்.`],
      sowing:[`3–5 செமீ ஆழத்தில் விதைக்கவும்.`,`சான்றளிக்கப்பட்ட விதைகள் பயன்படுத்தவும்.`,`சரியான இடைவெளி வைக்கவும்.`,`விதைத்த உடனே நீர்ப்பாசனம்.`,`திரம் மூலம் விதை சோதனை.`,`சரியான நேரத்தில் விதைக்கவும்.`],
      fertilizer:[`படி 1: DAP + MOP.`,`படி 2 — 20–25 நாட்கள்: யூரியா.`,`படி 3 — 45–50 நாட்கள்: யூரியா.`,`ஜிங்க் குறைவு — ஜிங்க் சல்பேட்.`,`கரிம கார்பன் குறைவு — தொழு உரம்.`,`வேப்ப எண்ணெய் யூரியா பயன்படுத்தவும்.`],
      irrigation:[`நீர் பற்றாக்குறை வரக்கூடாது.`,`முதல் நீர்: 21 நாட்கள்.`,`இரண்டாவது: 45 நாட்கள்.`,`மூன்றாவது: 65 நாட்கள்.`,`மழை வாய்ப்பு இருந்தால் நீர் வேண்டாம்.`,`சொட்டு நீர்க்கு தினமும் 2–3 மணி.`],
      pest:[`வாரம் ஒரு முறை சோதியுங்கள்.`,`ETL தாண்டும்போது மட்டும் தெளிக்கவும்.`,`சரியான அளவில் பயன்படுத்தவும்.`,`காலை அல்லது மாலை தெளிக்கவும்.`,`ஒவ்வொரு முறையும் வேறு குழு.`,`KisanMitra-ல் படம் பதிவேற்றுங்கள்.`],
      harvest:[`20–25%-க்கும் குறைவான ஈரப்பத்தில் அறுவடை.`,`5–7 நாட்களுக்கு மேல் தாமதிக்காதீர்கள்.`,`நூர்பிடிக்கும் இடத்தை சுத்தம் செய்யுங்கள்.`,`12%-க்கும் குறைந்த ஈரப்பத்தில் சேமிக்கவும்.`,`மண்டி கட்டணங்களை சரிபார்க்கவும்.`,`விலை அதிகரிக்கும்போது வைத்திருக்கலாம்.`],
      schemes:[`PM-KISAN: ₹6,000/ஆண்டு.`,`PMFBY: ரபி 1.5%, காரிஃப் 2%.`,`மண் சுகாதார அட்டை.`,`eNAM: ஆன்லைன் சந்தை.`,`KCC: ₹3 லட்சம் வரை 4%.`,`மாநில அரசு மானியங்கள்.`],
    },
    te:{
      overview:[`${crop.icon} ${crop.name} ఈ ${seasonLabel} సీజన్‌కు AI సిఫార్సు చేసిన #1 పంట.`,`AI స్కోర్: ${crop.mlScore}%`,`పంట వ్యవధి: ${crop.days} రోజులు.`,`నీటి అవసరం: ${crop.waterNeed}`,`ఆదాయం: ₹${income} — ${area} ఎకరాలకు.`,`ఈ సిఫార్సు నేల, నీరు మరియు ప్రాంతం ఆధారంగా.`],
      sowing:[`3–5 సెమీ లోతులో విత్తండి.`,`ధృవీకరించబడిన విత్తనాలు వాడండి.`,`సరైన దూరం ఉంచండి.`,`విత్తిన వెంటనే నీటిపారుదల.`,`థైరమ్‌తో విత్తన చికిత్స.`,`సరైన సమయంలో విత్తండి.`],
      fertilizer:[`దశ 1: DAP + MOP.`,`దశ 2 — 20–25 రోజులు: యూరియా.`,`దశ 3 — 45–50 రోజులు: యూరియా.`,`జింక్ తక్కువ — జింక్ సల్ఫేట్.`,`సేంద్రీయ కార్బన్ తక్కువ — ఎరువు.`,`వేప పూసిన యూరియా వాడండి.`],
      irrigation:[`నీటి ఒత్తిడి రాకూడదు.`,`మొదటి నీటిపారుదల: 21 రోజులు.`,`రెండవ: 45 రోజులు.`,`మూడవ: 65 రోజులు.`,`వర్షం వస్తే నీటిపారుదల వద్దు.`,`చుక్క నీటిపారుదలకు రోజూ 2–3 గంటలు.`],
      pest:[`ప్రతి వారం పొలాన్ని పరిశీలించండి.`,`ETL దాటినప్పుడు మాత్రమే పిచికారీ.`,`సరైన మోతాదులో వాడండి.`,`ఉదయాన్నే లేదా సాయంత్రం.`,`ప్రతిసారి వేరే పురుగుమందు.`,`KisanMitra లో ఫోటో అప్‌లోడ్.`],
      harvest:[`20–25% కంటే తక్కువ తేమలో కోయండి.`,`5–7 రోజులకు మించి ఆలస్యం వద్దు.`,`నూర్పిడి ముందు శుభ్రం చేయండి.`,`12% కంటే తక్కువ తేమలో నిల్వ.`,`మండీ రేట్లు చూసి అమ్మండి.`,`ధరలు పెరుగుతున్నప్పుడు వేచి ఉండవచ్చు.`],
      schemes:[`PM-KISAN: ₹6,000/సంవత్సరం.`,`PMFBY: రబీ 1.5%, ఖరీఫ్ 2%.`,`నేల ఆరోగ్య కార్డు.`,`eNAM: ఆన్‌లైన్ మండీ.`,`KCC: ₹3 లక్షల వరకు 4%.`,`రాష్ట్ర ప్రభుత్వ సబ్సిడీలు.`],
    },
  };
  return content[lang] || content.en;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function CropModal({ crop, form, lang, onClose }) {
  const [activeSection, setActiveSection] = useState('overview');
  const summary  = buildSummary(crop, form.area, form.season, lang);
  const sections = SECTION_KEYS;
  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };
  useEffect(() => { const fn = e => { if (e.key==='Escape') onClose(); }; window.addEventListener('keydown',fn); return ()=>window.removeEventListener('keydown',fn); }, [onClose]);
  const income = (crop.baseIncome?Math.round(crop.baseIncome*form.area):crop.estimatedIncome)?.toLocaleString();
  const points = summary[activeSection]||[];
  const meta   = SECTIONS[activeSection];

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.18}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.78)',backdropFilter:'blur(10px)'}} onClick={handleBackdrop}>
      <motion.div initial={{opacity:0,scale:0.92,y:28}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:28}}
        transition={{duration:0.26,ease:[0.4,0,0.2,1]}}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{background:'linear-gradient(160deg,rgba(3,22,8,0.99) 0%,rgba(2,12,5,1) 100%)',border:'1px solid rgba(74,222,128,0.15)',boxShadow:'0 32px 80px rgba(0,0,0,0.6)'}}
        onClick={e=>e.stopPropagation()}>

        {/* Header — crop.name stays English in modal title */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.07] flex-shrink-0" style={{background:'rgba(0,0,0,0.2)'}}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:'rgba(20,92,30,0.5)',border:'1px solid rgba(74,222,128,0.3)'}}>{crop.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-white text-lg leading-tight truncate">{crop.name}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs glass-green text-green-400 px-2 py-0.5 rounded-full font-semibold">🧠 {crop.mlScore}% {u('aiScore',lang)}</span>
              <span className="text-xs text-white/30">⏱ {crop.days}{u('days',lang)}</span>
              <span className="text-xs text-white/30">💧 {crop.waterNeed}</span>
              <span className="text-xs font-semibold text-amber-400">💰 ₹{income}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 text-lg">✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 py-2.5 overflow-x-auto border-b border-white/[0.05] flex-shrink-0 scrollbar-none" style={{background:'rgba(0,0,0,0.15)'}}>
          {sections.map(key=>{const m=SECTIONS[key];const isActive=activeSection===key;return(
            <button key={key} onClick={()=>setActiveSection(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${isActive?'text-green-200':'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}
              style={isActive?{background:'rgba(22,101,52,0.55)',border:'1px solid rgba(74,222,128,0.35)'}:{}}>
              <span className="text-sm">{m.icon}</span><span>{m.label[lang]||m.label.en}</span>
            </button>
          );})}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
          <AnimatePresence mode="wait">
            <motion.div key={`${activeSection}-${lang}`} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
              <div className={`flex items-center gap-3 bg-gradient-to-r ${meta.grad} rounded-xl px-4 py-3 mb-4 border`}>
                <span className="text-xl">{meta.icon}</span>
                <span className="font-semibold text-white text-sm">{meta.label[lang]||meta.label.en}</span>
                <span className="ml-auto text-xs text-white/30">{points.length} {u('tips',lang)}</span>
              </div>
              <div className="space-y-3">
                {points.map((point,i)=>(
                  <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.055,duration:0.2}} className="flex gap-3 items-start">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full ${meta.dot} flex items-center justify-center text-[0.6rem] font-black text-black mt-0.5`}>{i+1}</div>
                    <p className="text-white/80 text-sm leading-relaxed flex-1">{point}</p>
                  </motion.div>
                ))}
              </div>
              {activeSection==='schemes'&&(
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
                  className="mt-4 rounded-xl p-3 flex items-center gap-2 text-xs"
                  style={{background:'rgba(20,92,30,0.25)',border:'1px solid rgba(74,222,128,0.2)',color:'#86efac'}}>
                  <span>🏛️</span><span>{t('schemeCTA',lang)}</span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between flex-shrink-0" style={{background:'rgba(0,0,0,0.2)'}}>
          <span className="text-xs text-white/20">{t('closeHint',lang)}</span>
          <div className="flex gap-2">
            <button onClick={()=>{const idx=sections.indexOf(activeSection);if(idx>0)setActiveSection(sections[idx-1]);}} disabled={sections.indexOf(activeSection)===0}
              className="text-xs text-white/40 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all">{t('prev',lang)}</button>
            <button onClick={()=>{const idx=sections.indexOf(activeSection);if(idx<sections.length-1)setActiveSection(sections[idx+1]);}} disabled={sections.indexOf(activeSection)===sections.length-1}
              className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{color:'#4ade80',background:'rgba(20,92,30,0.3)',border:'1px solid rgba(74,222,128,0.25)'}}>{t('next',lang)}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_DEFAULTS = { season:'rabi', area:2, irrigation:'canal', ph:7.2, organicCarbon:0.42, nitrogen:180, phosphorus:12, potassium:210, zinc:0.6, temperature:22, rainfall:400 };
const STATES     = Object.keys(INDIA_STATES_CITIES).sort();
const SOIL_TYPES = ['alluvial','black','red','sandy','clay'];
const IRRIG_KEYS = ['canal','borewell','rain','drip'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CropAdvisory() {
  const { farmer, lang } = useApp();
  const defaultState    = farmer?.state    || 'Punjab';
  const defaultDistrict = farmer?.district || (INDIA_STATES_CITIES[defaultState]?.[0] || 'Phagwara');
  const FORM_DEFAULTS = { state:defaultState, district:defaultDistrict, area:farmer?.landArea||2, soilType:detectSoilType(defaultState,defaultDistrict), prevCrop:getPrevCrops(defaultState,defaultDistrict)[0]?.value||'none', ...BASE_DEFAULTS };

  const [form, setForm]           = useState(FORM_DEFAULTS);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [modalCrop, setModalCrop] = useState(null);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const handleStateChange = newState => { const d=INDIA_STATES_CITIES[newState]||[]; const nd=d[0]||''; setForm(p=>({...p,state:newState,district:nd,soilType:detectSoilType(newState,nd),prevCrop:getPrevCrops(newState,nd)[0]?.value||'none'})); };
  const handleDistrictChange = nd => { setForm(p=>({...p,district:nd,soilType:detectSoilType(form.state,nd),prevCrop:getPrevCrops(form.state,nd)[0]?.value||'none'})); };

  const submit = async () => {
    setLoading(true);
    try { const r=await api.post('/crops/recommend',{...form}); setResult(r); toast.success('AI recommendations ready!'); }
    catch(e){ toast.error(e.message||'Failed'); }
    finally { setLoading(false); }
  };

  const buildFertSteps = top => {
    const isRice    = top.name?.toLowerCase().includes('rice')||top.name?.toLowerCase().includes('paddy');
    const isMustard = top.name?.toLowerCase().includes('mustard');
    return [
      { step:u('step1',lang), when:isRice?u('atTransplanting',lang):u('atSowing',lang), title:u('basalDose',lang), hint:isRice?u('mixSoilRice',lang):u('mixSoil',lang), ferts:isRice?[{name:'DAP',img:'dap',qty:'40 kg'},{name:'MOP',img:'mop',qty:'15 kg'}]:isMustard?[{name:'DAP',img:'dap',qty:'25 kg'},{name:'MOP',img:'mop',qty:'15 kg'}]:[{name:'DAP',img:'dap',qty:'50 kg'},{name:'MOP',img:'mop',qty:'20 kg'}] },
      { step:u('step2',lang), when:isRice?u('twentyDaysRice',lang):isMustard?u('mustardFlower',lang):u('twentyDaysSow',lang), title:u('firstTopDress',lang), hint:isRice?u('spreadWetField',lang):isMustard?u('atFlowering',lang):u('afterIrrig1',lang), ferts:[{name:'Urea',img:'urea',qty:isRice?'25 kg':isMustard?'25 kg':'30 kg'}] },
      { step:u('step3',lang), when:isRice?u('fortyFiveRice',lang):isMustard?u('mustardNeed',lang):u('fortyFiveDays',lang), title:u('secondTopDress',lang), hint:isRice?u('beforeGrain',lang):isMustard?u('mustardNoStep3',lang):u('afterIrrig2',lang), ferts:isMustard?[]:isRice?[{name:'Urea',img:'urea',qty:'20 kg'}]:[{name:'Urea',img:'urea',qty:'25 kg'}] },
    ];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient-green">🌱 {u('pageTitle',lang)}</h1>
        <p className="text-white/40 text-sm mt-1">{u('pageSubtitle',lang)}</p>
      </div>

      <div className="card-gradient rounded-2xl p-6">
        <h2 className="font-semibold text-white/80 mb-4 flex items-center gap-2">🗺️ {u('farmDetails',lang)}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div><label className="text-xs text-white/40 mb-1 block font-medium">{u('state',lang)}</label>
            <select className="input-dark" value={form.state} onChange={e=>handleStateChange(e.target.value)}>{STATES.map(s=><option key={s}>{s}</option>)}</select></div>

          <div><label className="text-xs text-white/40 mb-1 block font-medium">{u('district',lang)}</label>
            <select className="input-dark" value={form.district} onChange={e=>handleDistrictChange(e.target.value)}>
              {(INDIA_STATES_CITIES[form.state]||[form.district]).map(d=><option key={d} value={d}>{d}</option>)}</select></div>

          <div><label className="text-xs text-white/40 mb-1 block font-medium">{u('season',lang)}</label>
            <select className="input-dark" value={form.season} onChange={e=>set('season',e.target.value)}>
              {(SEASON_OPTS[lang]||SEASON_OPTS.en).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>

          <div><label className="text-xs text-white/40 mb-1 flex items-center gap-1 font-medium">
              {u('soilType',lang)} <span className="text-green-500/60 text-[0.6rem] border border-green-500/30 rounded px-1">✦ {u('autoDetected',lang)}</span></label>
            <select className="input-dark" value={form.soilType} onChange={e=>set('soilType',e.target.value)}>
              {SOIL_TYPES.map(s=><option key={s} value={s}>{SOIL_LABELS[lang]?.[s]||SOIL_LABELS.en[s]}</option>)}</select></div>

          <div><label className="text-xs text-white/40 mb-1 block font-medium">{u('landArea',lang)}</label>
            <input type="number" className="input-dark" value={form.area} min="0.5" step="0.5" onChange={e=>set('area',+e.target.value)} /></div>

          <div><label className="text-xs text-white/40 mb-1 block font-medium">{u('irrigation',lang)}</label>
            <select className="input-dark" value={form.irrigation} onChange={e=>set('irrigation',e.target.value)}>
              {IRRIG_KEYS.map(i=><option key={i} value={i}>{IRRIG_LABELS[lang]?.[i]||IRRIG_LABELS.en[i]}</option>)}</select></div>

          {/* ── Previous Crop — ONLY this dropdown is translated ── */}
          <div><label className="text-xs text-white/40 mb-1 flex items-center gap-1 font-medium">
              {u('prevCrop',lang)} <span className="text-green-500/60 text-[0.6rem] border border-green-500/30 rounded px-1">✦ {u('regionAware',lang)}</span></label>
            <select className="input-dark" value={form.prevCrop} onChange={e=>set('prevCrop',e.target.value)}>
              {getPrevCrops(form.state,form.district).map(c=>(
                <option key={c.value} value={c.value}>
                  {translatePrevCropLabel(c.value, c.label, lang)}
                </option>
              ))}</select></div>

        </div>
        <div className="mt-5 flex gap-3">
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading?<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow"/>:'🧠'}
            {loading?u('analyzing',lang):u('getRecommend',lang)}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-bold text-white">✨ {u('aiReco',lang)}</h2>
              <span className="text-xs glass-green text-green-400 px-3 py-1 rounded-full">{result.location} · {result.season?.toUpperCase()}</span>
              {result.pklBacked&&<span className="text-xs bg-blue-800/50 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">🧠 {result.modelUsed}</span>}
              {result.accuracy&&<span className="text-xs bg-purple-800/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">📊 {result.accuracy}%</span>}
            </div>

            {result.advisoryNote&&<div className="glass-green rounded-xl p-4 text-sm text-green-300/80 flex gap-3"><span className="text-xl shrink-0">ℹ️</span><span>{result.advisoryNote}</span></div>}

            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="flex items-center gap-2 text-xs" style={{color:'rgba(74,222,128,0.5)'}}>
              <motion.span animate={{x:[0,4,0]}} transition={{repeat:Infinity,duration:1.5}}>👆</motion.span>
              <span>{t('clickHint',lang)}</span>
            </motion.div>

            {/* ── Crop Cards — crop.name stays English ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              {result.recommendations?.slice(0,4).map((crop,i)=>{
                const income=(crop.baseIncome?Math.round(crop.baseIncome*form.area):crop.estimatedIncome)?.toLocaleString();
                return (
                  <motion.div key={crop.id||i} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.08}}
                    onClick={()=>setModalCrop(crop)}
                    whileHover={{y:-5,boxShadow:'0 20px 50px rgba(34,197,94,0.14),0 0 0 1px rgba(74,222,128,0.2)'}}
                    whileTap={{scale:0.97}}
                    className="card-gradient rounded-2xl p-5 relative border border-white/[0.07] flex flex-col gap-3 cursor-pointer group"
                    style={{userSelect:'none'}}>

                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-green-600/50 text-green-200 text-xs flex items-center justify-center font-black">#{i+1}</div>
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[0.58rem] font-bold bg-green-600/75 text-green-100 px-1.5 py-0.5 rounded">{t('fullGuide',lang)}</span>
                    </div>

                    <div>
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-200">{crop.icon}</div>
                      {/* crop.name — English, unchanged */}
                      <div className="font-display font-bold text-white text-xl">{crop.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {crop.tags?.map(tag=><span key={tag} className="text-[0.6rem] bg-green-900/50 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">{tag}</span>)}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/40">🧠 {u('aiScore',lang)}</span>
                        <span className="font-mono text-green-400 font-bold">{crop.mlScore}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full"
                          initial={{width:0}} animate={{width:`${crop.mlScore}%`}} transition={{delay:i*0.08+0.3,duration:0.8}}/>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="glass rounded-lg p-2 text-center border border-transparent group-hover:border-green-500/20 transition-colors">
                        <div className="text-white/30 text-[0.6rem] uppercase tracking-wide">{u('duration',lang)}</div>
                        <div className="text-white font-semibold text-xs mt-0.5">⏱ {crop.days}{u('days',lang)}</div>
                      </div>
                      <div className="glass rounded-lg p-2 text-center border border-transparent group-hover:border-green-500/20 transition-colors">
                        <div className="text-white/30 text-[0.6rem] uppercase tracking-wide">{u('water',lang)}</div>
                        <div className="text-white font-semibold text-xs mt-0.5">💧 {crop.waterNeed}</div>
                      </div>
                      <div className="glass rounded-lg p-2 text-center col-span-2 border border-transparent group-hover:border-amber-500/20 transition-colors">
                        <div className="text-white/30 text-[0.6rem] uppercase tracking-wide">{u('estIncome',lang)} ({form.area} {u('landArea',lang).split('(')[0].trim()})</div>
                        <div className="text-amber-400 font-bold text-sm mt-0.5">💰 ₹{income}</div>
                      </div>
                    </div>

                    {crop.rotationNote&&<div className="text-[0.65rem] text-amber-400/70 bg-amber-900/20 border border-amber-500/10 rounded-lg px-2 py-1.5">🔄 {crop.rotationNote}</div>}
                    <div className="flex items-center justify-center mt-auto pt-2 border-t border-white/[0.04] text-[0.68rem] rounded-lg px-2 py-1 cursor-pointer transition-all duration-300 ease-in-out bg-white/5 hover:bg-green-600 hover:text-white hover:scale-105">
                      {t('clickForGuide',lang)}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {result.recommendations?.[0]&&(()=>{
              const top=result.recommendations[0];
              const fertSteps=buildFertSteps(top);
              return (
                <div className="space-y-4">
                  {/* Heading — crop.name stays English */}
                  <h3 className="font-display text-lg font-bold text-amber-300 flex items-center gap-2">
                    📋 {u('completeFarm',lang)} — {top.icon} {top.name}
                    <span className="text-xs text-white/30 font-normal">({top.days} {u('days',lang)})</span>
                  </h3>

                  <div className="card-gradient rounded-2xl p-5 border border-amber-500/10">
                    <h4 className="font-semibold text-amber-400 text-sm mb-3">🌿 {u('fertSchedule',lang)}</h4>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {fertSteps.map(({step,when,title,hint,ferts})=>(
                        <div key={title} className="glass rounded-xl p-4 flex flex-col gap-3 border border-white/[0.07] hover:border-2 hover:border-green-500/50 transition-all duration-300 ease-in-out">
                          <div>
                            <div className="text-[0.6rem] font-bold text-green-400 uppercase tracking-widest">{step}</div>
                            <div className="font-bold text-white text-sm mt-0.5">{title}</div>
                            <div className="text-amber-300/80 text-xs mt-0.5">🕐 {when}</div>
                            <div className="text-white/40 text-xs mt-1 leading-snug">{hint}</div>
                          </div>
                          {ferts.length>0?(
                            <div className="flex flex-col gap-2">
                              {ferts.map(f=>(
                                <div key={f.name} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 hover:border-green-500/40 transition-all">
                                  <img src={FERT_IMG[f.img]} alt={f.name} className="w-10 h-10 object-contain rounded-md bg-white/10 p-1 flex-shrink-0"
                                    onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextSibling.style.display='flex';}}/>
                                  <div className="w-10 h-10 rounded-md bg-amber-900/40 border border-amber-500/20 items-center justify-center text-xl flex-shrink-0 hidden">🧪</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-sm">{f.name}</div>
                                    <div className="font-mono text-amber-400 text-xs font-bold">{f.qty}</div>
                                    <div className="text-white/30 text-[0.6rem]">{u('perAcre',lang)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ):(
                            <div className="text-white/30 text-xs text-center py-2">{u('notRequired',lang)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="card-gradient rounded-xl p-5 border border-sky-500/20 hover:border-2 hover:border-sky-400 transition-all duration-300 ease-in-out">
                      <h4 className="font-semibold text-sky-400 text-base mb-3">💧 {u('irrigPlan',lang)}</h4>
                      <ul className="text-white text-sm leading-relaxed list-disc pl-4 space-y-1">
                        {(UI.irrigPoints[lang]||UI.irrigPoints.en).map((p,i)=><li key={i}>{p}</li>)}
                      </ul>
                      {form.irrigation==='rain'&&<div className="mt-3 text-amber-400/80 bg-amber-900/20 rounded p-1.5 text-xs">⚠️ {u('rainWarning',lang)}</div>}
                    </div>
                    <div className="card-gradient rounded-xl p-5 border-2 border-teal-500/20 hover:border-teal-400 transition-all duration-300 ease-in-out">
                      <h4 className="font-semibold text-teal-400 text-base mb-3">🌱 {u('sowingTime',lang)}</h4>
                      <ul className="text-white text-sm leading-relaxed list-disc pl-4 space-y-1">
                        {(UI.sowingPoints[lang]||UI.sowingPoints.en).map((p,i)=><li key={i}>{p}</li>)}
                      </ul>
                      <div className="mt-3 text-teal-400 font-bold text-base">{u('seasonLabel',lang)}: {SEASON_LABELS[lang]?.[form.season]||form.season}</div>
                    </div>
                    <div className="card-gradient rounded-xl p-5 border border-amber-500/20 hover:border-2 hover:border-amber-400 transition-all duration-300 ease-in-out">
                      <h4 className="font-semibold text-amber-400 text-base mb-3">🌾 {u('soilSection',lang)}</h4>
                      <ul className="text-white text-sm leading-relaxed list-disc pl-4 space-y-1">
                        {(UI.soilPoints[lang]||UI.soilPoints.en).map((p,i)=><li key={i}>{p}</li>)}
                      </ul>
                      <div className="mt-3 text-green-400 font-bold text-base">{u('soilLabel',lang)}: {SOIL_LABELS[lang]?.[form.soilType]||form.soilType}</div>
                    </div>
                  </div>

                  {/* Comparison table — crop.name stays English */}
                  {result.recommendations?.length>1&&(
                    <div className="card-gradient rounded-2xl p-5 border border-white/[0.05]">
                      <h4 className="font-semibold text-white/70 text-sm mb-3">📊 {u('cropComparison',lang)}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-white/30 border-b border-white/[0.06]">
                              <th className="text-left py-2 pr-4">{u('crop',lang)}</th>
                              <th className="text-center py-2 px-2">{u('aiScore',lang)}</th>
                              <th className="text-center py-2 px-2">{u('duration',lang)}</th>
                              <th className="text-center py-2 px-2">{u('water',lang)}</th>
                              <th className="text-right py-2 pl-2">{u('estIncome',lang)}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.recommendations.slice(0,4).map((crop,i)=>(
                              <tr key={crop.id||i} onClick={()=>setModalCrop(crop)}
                                className={`border-b border-white/[0.04] cursor-pointer hover:bg-green-900/10 transition-colors ${i===0?'bg-green-900/10':''}`}>
                                <td className="py-2 pr-4 text-white font-medium">
                                  {/* crop.name — English, unchanged */}
                                  {crop.icon} {crop.name}
                                  {i===0&&<span className="text-[0.6rem] text-green-400 ml-1">★ {u('best',lang)}</span>}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`font-mono font-bold ${crop.mlScore>=80?'text-green-400':crop.mlScore>=60?'text-amber-400':'text-white/40'}`}>{crop.mlScore}%</span>
                                </td>
                                <td className="py-2 px-2 text-center text-white/50">{crop.days}{u('days',lang)}</td>
                                <td className="py-2 px-2 text-center text-white/50">{crop.waterNeed}</td>
                                <td className="py-2 pl-2 text-right text-amber-400 font-semibold">
                                  ₹{(crop.baseIncome?Math.round(crop.baseIncome*form.area):crop.estimatedIncome)?.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalCrop&&<CropModal key="crop-modal" crop={modalCrop} form={form} lang={lang} onClose={()=>setModalCrop(null)}/>}
      </AnimatePresence>
    </div>
  );
}