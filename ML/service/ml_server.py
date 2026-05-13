"""
KisanMitra ML — Inference Server
══════════════════════════════════
Serves real-time predictions from PKL models via HTTP
Used by Node.js backend (bridge layer)

Endpoints:
  POST /predict/crop    — Crop recommendation
  POST /predict/soil    — Soil health analysis
  POST /predict/pest    — Pest detection
  POST /predict/market  — Market price trend
  GET  /health          — Service health
  GET  /models          — List loaded models
  POST /train           — Trigger retraining (async)

Usage: python ml_server.py [--port 5001]
"""

import json, os, sys, subprocess, argparse
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from ml_utils import load_pkl, load_json, list_pkl_models, MODELS_DIR

# ══════════════════════════════════════════════════════════════════════════════
# MODEL REGISTRY
# ══════════════════════════════════════════════════════════════════════════════
_registry = {
    'crop':   {'scaler': None, 'model': None, 'meta': None, 'loaded': False},
    'soil':   {'scaler': None, 'model': None, 'meta': None, 'loaded': False},
    'pest':   {'scaler': None, 'model': None, 'meta': None, 'loaded': False},
    'market': {'scaler': None, 'model': None, 'meta': None, 'loaded': False},
}

def _try_load_model(prefix, models_to_try):
    """Try loading from list of model names, return first success."""
    for name in models_to_try:
        try:
            return load_pkl(f'{prefix}_{name}.pkl'), name
        except FileNotFoundError:
            continue
    return None, None

def ensure_crop():
    r = _registry['crop']
    if r['loaded']: return r
    try:
        r['scaler'] = load_pkl('crop_scaler.pkl')
        r['meta']   = load_json('crop_meta.json')
        r['model'], r['model_name'] = _try_load_model('crop',
            ['votingensemble','extratrees','randomforest','gradientboosting','knn','logisticregression'])
        r['loaded'] = r['model'] is not None
        if r['loaded']:
            print(f"  ✅ Crop model loaded: {r.get('model_name','?')}")
    except Exception as e:
        print(f"  ⚠️  Crop models not found: {e}")
    return r

def ensure_soil():
    r = _registry['soil']
    if r['loaded']: return r
    try:
        r['scaler'] = load_pkl('soil_scaler.pkl')
        r['meta']   = load_json('soil_meta.json')
        r['model'], r['model_name'] = _try_load_model('soil',
            ['votingensemble','gradientboosting','extratrees','randomforest','ridge','bayesianridge'])
        r['loaded'] = r['model'] is not None
        if r['loaded']:
            print(f"  ✅ Soil model loaded: {r.get('model_name','?')}")
    except Exception as e:
        print(f"  ⚠️  Soil models not found: {e}")
    return r

def ensure_pest():
    r = _registry['pest']
    if r['loaded']: return r
    try:
        r['scaler'] = load_pkl('pest_scaler.pkl')
        r['meta']   = load_json('pest_meta.json')
        r['model'], r['model_name'] = _try_load_model('pest',
            ['votingensemble','randomforest','extratrees','gradientboosting','svm_rbf'])
        r['loaded'] = r['model'] is not None
        if r['loaded']:
            print(f"  ✅ Pest model loaded: {r.get('model_name','?')}")
    except Exception as e:
        print(f"  ⚠️  Pest models not found: {e}")
    return r

def ensure_market():
    r = _registry['market']
    if r['loaded']: return r
    try:
        r['scaler'] = load_pkl('market_scaler.pkl')
        r['meta']   = load_json('market_meta.json')
        r['model'], r['model_name'] = _try_load_model('market',
            ['votingensemble','randomforest','gradientboosting','extratrees','svm','logistic'])
        r['loaded'] = r['model'] is not None
        if r['loaded']:
            print(f"  ✅ Market model loaded: {r.get('model_name','?')}")
    except Exception as e:
        print(f"  ⚠️  Market models not found: {e}")
    return r

# ══════════════════════════════════════════════════════════════════════════════
# PREDICTION FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════
SOIL_ENC   = {'alluvial':0,'black':1,'red':2,'sandy':3,'clay':4,'laterite':5,'loamy':6,'silt':7}
SEASON_ENC = {'rabi':0,'kharif':1,'zaid':2,'annual':3}
IRRIG_ENC  = {'canal':0,'borewell':1,'rain':2,'drip':3,'sprinkler':4}

# 50 crops — index order must match train_crop.py v4 exactly
CROPS = [
    # Rabi (0-19)
    'wheat','mustard','chickpea','barley','lentil','pea',
    'potato','onion','garlic','spinach','carrot','coriander',
    'fenugreek','linseed','safflower','gram_fodder','radish',
    'cauliflower','cabbage','tomato_rabi',
    # Kharif (20-39)
    'rice','maize','cotton','soybean','groundnut','sunflower',
    'bajra','jowar','urad','moong','turmeric','ginger',
    'tur','sesame','castor','cowpea','bitter_gourd',
    'brinjal','okra','chilli',
    # Zaid (40-45)
    'watermelon','cucumber','moong_zaid','bottle_gourd','pumpkin','muskmelon',
    # Annual (46-49)
    'sugarcane','banana','papaya','coconut',
]

# Season lookup — which season each crop belongs to (for post-filter)
CROP_SEASON = {
    # Rabi
    'wheat':'rabi','mustard':'rabi','chickpea':'rabi','barley':'rabi',
    'lentil':'rabi','pea':'rabi','potato':'rabi','onion':'rabi',
    'garlic':'rabi','spinach':'rabi','carrot':'rabi','coriander':'rabi',
    'fenugreek':'rabi','linseed':'rabi','safflower':'rabi','gram_fodder':'rabi',
    'radish':'rabi','cauliflower':'rabi','cabbage':'rabi','tomato_rabi':'rabi',
    # Kharif
    'rice':'kharif','maize':'kharif','cotton':'kharif','soybean':'kharif',
    'groundnut':'kharif','sunflower':'kharif','bajra':'kharif','jowar':'kharif',
    'urad':'kharif','moong':'kharif','turmeric':'kharif','ginger':'kharif',
    'tur':'kharif','sesame':'kharif','castor':'kharif','cowpea':'kharif',
    'bitter_gourd':'kharif','brinjal':'kharif','okra':'kharif','chilli':'kharif',
    # Zaid
    'watermelon':'zaid','cucumber':'zaid','moong_zaid':'zaid',
    'bottle_gourd':'zaid','pumpkin':'zaid','muskmelon':'zaid',
    # Annual (shown in any season)
    'sugarcane':'annual','banana':'annual','papaya':'annual','coconut':'annual',
}

CROP_CATALOG = {
    # Rabi
    'wheat':        {'name':'Wheat',           'icon':'🌾','season':'Rabi',   'days':'115-140','waterNeed':'Medium',  'baseIncome':45000,'msp':2275},
    'mustard':      {'name':'Mustard',         'icon':'🌻','season':'Rabi',   'days':'90-110', 'waterNeed':'Low',     'baseIncome':28000,'msp':5650},
    'chickpea':     {'name':'Chickpea',        'icon':'🟤','season':'Rabi',   'days':'95-120', 'waterNeed':'VeryLow', 'baseIncome':32000,'msp':5440},
    'barley':       {'name':'Barley',          'icon':'🌿','season':'Rabi',   'days':'80-100', 'waterNeed':'Low',     'baseIncome':22000,'msp':1635},
    'lentil':       {'name':'Lentil',          'icon':'🫘','season':'Rabi',   'days':'100-120','waterNeed':'VeryLow', 'baseIncome':30000,'msp':6425},
    'pea':          {'name':'Pea',             'icon':'🟢','season':'Rabi',   'days':'80-100', 'waterNeed':'Low',     'baseIncome':35000,'msp':0},
    'potato':       {'name':'Potato',          'icon':'🥔','season':'Rabi',   'days':'70-90',  'waterNeed':'Medium',  'baseIncome':50000,'msp':0},
    'onion':        {'name':'Onion',           'icon':'🧅','season':'Rabi',   'days':'110-130','waterNeed':'Medium',  'baseIncome':48000,'msp':0},
    'garlic':       {'name':'Garlic',          'icon':'🧄','season':'Rabi',   'days':'130-180','waterNeed':'Low',     'baseIncome':55000,'msp':0},
    'spinach':      {'name':'Spinach',         'icon':'🥬','season':'Rabi',   'days':'40-60',  'waterNeed':'Medium',  'baseIncome':25000,'msp':0},
    'carrot':       {'name':'Carrot',          'icon':'🥕','season':'Rabi',   'days':'90-120', 'waterNeed':'Medium',  'baseIncome':40000,'msp':0},
    'coriander':    {'name':'Coriander',       'icon':'🌿','season':'Rabi',   'days':'40-50',  'waterNeed':'Low',     'baseIncome':30000,'msp':0},
    'fenugreek':    {'name':'Fenugreek',       'icon':'🌿','season':'Rabi',   'days':'90-110', 'waterNeed':'Low',     'baseIncome':25000,'msp':0},
    'linseed':      {'name':'Linseed',         'icon':'🌻','season':'Rabi',   'days':'120-150','waterNeed':'Low',     'baseIncome':22000,'msp':6020},
    'safflower':    {'name':'Safflower',       'icon':'🌸','season':'Rabi',   'days':'150-180','waterNeed':'VeryLow', 'baseIncome':20000,'msp':5800},
    'gram_fodder':  {'name':'Gram Fodder',     'icon':'🌱','season':'Rabi',   'days':'50-70',  'waterNeed':'Low',     'baseIncome':15000,'msp':0},
    'radish':       {'name':'Radish',          'icon':'🌱','season':'Rabi',   'days':'25-35',  'waterNeed':'Medium',  'baseIncome':20000,'msp':0},
    'cauliflower':  {'name':'Cauliflower',     'icon':'🥦','season':'Rabi',   'days':'60-80',  'waterNeed':'Medium',  'baseIncome':45000,'msp':0},
    'cabbage':      {'name':'Cabbage',         'icon':'🥬','season':'Rabi',   'days':'60-80',  'waterNeed':'Medium',  'baseIncome':40000,'msp':0},
    'tomato_rabi':  {'name':'Tomato (Winter)', 'icon':'🍅','season':'Rabi',   'days':'90-120', 'waterNeed':'Medium',  'baseIncome':60000,'msp':0},
    # Kharif
    'rice':         {'name':'Rice',            'icon':'🍚','season':'Kharif', 'days':'120-150','waterNeed':'High',    'baseIncome':38000,'msp':2183},
    'maize':        {'name':'Maize',           'icon':'🌽','season':'Kharif', 'days':'90-110', 'waterNeed':'Medium',  'baseIncome':30000,'msp':1962},
    'cotton':       {'name':'Cotton',          'icon':'☁️','season':'Kharif', 'days':'160-180','waterNeed':'Medium',  'baseIncome':55000,'msp':6620},
    'soybean':      {'name':'Soybean',         'icon':'🫘','season':'Kharif', 'days':'90-100', 'waterNeed':'Medium',  'baseIncome':25000,'msp':4600},
    'groundnut':    {'name':'Groundnut',       'icon':'🥜','season':'Kharif', 'days':'110-130','waterNeed':'Medium',  'baseIncome':35000,'msp':6377},
    'sunflower':    {'name':'Sunflower',       'icon':'🌸','season':'Kharif', 'days':'90-100', 'waterNeed':'Low',     'baseIncome':28000,'msp':6760},
    'bajra':        {'name':'Bajra',           'icon':'🌾','season':'Kharif', 'days':'70-90',  'waterNeed':'VeryLow', 'baseIncome':18000,'msp':2500},
    'jowar':        {'name':'Jowar',           'icon':'🌾','season':'Kharif', 'days':'100-120','waterNeed':'Low',     'baseIncome':20000,'msp':3180},
    'urad':         {'name':'Urad (Black Gram)','icon':'⚫','season':'Kharif','days':'65-85',  'waterNeed':'Low',     'baseIncome':22000,'msp':7400},
    'moong':        {'name':'Moong (Green Gram)','icon':'🟢','season':'Kharif','days':'60-75', 'waterNeed':'Low',     'baseIncome':20000,'msp':8558},
    'turmeric':     {'name':'Turmeric',        'icon':'🟡','season':'Kharif', 'days':'240-270','waterNeed':'High',    'baseIncome':65000,'msp':0},
    'ginger':       {'name':'Ginger',          'icon':'🫚','season':'Kharif', 'days':'200-240','waterNeed':'High',    'baseIncome':70000,'msp':0},
    'tur':          {'name':'Tur (Arhar)',      'icon':'🌾','season':'Kharif', 'days':'160-200','waterNeed':'Low',     'baseIncome':28000,'msp':7550},
    'sesame':       {'name':'Sesame (Til)',     'icon':'🌱','season':'Kharif', 'days':'80-100', 'waterNeed':'Low',     'baseIncome':22000,'msp':8635},
    'castor':       {'name':'Castor',          'icon':'🌿','season':'Kharif', 'days':'180-200','waterNeed':'Low',     'baseIncome':25000,'msp':0},
    'cowpea':       {'name':'Cowpea',          'icon':'🟢','season':'Kharif', 'days':'60-80',  'waterNeed':'Low',     'baseIncome':18000,'msp':0},
    'bitter_gourd': {'name':'Bitter Gourd',    'icon':'🥒','season':'Kharif', 'days':'55-70',  'waterNeed':'Medium',  'baseIncome':35000,'msp':0},
    'brinjal':      {'name':'Brinjal',         'icon':'🍆','season':'Kharif', 'days':'90-120', 'waterNeed':'Medium',  'baseIncome':30000,'msp':0},
    'okra':         {'name':'Okra (Bhindi)',   'icon':'🌿','season':'Kharif', 'days':'50-65',  'waterNeed':'Medium',  'baseIncome':32000,'msp':0},
    'chilli':       {'name':'Chilli',          'icon':'🌶️','season':'Kharif', 'days':'120-150','waterNeed':'Medium',  'baseIncome':55000,'msp':0},
    # Zaid
    'watermelon':   {'name':'Watermelon',      'icon':'🍉','season':'Zaid',   'days':'70-90',  'waterNeed':'High',    'baseIncome':40000,'msp':0},
    'cucumber':     {'name':'Cucumber',        'icon':'🥒','season':'Zaid',   'days':'45-60',  'waterNeed':'Medium',  'baseIncome':30000,'msp':0},
    'moong_zaid':   {'name':'Moong (Zaid)',    'icon':'🌱','season':'Zaid',   'days':'55-65',  'waterNeed':'Low',     'baseIncome':18000,'msp':8558},
    'bottle_gourd': {'name':'Bottle Gourd',    'icon':'🫙','season':'Zaid',   'days':'60-75',  'waterNeed':'Medium',  'baseIncome':25000,'msp':0},
    'pumpkin':      {'name':'Pumpkin',         'icon':'🎃','season':'Zaid',   'days':'80-100', 'waterNeed':'Medium',  'baseIncome':22000,'msp':0},
    'muskmelon':    {'name':'Muskmelon',       'icon':'🍈','season':'Zaid',   'days':'70-90',  'waterNeed':'Medium',  'baseIncome':35000,'msp':0},
    # Annual
    'sugarcane':    {'name':'Sugarcane',       'icon':'🎋','season':'Annual', 'days':'300-360','waterNeed':'VeryHigh','baseIncome':70000,'msp':340},
    'banana':       {'name':'Banana',          'icon':'🍌','season':'Annual', 'days':'270-365','waterNeed':'High',    'baseIncome':80000,'msp':0},
    'papaya':       {'name':'Papaya',          'icon':'🧡','season':'Annual', 'days':'240-300','waterNeed':'Medium',  'baseIncome':65000,'msp':0},
    'coconut':      {'name':'Coconut',         'icon':'🥥','season':'Annual', 'days':'365+',   'waterNeed':'High',    'baseIncome':50000,'msp':0},
}

REGION_ENC = {
    'nw_plains':0,'central':1,'south':2,
    'east':3,'northeast':4,'west':5,'hills':6,
}
STATE_REGION = {
    'Punjab':'nw_plains','Haryana':'nw_plains','Uttar Pradesh':'nw_plains',
    'Delhi':'nw_plains','Chandigarh':'nw_plains',
    'Madhya Pradesh':'central','Maharashtra':'central','Chhattisgarh':'central',
    'Andhra Pradesh':'south','Telangana':'south','Karnataka':'south',
    'Tamil Nadu':'south','Kerala':'south','Goa':'south','Puducherry':'south',
    'Bihar':'east','West Bengal':'east','Odisha':'east','Jharkhand':'east',
    'Assam':'northeast','Meghalaya':'northeast','Nagaland':'northeast',
    'Manipur':'northeast','Mizoram':'northeast','Tripura':'northeast',
    'Arunachal Pradesh':'northeast','Sikkim':'northeast',
    'Rajasthan':'west','Gujarat':'west',
    'Dadra and Nagar Haveli and Daman and Diu':'west',
    'Himachal Pradesh':'hills','Uttarakhand':'hills',
    'Jammu and Kashmir':'hills','Ladakh':'hills',
}

CROP_CATALOG = {
    'wheat':    {'name':'Wheat',    'icon':'🌾','season':'Rabi',  'days':'115-140','waterNeed':'Medium',  'baseIncome':45000,'msp':2275},
    'rice':     {'name':'Rice',     'icon':'🍚','season':'Kharif','days':'120-150','waterNeed':'High',    'baseIncome':38000,'msp':2183},
    'maize':    {'name':'Maize',    'icon':'🌽','season':'Kharif','days':'90-110', 'waterNeed':'Medium',  'baseIncome':30000,'msp':1962},
    'cotton':   {'name':'Cotton',   'icon':'☁️','season':'Kharif','days':'160-180','waterNeed':'Medium',  'baseIncome':55000,'msp':6620},
    'mustard':  {'name':'Mustard',  'icon':'🌻','season':'Rabi',  'days':'90-110', 'waterNeed':'Low',     'baseIncome':28000,'msp':5650},
    'chickpea': {'name':'Chickpea', 'icon':'🟤','season':'Rabi',  'days':'95-120', 'waterNeed':'VeryLow', 'baseIncome':32000,'msp':5440},
    'soybean':  {'name':'Soybean',  'icon':'🫘','season':'Kharif','days':'90-100', 'waterNeed':'Medium',  'baseIncome':25000,'msp':4600},
    'sugarcane':{'name':'Sugarcane','icon':'🎋','season':'Annual','days':'300-360','waterNeed':'VeryHigh','baseIncome':70000,'msp':340},
    'barley':   {'name':'Barley',   'icon':'🌿','season':'Rabi',  'days':'80-100', 'waterNeed':'Low',     'baseIncome':22000,'msp':1635},
    'groundnut':{'name':'Groundnut','icon':'🥜','season':'Kharif','days':'110-130','waterNeed':'Medium',  'baseIncome':35000,'msp':6377},
}

def predict_crop(params):
    r = ensure_crop()
    if not r['loaded']:
        return {'error': 'Crop models not loaded. Run training first.', 'trained': False}

    ph          = float(params.get('ph', 7.0))
    nitrogen    = float(params.get('nitrogen', 200))
    phosphorus  = float(params.get('phosphorus', 15))
    potassium   = float(params.get('potassium', 200))
    temperature = float(params.get('temperature', 25))
    rainfall    = float(params.get('rainfall', 500))
    season      = str(params.get('season', 'rabi')).lower()
    soil_type   = str(params.get('soilType', 'alluvial')).lower()
    humidity    = float(params.get('humidity', 60))
    wind_speed  = float(params.get('windSpeed', 12))
    organic_carbon = float(params.get('organicCarbon', 1.0))
    zinc        = float(params.get('zinc', 0.8))
    area        = float(params.get('area', 2))
    prev_crop   = str(params.get('prevCrop', '')).lower()

    X = np.array([[ph, nitrogen, phosphorus, potassium, temperature, rainfall,
                   SEASON_ENC.get(season, 0), SOIL_ENC.get(soil_type, 0),
                   humidity, wind_speed, organic_carbon, zinc,
                   REGION_ENC.get(STATE_REGION.get(str(params.get('state','Punjab')), 'nw_plains'), 0),
                   IRRIG_ENC.get(str(params.get('irrigation', params.get('irrigationSource','canal'))).lower(), 0)]])

    X_scaled = r['scaler'].transform(X)

    try:
        proba = r['model'].predict_proba(X_scaled)[0]
    except:
        pred = int(r['model'].predict(X_scaled)[0])
        proba = [0.02] * len(CROPS)
        if pred < len(proba): proba[pred] = 0.85

    results = []
    for i, crop in enumerate(CROPS):
        # ── SEASON FILTER — never recommend a crop from wrong season ──────────
        crop_season = CROP_SEASON.get(crop, 'rabi')
        # Annual crops appear in every season
        if crop_season != 'annual' and crop_season != season:
            continue  # skip crops that don't belong to selected season

        score   = float(proba[i]) if i < len(proba) else 0.0
        penalty = -0.15 if prev_crop and prev_crop in crop else 0
        adj     = max(0.0, min(1.0, score + penalty))

        # Safe lookup — guarantees no undefined in frontend
        info = CROP_CATALOG.get(crop)
        if info is None:
            info = {'name': crop.replace('_',' ').title(), 'icon':'🌱',
                    'season':'Unknown','days':'60-120','waterNeed':'Medium',
                    'baseIncome':20000,'msp':0}

        # ── Tags ─────────────────────────────────────────────────────────────
        tags = []
        if adj >= 0.28: tags.append('⭐ Top Pick')
        MSP_CROPS = {'wheat','rice','cotton','mustard','chickpea','maize','jowar',
                     'bajra','urad','moong','moong_zaid','groundnut','sunflower',
                     'barley','lentil','tur','sesame','linseed','safflower','sugarcane'}
        if crop in MSP_CROPS:
            tags.append('🏷️ MSP Protected')
        LOW_WATER = {'bajra','jowar','barley','mustard','chickpea','lentil','linseed',
                     'safflower','urad','moong','moong_zaid','garlic','coriander',
                     'fenugreek','gram_fodder','tur','sesame','castor','cowpea'}
        if crop in LOW_WATER:
            tags.append('💧 Low Water')
        HIGH_WATER = {'rice','sugarcane','turmeric','ginger','watermelon','banana','coconut'}
        if crop in HIGH_WATER:
            tags.append('💦 High Water')
        LEGUMES = {'chickpea','lentil','pea','urad','moong','moong_zaid','soybean','cowpea','tur'}
        if crop in LEGUMES:
            tags.append('🌿 N-Fixing')
        QUICK = {'moong','moong_zaid','urad','cucumber','spinach','radish','coriander',
                 'pea','gram_fodder','okra','cowpea'}
        if crop in QUICK:
            tags.append('⚡ Quick Crop')
        if soil_type == 'black' and crop in {'cotton','jowar','soybean','chickpea','tur'}:
            tags.append('⚫ Black Soil')
        if soil_type == 'sandy' and crop in {'mustard','barley','groundnut','bajra',
                                              'watermelon','moong','sesame','castor'}:
            tags.append('🏜️ Sandy Soil')
        if soil_type == 'red' and crop in {'groundnut','maize','soybean','turmeric',
                                            'ginger','chilli','sesame','castor'}:
            tags.append('🔴 Red Soil')

        results.append({
            'id':             crop,
            'name':           info['name'],
            'icon':           info['icon'],
            'season':         info['season'],
            'days':           info['days'],
            'waterNeed':      info['waterNeed'],
            'baseIncome':     info['baseIncome'],
            'msp':            info.get('msp', 0),
            'mlScore':        round(adj * 100),
            'mlProbability':  round(proba[i] * 100, 1) if i < len(proba) else 0,
            'mlConfidence':   f"{adj*100:.1f}%",
            'estimatedIncome':round(info['baseIncome'] * area),
            'rotationNote':   '⚠️ Same as previous crop — rotation advised' if penalty < 0 else None,
            'tags':           tags,
        })

    results.sort(key=lambda x: -x['mlScore'])
    meta = r.get('meta') or {}
    best_m = r.get('model_name', 'ensemble')
    acc = meta.get('model_scores', {}).get(best_m, {}).get('accuracy_mean', 0)

    return {
        'recommendations': results[:5],
        'modelUsed': best_m,
        'modelsAvailable': list(meta.get('model_scores', {}).keys()),
        'accuracy': f"{acc:.1%}",
        'pklBacked': True,
    }

def predict_soil(params):
    r = ensure_soil()
    if not r['loaded']:
        return {'error': 'Soil models not loaded', 'trained': False}

    ph          = float(params.get('ph', 7.0))
    oc          = float(params.get('organicCarbon', 0.8))
    nitrogen    = float(params.get('nitrogen', 200))
    phosphorus  = float(params.get('phosphorus', 15))
    potassium   = float(params.get('potassium', 200))
    zinc        = float(params.get('zinc', 0.6))
    moisture    = float(params.get('moisture', 25))
    bulk_density= float(params.get('bulkDensity', 1.4))
    ec          = float(params.get('ec', 0.8))
    texture     = str(params.get('texture', 'loamy')).lower()
    TEXTURE_ENC = {'sandy':0,'loamy':1,'clay':2,'silt':3,'black':4}
    texture_code= TEXTURE_ENC.get(texture, 1)

    X = np.array([[ph, oc, nitrogen, phosphorus, potassium, zinc, moisture, bulk_density, ec, texture_code]])
    X_scaled = r['scaler'].transform(X)

    all_scores = {}
    for name in ['votingensemble','gradientboosting','extratrees','randomforest','ridge','bayesianridge']:
        try:
            m = load_pkl(f'soil_{name}.pkl')
            p = float(m.predict(X_scaled)[0])
            all_scores[name] = max(0, min(100, p))
        except: pass

    # Best prediction
    meta = r.get('meta') or {}
    best_m = r.get('model_name', 'ensemble')
    ml_score = all_scores.get(best_m, list(all_scores.values())[0] if all_scores else 50.0)
    ml_score = round(ml_score)

    confidence = None
    if len(all_scores) >= 2:
        vals = list(all_scores.values())
        confidence = {'min': round(min(vals),1), 'max': round(max(vals),1),
                      'mean': round(sum(vals)/len(vals),1), 'std': round(float(np.std(vals)),1)}

    grade  = 'A' if ml_score>=80 else 'B' if ml_score>=65 else 'C' if ml_score>=50 else 'D'
    rating = 'Excellent' if ml_score>=80 else 'Good' if ml_score>=65 else 'Moderate' if ml_score>=50 else 'Poor'
    r2 = meta.get('model_scores',{}).get(best_m,{}).get('r2_mean',0)

    return {
        'mlScore': ml_score,
        'grade': grade,
        'rating': rating,
        'modelUsed': best_m,
        'r2Score': f"{r2:.3f}",
        'confidenceRange': confidence,
        'scoresByModel': {k: round(v,1) for k,v in all_scores.items()},
        'pklBacked': True,
    }

PEST_CLASSES = ['powdery_mildew','brown_planthopper','aphids','yellow_rust',
                'stem_borer','whitefly','bollworm','leaf_curl','blast','armyworm']

def predict_pest(params):
    r = ensure_pest()
    if not r['loaded']:
        return {'error': 'Pest models not loaded', 'trained': False}

    meta = r.get('meta') or {}
    db   = meta.get('pest_database', {})
    crop = str(params.get('crop', '')).lower()
    syms = str(params.get('symptoms', '')).lower()

    def has(words): return any(w in syms or w in crop for w in words)

    X = np.array([[
        1 if 'rice' in crop else 0,
        1 if 'wheat' in crop or 'barley' in crop else 0,
        1 if 'cotton' in crop else 0,
        1 if 'maize' in crop or 'corn' in crop else 0,
        1 if 'mustard' in crop else 0,
        1 if has(['yellow','yellowing']) else 0,
        1 if has(['white','powder','mildew']) else 0,
        1 if has(['brown','hopper']) else 0,
        1 if has(['curl','curled','curling']) else 0,
        1 if has(['hole','boring','entry']) else 0,
        1 if has(['sticky','honeydew','ant']) else 0,
        1 if has(['pustule','rust','stripe']) else 0,
        1 if has(['wilt','wilting','dead']) else 0,
        1 if has(['mold','mould','powder']) else 0,
        1 if has(['stripe','streak']) else 0,
        1 if params.get('season','').lower() == 'rabi' else 0,
        1 if params.get('season','').lower() == 'kharif' else 0,
        1 if float(params.get('temperature', 25)) > 30 else 0,
        1 if float(params.get('humidity', 60)) > 75 else 0,
    ]])

    X_scaled = r['scaler'].transform(X)
    try:
        proba = r['model'].predict_proba(X_scaled)[0]
        pred_idx = int(np.argmax(proba))
        confidence = float(np.max(proba))
    except:
        pred_idx = int(r['model'].predict(X_scaled)[0])
        confidence = 0.75

    pest_key = PEST_CLASSES[pred_idx] if pred_idx < len(PEST_CLASSES) else PEST_CLASSES[0]
    pest_info = db.get(pest_key, {})

    best_m = r.get('model_name', 'ensemble')
    acc = meta.get('model_scores',{}).get(best_m,{}).get('accuracy_mean',0)

    return {
        'pestId': pest_key,
        'pestInfo': pest_info,
        'confidence': round(confidence*100, 1),
        'modelUsed': best_m,
        'accuracy': f"{acc:.1%}",
        'topPests': [
            {'pest': PEST_CLASSES[i], 'probability': round(float(p)*100,1)}
            for i,p in sorted(enumerate(proba), key=lambda x:-x[1])[:3]
        ] if len(proba) else [],
        'pklBacked': True,
    }

COMMODITY_ENC = {'wheat':0,'rice':1,'maize':2,'cotton':3,'mustard':4,
                 'soybean':5,'sugarcane':6,'onion':7,'potato':8,'tomato':9}
TREND_LABELS  = ['📉 Falling','➡️ Stable','📈 Rising']

def predict_market(params):
    r = ensure_market()
    if not r['loaded']:
        return {'error': 'Market models not loaded', 'trained': False}

    commodity  = str(params.get('commodity','wheat')).lower()
    season     = str(params.get('season','rabi')).lower()
    month      = int(params.get('month', 1))
    rainfall   = float(params.get('rainfall', 50))
    temp       = float(params.get('temperature', 22))
    prev_price = float(params.get('prevPrice', 2000))
    msp        = float(params.get('msp', 0))
    supply     = float(params.get('supplyIndex', 0.8))
    demand     = float(params.get('demandIndex', 0.8))
    msp_ratio  = (prev_price / msp) if msp > 0 else 0

    X = np.array([[
        COMMODITY_ENC.get(commodity, 0),
        SEASON_ENC.get(season, 0),
        month, rainfall, temp, prev_price, msp_ratio, msp, supply, demand
    ]])

    X_scaled = r['scaler'].transform(X)
    try:
        proba = r['model'].predict_proba(X_scaled)[0]
        trend_idx = int(np.argmax(proba))
        confidence = float(np.max(proba))
    except:
        trend_idx = 1
        confidence = 0.7

    trend_label = TREND_LABELS[trend_idx]
    meta = r.get('meta') or {}
    best_m = r.get('model_name','ensemble')
    acc = meta.get('model_scores',{}).get(best_m,{}).get('accuracy_mean',0)

    return {
        'trend': ['down','stable','up'][trend_idx],
        'trendLabel': trend_label,
        'confidence': round(confidence*100, 1),
        'modelUsed': best_m,
        'accuracy': f"{acc:.1%}",
        'probabilities': {'down': round(proba[0]*100,1), 'stable': round(proba[1]*100,1), 'up': round(proba[2]*100,1)},
        'pklBacked': True,
    }

# ══════════════════════════════════════════════════════════════════════════════
# HTTP SERVER
# ══════════════════════════════════════════════════════════════════════════════
class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass

    def send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def read_body(self):
        n = int(self.headers.get('Content-Length', 0))
        if n == 0: return {}
        raw = self.rfile.read(n)
        try: return json.loads(raw)
        except: return {}

    def do_GET(self):
        if self.path == '/health':
            # Eager load all models
            ensure_crop(); ensure_soil(); ensure_pest(); ensure_market()
            self.send_json({
                'status': 'ok',
                'service': 'KisanMitra ML Inference Server',
                'version': '2.0',
                'models': {
                    k: {'loaded': v['loaded'], 'model': v.get('model_name')}
                    for k, v in _registry.items()
                },
                'pklFiles': list_pkl_models(),
                'python': sys.version.split()[0],
                'sklearnVersion': __import__('sklearn').__version__,
                'numpyVersion': np.__version__,
            })
        elif self.path == '/models':
            ensure_crop(); ensure_soil(); ensure_pest(); ensure_market()
            self.send_json({
                'crop':   _registry['crop'].get('meta'),
                'soil':   _registry['soil'].get('meta'),
                'pest':   _registry['pest'].get('meta'),
                'market': _registry['market'].get('meta'),
                'pklFiles': list_pkl_models(),
            })
        else:
            self.send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        params = self.read_body()
        try:
            if self.path == '/predict/crop':
                self.send_json({'success': True, **predict_crop(params)})
            elif self.path == '/predict/soil':
                self.send_json({'success': True, **predict_soil(params)})
            elif self.path == '/predict/pest':
                self.send_json({'success': True, **predict_pest(params)})
            elif self.path == '/predict/market':
                self.send_json({'success': True, **predict_market(params)})
            elif self.path == '/train':
                model = params.get('model', 'all')
                train_dir = os.path.join(os.path.dirname(__file__), '..', 'training')
                proc = subprocess.Popen(
                    ['python3', 'train_all.py', model],
                    cwd=train_dir, detached=True if os.name != 'nt' else False
                )
                self.send_json({'success': True, 'message': f'Training {model} started', 'pid': proc.pid})
            else:
                self.send_json({'error': 'Not found'}, 404)
        except Exception as e:
            import traceback
            self.send_json({'success': False, 'error': str(e), 'trace': traceback.format_exc()}, 500)

# ══════════════════════════════════════════════════════════════════════════════
# STARTUP
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=int(os.environ.get('ML_PORT', 5001)))
    args = parser.parse_args()

    print(f"\n{'═'*58}")
    print(f"  🌾 KisanMitra ML Inference Server v2.0")
    print(f"  🐍 Python {sys.version.split()[0]} | scikit-learn {__import__('sklearn').__version__}")
    print(f"{'═'*58}")
    print(f"\n  Loading PKL models from: {MODELS_DIR}")

    ensure_crop(); ensure_soil(); ensure_pest(); ensure_market()

    print(f"\n  Endpoints:")
    print(f"    POST http://localhost:{args.port}/predict/crop")
    print(f"    POST http://localhost:{args.port}/predict/soil")
    print(f"    POST http://localhost:{args.port}/predict/pest")
    print(f"    POST http://localhost:{args.port}/predict/market")
    print(f"    GET  http://localhost:{args.port}/health")
    print(f"    GET  http://localhost:{args.port}/models")
    print(f"\n  ✅ Server running on port {args.port}  (Ctrl+C to stop)\n")

    server = HTTPServer(('0.0.0.0', args.port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  ⏹️  ML Server stopped\n")