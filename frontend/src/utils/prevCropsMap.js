// prevCropsMap.js — State & District-wise Previous Crop Options
// Based on ICAR agro-climatic zones and actual cropping patterns of India.
// Each state has a default crop list; specific districts can override it.
//
// Usage:
//   import { getPrevCrops } from '../utils/prevCropsMap';
//   const crops = getPrevCrops('Punjab', 'Ludhiana');
//   // → [{ value:'rice', label:'Rice (Paddy)' }, { value:'wheat', label:'Wheat' }, ...]

// ── Crop display labels ──────────────────────────────────────────────────────
const CROP_LABELS = {
  rice:       'Rice (Paddy)',
  wheat:      'Wheat',
  maize:      'Maize (Corn)',
  cotton:     'Cotton',
  mustard:    'Mustard (Rapeseed)',
  chickpea:   'Chickpea (Gram)',
  soybean:    'Soybean',
  sugarcane:  'Sugarcane',
  barley:     'Barley',
  groundnut:  'Groundnut (Peanut)',
  tur:        'Tur (Arhar/Pigeon Pea)',
  moong:      'Moong (Green Gram)',
  urad:       'Urad (Black Gram)',
  jowar:      'Jowar (Sorghum)',
  bajra:      'Bajra (Pearl Millet)',
  ragi:       'Ragi (Finger Millet)',
  sunflower:  'Sunflower',
  turmeric:   'Turmeric',
  chilli:     'Chilli',
  tobacco:    'Tobacco',
  jute:       'Jute',
  tea:        'Tea',
  coffee:     'Coffee',
  rubber:     'Rubber',
  coconut:    'Coconut',
  banana:     'Banana',
  potato:     'Potato',
  onion:      'Onion',
  tomato:     'Tomato',
  none:       'None / First Season',
};

function makeCrops(keys) {
  return keys.map(k => ({ value: k, label: CROP_LABELS[k] || k.charAt(0).toUpperCase() + k.slice(1) }));
}

// ── State-level default crop lists ──────────────────────────────────────────
// These are the crops ACTUALLY grown in each state as per agricultural census.
const STATE_CROPS = {

  // ── NW Plains ─────────────────────────────────────────────────────────────
  'Punjab': ['rice', 'wheat', 'maize', 'cotton', 'mustard', 'sugarcane', 'potato', 'moong', 'sunflower', 'none'],
  'Haryana': ['wheat', 'rice', 'mustard', 'cotton', 'sugarcane', 'barley', 'bajra', 'maize', 'sunflower', 'none'],
  'Uttar Pradesh': ['wheat', 'rice', 'sugarcane', 'potato', 'mustard', 'maize', 'barley', 'chickpea', 'tur', 'moong', 'none'],
  'Uttarakhand': ['wheat', 'rice', 'maize', 'barley', 'potato', 'mustard', 'soybean', 'moong', 'none'],
  'Himachal Pradesh': ['wheat', 'maize', 'barley', 'rice', 'potato', 'mustard', 'none'],
  'Jammu and Kashmir': ['wheat', 'rice', 'maize', 'barley', 'mustard', 'potato', 'none'],
  'Delhi': ['wheat', 'rice', 'mustard', 'vegetables', 'none'],
  'Chandigarh': ['wheat', 'rice', 'mustard', 'none'],

  // ── Central India ─────────────────────────────────────────────────────────
  'Madhya Pradesh': ['wheat', 'soybean', 'maize', 'cotton', 'chickpea', 'tur', 'mustard', 'rice', 'groundnut', 'barley', 'jowar', 'none'],
  'Maharashtra': ['sugarcane', 'cotton', 'soybean', 'tur', 'jowar', 'wheat', 'rice', 'chickpea', 'onion', 'maize', 'none'],
  'Chhattisgarh': ['rice', 'maize', 'tur', 'chickpea', 'wheat', 'soybean', 'groundnut', 'none'],

  // ── South India ───────────────────────────────────────────────────────────
  'Andhra Pradesh': ['rice', 'cotton', 'maize', 'groundnut', 'sugarcane', 'chilli', 'tobacco', 'tur', 'sunflower', 'none'],
  'Telangana': ['rice', 'cotton', 'maize', 'soybean', 'tur', 'sunflower', 'groundnut', 'chilli', 'none'],
  'Karnataka': ['rice', 'maize', 'cotton', 'sugarcane', 'ragi', 'tur', 'groundnut', 'soybean', 'sunflower', 'coffee', 'coconut', 'none'],
  'Tamil Nadu': ['rice', 'sugarcane', 'cotton', 'maize', 'groundnut', 'banana', 'ragi', 'tur', 'coconut', 'none'],
  'Kerala': ['rice', 'coconut', 'rubber', 'tea', 'coffee', 'banana', 'sugarcane', 'none'],
  'Goa': ['rice', 'coconut', 'sugarcane', 'cashew', 'none'],
  'Puducherry': ['rice', 'sugarcane', 'groundnut', 'none'],

  // ── East India ────────────────────────────────────────────────────────────
  'Bihar': ['wheat', 'rice', 'maize', 'sugarcane', 'potato', 'mustard', 'chickpea', 'tur', 'jute', 'none'],
  'West Bengal': ['rice', 'jute', 'potato', 'wheat', 'maize', 'mustard', 'tea', 'sugarcane', 'none'],
  'Odisha': ['rice', 'maize', 'groundnut', 'tur', 'sugarcane', 'jute', 'cotton', 'none'],
  'Jharkhand': ['rice', 'maize', 'wheat', 'tur', 'groundnut', 'mustard', 'none'],

  // ── North East ────────────────────────────────────────────────────────────
  'Assam': ['rice', 'jute', 'tea', 'sugarcane', 'maize', 'mustard', 'none'],
  'Meghalaya': ['rice', 'maize', 'potato', 'ginger', 'none'],
  'Manipur': ['rice', 'maize', 'mustard', 'sugarcane', 'none'],
  'Nagaland': ['rice', 'maize', 'potato', 'none'],
  'Mizoram': ['rice', 'maize', 'none'],
  'Tripura': ['rice', 'jute', 'sugarcane', 'none'],
  'Arunachal Pradesh': ['rice', 'maize', 'none'],
  'Sikkim': ['rice', 'maize', 'potato', 'barley', 'none'],

  // ── West India ────────────────────────────────────────────────────────────
  'Rajasthan': ['mustard', 'wheat', 'bajra', 'jowar', 'barley', 'groundnut', 'cotton', 'chickpea', 'maize', 'none'],
  'Gujarat': ['cotton', 'groundnut', 'wheat', 'rice', 'bajra', 'maize', 'sugarcane', 'tur', 'mustard', 'castor', 'none'],

  // ── Union Territories ─────────────────────────────────────────────────────
  'Ladakh': ['wheat', 'barley', 'potato', 'none'],
  'Andaman and Nicobar Islands': ['rice', 'coconut', 'none'],
  'Lakshadweep': ['coconut', 'none'],
  'Dadra and Nagar Haveli and Daman and Diu': ['rice', 'wheat', 'none'],
};

// ── District-level overrides ─────────────────────────────────────────────────
// Only districts where the crop pattern differs significantly from state default
const DISTRICT_CROPS = {

  // ── Punjab ────────────────────────────────────────────────────────────────
  'Bathinda':     ['cotton', 'wheat', 'rice', 'mustard', 'sunflower', 'maize', 'none'],
  'Fazilka':      ['cotton', 'wheat', 'mustard', 'rice', 'none'],
  'Mansa':        ['cotton', 'wheat', 'mustard', 'rice', 'none'],
  'Muktsar':      ['cotton', 'wheat', 'rice', 'mustard', 'none'],
  'Abohar':       ['cotton', 'wheat', 'mustard', 'none'],
  'Firozpur':     ['wheat', 'rice', 'cotton', 'mustard', 'none'],
  'Sangrur':      ['wheat', 'rice', 'cotton', 'sunflower', 'none'],
  'Ludhiana':     ['wheat', 'rice', 'potato', 'maize', 'none'],
  'Jalandhar':    ['wheat', 'rice', 'potato', 'sugarcane', 'none'],
  'Amritsar':     ['wheat', 'rice', 'sugarcane', 'potato', 'none'],
  'Hoshiarpur':   ['wheat', 'rice', 'maize', 'sugarcane', 'none'],
  'Gurdaspur':    ['wheat', 'rice', 'sugarcane', 'maize', 'none'],

  // ── Haryana ───────────────────────────────────────────────────────────────
  'Sirsa':        ['cotton', 'wheat', 'mustard', 'rice', 'bajra', 'none'],
  'Hisar':        ['cotton', 'wheat', 'mustard', 'bajra', 'none'],
  'Fatehabad':    ['cotton', 'wheat', 'mustard', 'bajra', 'none'],
  'Bhiwani':      ['wheat', 'mustard', 'bajra', 'cotton', 'none'],
  'Karnal':       ['wheat', 'rice', 'sugarcane', 'mustard', 'none'],
  'Panipat':      ['wheat', 'rice', 'sugarcane', 'none'],
  'Sonipat':      ['wheat', 'sugarcane', 'mustard', 'rice', 'none'],
  'Rohtak':       ['wheat', 'mustard', 'rice', 'bajra', 'none'],

  // ── Uttar Pradesh ─────────────────────────────────────────────────────────
  'Agra':         ['mustard', 'wheat', 'potato', 'maize', 'none'],
  'Mathura':      ['mustard', 'wheat', 'potato', 'none'],
  'Aligarh':      ['wheat', 'potato', 'mustard', 'rice', 'none'],
  'Muzaffarnagar':['sugarcane', 'wheat', 'rice', 'maize', 'none'],
  'Gorakhpur':    ['sugarcane', 'wheat', 'rice', 'tur', 'none'],
  'Varanasi':     ['wheat', 'rice', 'vegetable', 'none'],
  'Lucknow':      ['sugarcane', 'wheat', 'rice', 'potato', 'none'],
  'Meerut':       ['sugarcane', 'wheat', 'rice', 'maize', 'none'],
  'Bareilly':     ['sugarcane', 'wheat', 'rice', 'mustard', 'none'],

  // ── Rajasthan ─────────────────────────────────────────────────────────────
  'Jodhpur':      ['bajra', 'jowar', 'mustard', 'groundnut', 'none'],
  'Barmer':       ['bajra', 'mustard', 'jowar', 'none'],
  'Jaisalmer':    ['bajra', 'jowar', 'none'],
  'Bikaner':      ['bajra', 'mustard', 'wheat', 'groundnut', 'none'],
  'Nagaur':       ['bajra', 'mustard', 'wheat', 'jowar', 'none'],
  'Jaipur':       ['wheat', 'mustard', 'bajra', 'barley', 'none'],
  'Udaipur':      ['maize', 'wheat', 'soybean', 'cotton', 'none'],
  'Kota':         ['soybean', 'mustard', 'wheat', 'barley', 'cotton', 'none'],
  'Jhalawar':     ['soybean', 'wheat', 'cotton', 'mustard', 'none'],
  'Chittorgarh':  ['maize', 'soybean', 'wheat', 'mustard', 'none'],
  'Sri Ganganagar':['wheat', 'cotton', 'mustard', 'rice', 'barley', 'none'],
  'Hanumangarh':  ['wheat', 'cotton', 'mustard', 'rice', 'barley', 'none'],
  'Bharatpur':    ['wheat', 'mustard', 'rice', 'moong', 'none'],

  // ── Gujarat ───────────────────────────────────────────────────────────────
  'Kutch':        ['cotton', 'groundnut', 'bajra', 'none'],
  'Banaskantha':  ['groundnut', 'bajra', 'cotton', 'potato', 'none'],
  'Patan':        ['groundnut', 'cotton', 'bajra', 'wheat', 'none'],
  'Jamnagar':     ['groundnut', 'cotton', 'bajra', 'none'],
  'Amreli':       ['groundnut', 'cotton', 'wheat', 'none'],
  'Rajkot':       ['groundnut', 'cotton', 'wheat', 'bajra', 'none'],
  'Surat':        ['sugarcane', 'rice', 'cotton', 'maize', 'none'],
  'Anand':        ['tobacco', 'wheat', 'rice', 'potato', 'none'],
  'Vadodara':     ['wheat', 'cotton', 'rice', 'maize', 'none'],

  // ── Madhya Pradesh ────────────────────────────────────────────────────────
  'Indore':       ['soybean', 'wheat', 'maize', 'cotton', 'none'],
  'Ujjain':       ['soybean', 'wheat', 'cotton', 'maize', 'none'],
  'Dewas':        ['soybean', 'wheat', 'cotton', 'none'],
  'Ratlam':       ['soybean', 'wheat', 'cotton', 'none'],
  'Mandsaur':     ['soybean', 'wheat', 'garlic', 'none'],
  'Bhopal':       ['soybean', 'wheat', 'chickpea', 'none'],
  'Jabalpur':     ['wheat', 'rice', 'soybean', 'tur', 'none'],
  'Chhindwara':   ['wheat', 'rice', 'soybean', 'maize', 'none'],
  'Rewa':         ['wheat', 'rice', 'tur', 'chickpea', 'none'],
  'Gwalior':      ['wheat', 'mustard', 'chickpea', 'none'],
  'Khandwa':      ['cotton', 'soybean', 'wheat', 'none'],
  'Burhanpur':    ['cotton', 'soybean', 'wheat', 'none'],

  // ── Maharashtra ───────────────────────────────────────────────────────────
  'Nagpur':       ['cotton', 'soybean', 'tur', 'wheat', 'none'],
  'Wardha':       ['cotton', 'tur', 'soybean', 'none'],
  'Yavatmal':     ['cotton', 'tur', 'soybean', 'none'],
  'Amravati':     ['cotton', 'tur', 'soybean', 'none'],
  'Akola':        ['cotton', 'tur', 'soybean', 'wheat', 'none'],
  'Aurangabad':   ['cotton', 'soybean', 'tur', 'none'],
  'Latur':        ['tur', 'soybean', 'chickpea', 'wheat', 'none'],
  'Osmanabad':    ['tur', 'chickpea', 'soybean', 'none'],
  'Pune':         ['sugarcane', 'jowar', 'wheat', 'onion', 'none'],
  'Nashik':       ['grapes', 'onion', 'wheat', 'sugarcane', 'none'],
  'Kolhapur':     ['sugarcane', 'rice', 'jowar', 'none'],
  'Solapur':      ['sugarcane', 'jowar', 'cotton', 'none'],

  // ── Andhra Pradesh ────────────────────────────────────────────────────────
  'Guntur':       ['cotton', 'chilli', 'rice', 'maize', 'none'],
  'Krishna':      ['rice', 'sugarcane', 'cotton', 'maize', 'none'],
  'West Godavari':['rice', 'sugarcane', 'maize', 'none'],
  'East Godavari':['rice', 'sugarcane', 'coconut', 'none'],
  'Kurnool':      ['cotton', 'groundnut', 'rice', 'maize', 'chilli', 'none'],
  'Kadapa':       ['groundnut', 'cotton', 'rice', 'none'],
  'Anantapur':    ['groundnut', 'cotton', 'sunflower', 'none'],
  'Chittoor':     ['groundnut', 'sugarcane', 'rice', 'none'],
  'Nellore':      ['rice', 'sugarcane', 'groundnut', 'none'],

  // ── Telangana ─────────────────────────────────────────────────────────────
  'Warangal':     ['cotton', 'rice', 'maize', 'tur', 'none'],
  'Karimnagar':   ['cotton', 'rice', 'maize', 'tur', 'none'],
  'Khammam':      ['cotton', 'rice', 'maize', 'sugarcane', 'none'],
  'Nalgonda':     ['rice', 'cotton', 'maize', 'none'],
  'Mahbubnagar':  ['cotton', 'rice', 'maize', 'tur', 'none'],
  'Adilabad':     ['cotton', 'soybean', 'rice', 'tur', 'none'],
  'Nizamabad':    ['rice', 'sugarcane', 'maize', 'tur', 'none'],

  // ── Karnataka ─────────────────────────────────────────────────────────────
  'Belgaum':      ['sugarcane', 'cotton', 'soybean', 'jowar', 'none'],
  'Hubli':        ['cotton', 'jowar', 'tur', 'sunflower', 'none'],
  'Dharwad':      ['cotton', 'tur', 'jowar', 'sunflower', 'none'],
  'Bellary':      ['cotton', 'groundnut', 'sunflower', 'maize', 'none'],
  'Raichur':      ['cotton', 'rice', 'tur', 'maize', 'none'],
  'Gulbarga':     ['tur', 'cotton', 'chickpea', 'jowar', 'none'],
  'Bijapur':      ['sugarcane', 'cotton', 'jowar', 'tur', 'none'],
  'Mandya':       ['sugarcane', 'rice', 'ragi', 'none'],
  'Hassan':       ['rice', 'ragi', 'maize', 'coffee', 'none'],
  'Chickmagalur': ['coffee', 'rice', 'ragi', 'none'],
  'Bangalore':    ['ragi', 'maize', 'tomato', 'vegetables', 'none'],
  'Mysore':       ['sugarcane', 'ragi', 'maize', 'none'],

  // ── Tamil Nadu ────────────────────────────────────────────────────────────
  'Thanjavur':    ['rice', 'banana', 'sugarcane', 'none'],
  'Tiruchirappalli':['rice', 'banana', 'groundnut', 'none'],
  'Coimbatore':   ['maize', 'groundnut', 'cotton', 'sugarcane', 'none'],
  'Erode':        ['turmeric', 'sugarcane', 'maize', 'none'],
  'Salem':        ['maize', 'rice', 'banana', 'none'],
  'Madurai':      ['rice', 'cotton', 'groundnut', 'none'],
  'Thoothukudi':  ['cotton', 'groundnut', 'rice', 'none'],

  // ── West Bengal ───────────────────────────────────────────────────────────
  'Bardhaman':    ['rice', 'potato', 'wheat', 'jute', 'none'],
  'Murshidabad':  ['rice', 'jute', 'mustard', 'none'],
  'Malda':        ['rice', 'jute', 'mango', 'none'],
  'Howrah':       ['rice', 'jute', 'vegetables', 'none'],
  'Siliguri':     ['rice', 'jute', 'tea', 'maize', 'none'],
  'Jalpaiguri':   ['tea', 'rice', 'jute', 'none'],

  // ── Bihar ─────────────────────────────────────────────────────────────────
  'Champaran':    ['sugarcane', 'wheat', 'rice', 'maize', 'none'],
  'Muzaffarpur':  ['wheat', 'rice', 'maize', 'litchi', 'none'],
  'Patna':        ['wheat', 'rice', 'maize', 'potato', 'none'],
  'Gaya':         ['wheat', 'rice', 'tur', 'maize', 'none'],
  'Bhagalpur':    ['wheat', 'rice', 'maize', 'jute', 'none'],
  'Darbhanga':    ['wheat', 'rice', 'sugarcane', 'jute', 'none'],
  'Samastipur':   ['wheat', 'rice', 'sugarcane', 'jute', 'none'],

  // ── Assam ─────────────────────────────────────────────────────────────────
  'Jorhat':       ['tea', 'rice', 'jute', 'none'],
  'Dibrugarh':    ['tea', 'rice', 'jute', 'none'],
  'Sivasagar':    ['tea', 'rice', 'sugarcane', 'none'],
  'Nagaon':       ['rice', 'jute', 'mustard', 'none'],
  'Guwahati':     ['rice', 'jute', 'mustard', 'none'],
};

// ── Main export function ─────────────────────────────────────────────────────
/**
 * Returns crop options for a given state and district.
 * Checks district-level first, falls back to state-level, then universal fallback.
 * Always includes 'none' as last option.
 *
 * @param {string} state    - e.g. 'Punjab'
 * @param {string} district - e.g. 'Ludhiana'
 * @returns {{ value: string, label: string }[]}
 */
export function getPrevCrops(state, district) {
  // 1. District-level override (most specific)
  if (district && DISTRICT_CROPS[district]) {
    return makeCrops(DISTRICT_CROPS[district]);
  }
  // 2. State-level default
  if (state && STATE_CROPS[state]) {
    return makeCrops(STATE_CROPS[state]);
  }
  // 3. Universal fallback — covers any unknown state/district
  return makeCrops(['wheat', 'rice', 'maize', 'cotton', 'mustard', 'chickpea', 'soybean', 'none']);
}

export default getPrevCrops;