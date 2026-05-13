// soilMap.js — Auto-detect dominant soil type by Indian state/district
// Sources: ICAR Soil Survey, National Bureau of Soil Survey & Land Use Planning
//
// Soil types used: 'alluvial' | 'black' | 'red' | 'sandy' | 'clay'
// Returns the most prevalent soil type for a given state+district combo.

// ── District-level overrides (more specific than state default) ────────────
// Only listed where the district differs from the state's dominant soil.
const DISTRICT_SOIL = {
  // ── Andhra Pradesh ────────────────────────────────────────────────────────
  'Visakhapatnam': 'red',   'Vizianagaram': 'red',   'Srikakulam': 'red',
  'East Godavari': 'alluvial', 'West Godavari': 'alluvial', 'Krishna': 'alluvial',
  'Guntur': 'black',        'Prakasam': 'black',     'Nellore': 'alluvial',
  'Kurnool': 'black',       'Kadapa': 'red',         'Anantapur': 'red',
  'Chittoor': 'red',        'Rajampet': 'red',

  // ── Arunachal Pradesh ─────────────────────────────────────────────────────
  'Itanagar': 'red',        'Pasighat': 'alluvial',  'Naharlagun': 'red',

  // ── Assam ─────────────────────────────────────────────────────────────────
  'Guwahati': 'alluvial',   'Silchar': 'alluvial',   'Dibrugarh': 'alluvial',
  'Jorhat': 'alluvial',     'Nagaon': 'alluvial',    'Tinsukia': 'alluvial',
  'Dhubri': 'alluvial',     'Bongaigaon': 'alluvial',

  // ── Bihar ─────────────────────────────────────────────────────────────────
  'Patna': 'alluvial',      'Muzaffarpur': 'alluvial', 'Darbhanga': 'alluvial',
  'Gaya': 'alluvial',       'Bhagalpur': 'alluvial', 'Purnia': 'alluvial',
  'Katihar': 'alluvial',    'Munger': 'alluvial',    'Chhapra': 'alluvial',

  // ── Chhattisgarh ─────────────────────────────────────────────────────────
  'Raipur': 'red',          'Bilaspur': 'red',       'Korba': 'red',
  'Durg': 'black',          'Rajnandgaon': 'black',  'Jagdalpur': 'red',
  'Raigarh': 'alluvial',    'Mahasamund': 'red',

  // ── Goa ───────────────────────────────────────────────────────────────────
  'Panaji': 'red',          'Margao': 'red',         'Vasco da Gama': 'red',

  // ── Gujarat ───────────────────────────────────────────────────────────────
  'Ahmedabad': 'black',     'Surat': 'alluvial',     'Vadodara': 'black',
  'Rajkot': 'black',        'Bhavnagar': 'black',    'Jamnagar': 'sandy',
  'Gandhinagar': 'alluvial','Junagadh': 'black',     'Anand': 'alluvial',
  'Navsari': 'alluvial',    'Surendranagar': 'black','Bharuch': 'alluvial',
  'Porbandar': 'sandy',     'Kutch': 'sandy',        'Banaskantha': 'sandy',
  'Patan': 'sandy',         'Mehsana': 'alluvial',   'Botad': 'black',

  // ── Haryana ───────────────────────────────────────────────────────────────
  'Faridabad': 'alluvial',  'Gurgaon': 'alluvial',  'Panipat': 'alluvial',
  'Ambala': 'alluvial',     'Yamunanagar': 'alluvial','Rohtak': 'alluvial',
  'Hisar': 'sandy',         'Karnal': 'alluvial',   'Sonipat': 'alluvial',
  'Bhiwani': 'sandy',       'Sirsa': 'sandy',       'Fatehabad': 'sandy',
  'Jind': 'alluvial',       'Narnaul': 'sandy',     'Rewari': 'alluvial',

  // ── Himachal Pradesh ─────────────────────────────────────────────────────
  'Shimla': 'red',          'Mandi': 'alluvial',    'Solan': 'red',
  'Dharamshala': 'alluvial','Kangra': 'alluvial',   'Kullu': 'alluvial',
  'Hamirpur': 'red',        'Una': 'alluvial',      'Bilaspur': 'alluvial',

  // ── Jharkhand ─────────────────────────────────────────────────────────────
  'Ranchi': 'red',          'Jamshedpur': 'red',    'Dhanbad': 'red',
  'Bokaro Steel City': 'red','Hazaribag': 'red',    'Giridih': 'red',
  'Dumka': 'red',           'Chaibasa': 'red',

  // ── Karnataka ─────────────────────────────────────────────────────────────
  'Bangalore': 'red',       'Mysore': 'red',        'Hubli': 'black',
  'Mangalore': 'red',       'Belgaum': 'black',     'Gulbarga': 'black',
  'Davanagere': 'red',      'Bellary': 'black',     'Shimoga': 'red',
  'Tumkur': 'red',          'Raichur': 'black',     'Bijapur': 'black',
  'Udupi': 'red',           'Hassan': 'red',        'Dharwad': 'black',
  'Hospet': 'black',        'Gadag': 'black',       'Bagalkot': 'black',
  'Koppal': 'black',        'Mandya': 'red',        'Kolar': 'red',
  'Chickmagalur': 'red',    'Chitradurga': 'red',

  // ── Kerala ────────────────────────────────────────────────────────────────
  'Thiruvananthapuram': 'red','Kochi': 'alluvial',  'Kozhikode': 'red',
  'Kollam': 'red',          'Thrissur': 'red',      'Alappuzha': 'alluvial',
  'Palakkad': 'red',        'Malappuram': 'red',    'Kottayam': 'red',
  'Kannur': 'red',          'Kasaragod': 'red',     'Idukki': 'red',
  'Wayanad': 'red',         'Ernakulam': 'alluvial',

  // ── Madhya Pradesh ────────────────────────────────────────────────────────
  'Bhopal': 'black',        'Indore': 'black',      'Jabalpur': 'black',
  'Gwalior': 'alluvial',    'Ujjain': 'black',      'Sagar': 'black',
  'Dewas': 'black',         'Satna': 'alluvial',    'Ratlam': 'black',
  'Rewa': 'alluvial',       'Chhindwara': 'red',    'Guna': 'black',
  'Shivpuri': 'black',      'Vidisha': 'black',     'Chhatarpur': 'red',
  'Khandwa': 'black',       'Balaghat': 'red',      'Mandla': 'red',

  // ── Maharashtra ───────────────────────────────────────────────────────────
  'Mumbai': 'alluvial',     'Pune': 'black',        'Nagpur': 'black',
  'Nashik': 'black',        'Aurangabad': 'black',  'Solapur': 'black',
  'Amravati': 'black',      'Kolhapur': 'black',    'Thane': 'alluvial',
  'Latur': 'black',         'Nanded': 'black',      'Jalgaon': 'black',
  'Akola': 'black',         'Chandrapur': 'black',  'Parbhani': 'black',
  'Sangli': 'black',        'Satara': 'black',      'Osmanabd': 'black',
  'Ahmednagar': 'black',    'Dhule': 'black',       'Raigad': 'alluvial',
  'Ratnagiri': 'red',       'Sindhudurg': 'red',    'Konkan': 'alluvial',

  // ── Manipur ───────────────────────────────────────────────────────────────
  'Imphal': 'alluvial',     'Thoubal': 'alluvial',  'Bishnupur': 'alluvial',

  // ── Meghalaya ─────────────────────────────────────────────────────────────
  'Shillong': 'red',        'Tura': 'red',          'Jowai': 'red',

  // ── Odisha ────────────────────────────────────────────────────────────────
  'Bhubaneswar': 'red',     'Cuttack': 'alluvial',  'Rourkela': 'red',
  'Brahmapur': 'red',       'Sambalpur': 'red',     'Puri': 'alluvial',
  'Balasore': 'alluvial',   'Bhadrak': 'alluvial',  'Keonjhar': 'red',
  'Rayagada': 'red',        'Koraput': 'red',       'Sundargarh': 'red',

  // ── Punjab ────────────────────────────────────────────────────────────────
  'Ludhiana': 'alluvial',   'Amritsar': 'alluvial', 'Jalandhar': 'alluvial',
  'Patiala': 'alluvial',    'Bathinda': 'sandy',    'Mohali': 'alluvial',
  'Hoshiarpur': 'alluvial', 'Batala': 'alluvial',   'Pathankot': 'alluvial',
  'Moga': 'alluvial',       'Abohar': 'sandy',      'Muktsar': 'sandy',
  'Barnala': 'alluvial',    'Rajpura': 'alluvial',  'Firozpur': 'sandy',
  'Kapurthala': 'alluvial', 'Gurdaspur': 'alluvial','Sangrur': 'alluvial',
  'Ropar': 'alluvial',      'Phagwara': 'alluvial', 'Mansa': 'sandy',
  'Fazilka': 'sandy',       'Fatehgarh Sahib': 'alluvial', 'Nawanshahr': 'alluvial',

  // ── Rajasthan ─────────────────────────────────────────────────────────────
  'Jaipur': 'sandy',        'Jodhpur': 'sandy',     'Kota': 'alluvial',
  'Bikaner': 'sandy',       'Ajmer': 'sandy',       'Udaipur': 'red',
  'Bhilwara': 'red',        'Alwar': 'sandy',       'Bharatpur': 'alluvial',
  'Sikar': 'sandy',         'Sri Ganganagar': 'alluvial','Pali': 'sandy',
  'Barmer': 'sandy',        'Jaisalmer': 'sandy',   'Nagaur': 'sandy',
  'Hanumangarh': 'alluvial','Chittorgarh': 'black', 'Dungarpur': 'red',
  'Banswara': 'red',        'Bundi': 'black',       'Jhalawar': 'black',
  'Tonk': 'alluvial',       'Sriganganagar': 'alluvial',

  // ── Tamil Nadu ────────────────────────────────────────────────────────────
  'Chennai': 'alluvial',    'Coimbatore': 'red',    'Madurai': 'black',
  'Tiruchirappalli': 'black','Salem': 'red',        'Tirunelveli': 'black',
  'Tiruppur': 'red',        'Vellore': 'red',       'Erode': 'red',
  'Thoothukudi': 'black',   'Dindigul': 'red',      'Thanjavur': 'alluvial',
  'Ranipet': 'red',         'Kanchipuram': 'alluvial','Nagapattinam': 'alluvial',
  'Cuddalore': 'alluvial',  'Villupuram': 'red',    'Dharmapuri': 'red',
  'Krishnagiri': 'red',     'Nilgiris': 'red',      'Karur': 'black',
  'Nagercoil': 'red',       'Ramanathapuram': 'black','Virudhunagar': 'black',

  // ── Telangana ─────────────────────────────────────────────────────────────
  'Hyderabad': 'red',       'Warangal': 'black',    'Nizamabad': 'black',
  'Karimnagar': 'black',    'Ramagundam': 'red',    'Khammam': 'alluvial',
  'Mahbubnagar': 'black',   'Nalgonda': 'black',    'Adilabad': 'black',
  'Suryapet': 'black',      'Miryalaguda': 'black', 'Mancherial': 'black',

  // ── Uttar Pradesh ─────────────────────────────────────────────────────────
  'Lucknow': 'alluvial',    'Kanpur': 'alluvial',   'Ghaziabad': 'alluvial',
  'Agra': 'alluvial',       'Varanasi': 'alluvial', 'Meerut': 'alluvial',
  'Prayagraj': 'alluvial',  'Bareilly': 'alluvial', 'Aligarh': 'alluvial',
  'Moradabad': 'alluvial',  'Saharanpur': 'alluvial','Gorakhpur': 'alluvial',
  'Noida': 'alluvial',      'Firozabad': 'alluvial','Jhansi': 'black',
  'Muzaffarnagar': 'alluvial','Mathura': 'alluvial','Shahjahanpur': 'alluvial',
  'Bulandshahr': 'alluvial','Etawah': 'alluvial',  'Mirzapur': 'alluvial',

  // ── Uttarakhand ───────────────────────────────────────────────────────────
  'Dehradun': 'alluvial',   'Haridwar': 'alluvial', 'Roorkee': 'alluvial',
  'Haldwani': 'alluvial',   'Rudrapur': 'alluvial', 'Rishikesh': 'alluvial',
  'Nainital': 'red',        'Almora': 'red',        'Pithoragarh': 'red',
  'Mussoorie': 'red',       'Kashipur': 'alluvial',

  // ── West Bengal ───────────────────────────────────────────────────────────
  'Kolkata': 'alluvial',    'Howrah': 'alluvial',   'Asansol': 'red',
  'Siliguri': 'alluvial',   'Durgapur': 'red',      'Bardhaman': 'alluvial',
  'Malda': 'alluvial',      'Baharampur': 'alluvial','Kharagpur': 'red',
  'Haldia': 'alluvial',     'Medinipur': 'red',     'Raiganj': 'alluvial',
  'Jalpaiguri': 'alluvial', 'Krishnanagar': 'alluvial','Nabadwip': 'alluvial',

  // ── Delhi / NCR ───────────────────────────────────────────────────────────
  'New Delhi': 'alluvial',  'Dwarka': 'alluvial',   'Rohini': 'alluvial',

  // ── Jammu & Kashmir ───────────────────────────────────────────────────────
  'Srinagar': 'alluvial',   'Jammu': 'alluvial',    'Anantnag': 'alluvial',
  'Baramulla': 'alluvial',  'Kathua': 'alluvial',

  // ── Ladakh ────────────────────────────────────────────────────────────────
  'Leh': 'sandy',           'Kargil': 'sandy',
};

// ── State-level defaults (used when district not found above) ──────────────
const STATE_SOIL = {
  'Andhra Pradesh':   'black',
  'Arunachal Pradesh':'red',
  'Assam':            'alluvial',
  'Bihar':            'alluvial',
  'Chhattisgarh':     'red',
  'Goa':              'red',
  'Gujarat':          'black',
  'Haryana':          'alluvial',
  'Himachal Pradesh': 'alluvial',
  'Jharkhand':        'red',
  'Karnataka':        'red',
  'Kerala':           'red',
  'Madhya Pradesh':   'black',
  'Maharashtra':      'black',
  'Manipur':          'alluvial',
  'Meghalaya':        'red',
  'Mizoram':          'red',
  'Nagaland':         'red',
  'Odisha':           'red',
  'Punjab':           'alluvial',
  'Rajasthan':        'sandy',
  'Sikkim':           'red',
  'Tamil Nadu':       'red',
  'Telangana':        'black',
  'Tripura':          'alluvial',
  'Uttar Pradesh':    'alluvial',
  'Uttarakhand':      'alluvial',
  'West Bengal':      'alluvial',
  'Delhi':            'alluvial',
  'Jammu and Kashmir':'alluvial',
  'Ladakh':           'sandy',
  'Chandigarh':       'alluvial',
  'Puducherry':       'alluvial',
  'Andaman and Nicobar Islands': 'red',
  'Dadra and Nagar Haveli and Daman and Diu': 'alluvial',
  'Lakshadweep':      'sandy',
};

/**
 * Returns the dominant soil type for a given state and district.
 * @param {string} state  - State name e.g. 'Punjab'
 * @param {string} district - District/city name e.g. 'Phagwara'
 * @returns {'alluvial'|'black'|'red'|'sandy'|'clay'}
 */
export function detectSoilType(state, district) {
  // District-level is most specific — check it first
  if (district && DISTRICT_SOIL[district]) return DISTRICT_SOIL[district];
  // Fall back to state default
  if (state && STATE_SOIL[state]) return STATE_SOIL[state];
  // Ultimate fallback
  return 'alluvial';
}

export default detectSoilType;
