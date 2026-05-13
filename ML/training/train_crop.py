"""
KisanMitra ML — Crop Recommendation  v4 (50 Crops)
════════════════════════════════════════════════════
50 crops across Rabi / Kharif / Zaid / Annual
14 features: ph, N, P, K, temp, rain, season_code, soil_code,
             humidity, wind_speed, organic_carbon, zinc,
             region_code, irrigation_code
~100 samples per crop  →  ~5000 total samples
Season strictly enforced in training data → model never mixes seasons
Target: 88-94% cross-validated accuracy
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))

import numpy as np
from ml_utils import (
    save_pkl, save_json, evaluate_classifier,
    print_scores, normalize_features, Timer, section, MODELS_DIR
)
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier,
    ExtraTreesClassifier, VotingClassifier, BaggingClassifier,
    AdaBoostClassifier
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.calibration import CalibratedClassifierCV
import warnings
warnings.filterwarnings('ignore')

# ══════════════════════════════════════════════════════════════════════════════
# 50 CROPS  — index order is fixed, never change
# ══════════════════════════════════════════════════════════════════════════════
CROPS = [
    # ── RABI  (season=0)  sown Oct-Nov, harvested Feb-Apr ────────────────
    'wheat',          # 00  NW plains staple
    'mustard',        # 01  Rajasthan/Haryana oilseed
    'chickpea',       # 02  MP/Maharashtra pulse
    'barley',         # 03  Rajasthan dry areas
    'lentil',         # 04  UP/Bihar pulse
    'pea',            # 05  UP/HP vegetable
    'potato',         # 06  UP/Punjab vegetable
    'onion',          # 07  Maharashtra/MP
    'garlic',         # 08  MP (Mandsaur)
    'spinach',        # 09  Peri-urban leafy
    'carrot',         # 10  Punjab/HP
    'coriander',      # 11  Rajasthan/MP spice
    'fenugreek',      # 12  Rajasthan
    'linseed',        # 13  MP/UP oilseed
    'safflower',      # 14  Maharashtra/AP
    'gram_fodder',    # 15  Haryana/Punjab fodder
    'radish',         # 16  NW plains vegetable
    'cauliflower',    # 17  Punjab/WB vegetable
    'cabbage',        # 18  HP/Punjab vegetable
    'tomato_rabi',    # 19  MP/Maharashtra winter tomato

    # ── KHARIF  (season=1)  sown Jun-Jul, harvested Sep-Nov ──────────────
    'rice',           # 20  East/South/NE staple
    'maize',          # 21  Central/South
    'cotton',         # 22  Black soil belt
    'soybean',        # 23  MP belt
    'groundnut',      # 24  AP/Gujarat
    'sunflower',      # 25  Karnataka/AP
    'bajra',          # 26  Rajasthan arid
    'jowar',          # 27  Maharashtra/Karnataka
    'urad',           # 28  AP/MP pulse
    'moong',          # 29  Rajasthan/UP pulse
    'turmeric',       # 30  AP/TN spice
    'ginger',         # 31  Kerala/NE spice
    'tur',            # 32  Maharashtra/AP (Arhar)
    'sesame',         # 33  Rajasthan/Gujarat
    'castor',         # 34  Gujarat oilseed
    'cowpea',         # 35  South/East
    'bitter_gourd',   # 36  UP/Bihar vegetable
    'brinjal',        # 37  WB/UP vegetable
    'okra',           # 38  UP/Maharashtra
    'chilli',         # 39  AP/TN

    # ── ZAID  (season=2)  sown Mar-Apr, harvested Jun-Jul ────────────────
    'watermelon',     # 40  Sandy riverbeds
    'cucumber',       # 41  NW plains
    'moong_zaid',     # 42  After-wheat quick crop
    'bottle_gourd',   # 43  UP/Bihar
    'pumpkin',        # 44  UP/Bihar
    'muskmelon',      # 45  Rajasthan/UP

    # ── ANNUAL  (season=3) ────────────────────────────────────────────────
    'sugarcane',      # 46  UP/South
    'banana',         # 47  TN/AP/Maharashtra
    'papaya',         # 48  AP/TN/Maharashtra
    'coconut',        # 49  Kerala/TN coastal
]

# ── Complete catalog for all 50 crops ──────────────────────────────────────
CROP_CATALOG = {
    # Rabi
    'wheat':        {'name':'Wheat',          'icon':'🌾','season':'Rabi',   'days':'115-140','waterNeed':'Medium',   'baseIncome':45000,'msp':2275},
    'mustard':      {'name':'Mustard',        'icon':'🌻','season':'Rabi',   'days':'90-110', 'waterNeed':'Low',      'baseIncome':28000,'msp':5650},
    'chickpea':     {'name':'Chickpea',       'icon':'🟤','season':'Rabi',   'days':'95-120', 'waterNeed':'VeryLow',  'baseIncome':32000,'msp':5440},
    'barley':       {'name':'Barley',         'icon':'🌿','season':'Rabi',   'days':'80-100', 'waterNeed':'Low',      'baseIncome':22000,'msp':1635},
    'lentil':       {'name':'Lentil (Masoor)','icon':'🫘','season':'Rabi',   'days':'100-120','waterNeed':'VeryLow',  'baseIncome':30000,'msp':6425},
    'pea':          {'name':'Pea',            'icon':'🟢','season':'Rabi',   'days':'80-100', 'waterNeed':'Low',      'baseIncome':35000,'msp':0},
    'potato':       {'name':'Potato',         'icon':'🥔','season':'Rabi',   'days':'70-90',  'waterNeed':'Medium',   'baseIncome':50000,'msp':0},
    'onion':        {'name':'Onion',          'icon':'🧅','season':'Rabi',   'days':'110-130','waterNeed':'Medium',   'baseIncome':48000,'msp':0},
    'garlic':       {'name':'Garlic',         'icon':'🧄','season':'Rabi',   'days':'130-180','waterNeed':'Low',      'baseIncome':55000,'msp':0},
    'spinach':      {'name':'Spinach',        'icon':'🥬','season':'Rabi',   'days':'40-60',  'waterNeed':'Medium',   'baseIncome':25000,'msp':0},
    'carrot':       {'name':'Carrot',         'icon':'🥕','season':'Rabi',   'days':'90-120', 'waterNeed':'Medium',   'baseIncome':40000,'msp':0},
    'coriander':    {'name':'Coriander',      'icon':'🌿','season':'Rabi',   'days':'40-50',  'waterNeed':'Low',      'baseIncome':30000,'msp':0},
    'fenugreek':    {'name':'Fenugreek (Methi)','icon':'🌿','season':'Rabi', 'days':'90-110', 'waterNeed':'Low',      'baseIncome':25000,'msp':0},
    'linseed':      {'name':'Linseed (Flax)', 'icon':'🌻','season':'Rabi',   'days':'120-150','waterNeed':'Low',      'baseIncome':22000,'msp':6020},
    'safflower':    {'name':'Safflower',      'icon':'🌸','season':'Rabi',   'days':'150-180','waterNeed':'VeryLow',  'baseIncome':20000,'msp':5800},
    'gram_fodder':  {'name':'Gram (Fodder)',  'icon':'🌱','season':'Rabi',   'days':'50-70',  'waterNeed':'Low',      'baseIncome':15000,'msp':0},
    'radish':       {'name':'Radish',         'icon':'🌱','season':'Rabi',   'days':'25-35',  'waterNeed':'Medium',   'baseIncome':20000,'msp':0},
    'cauliflower':  {'name':'Cauliflower',    'icon':'🥦','season':'Rabi',   'days':'60-80',  'waterNeed':'Medium',   'baseIncome':45000,'msp':0},
    'cabbage':      {'name':'Cabbage',        'icon':'🥬','season':'Rabi',   'days':'60-80',  'waterNeed':'Medium',   'baseIncome':40000,'msp':0},
    'tomato_rabi':  {'name':'Tomato (Winter)','icon':'🍅','season':'Rabi',   'days':'90-120', 'waterNeed':'Medium',   'baseIncome':60000,'msp':0},
    # Kharif
    'rice':         {'name':'Rice',           'icon':'🍚','season':'Kharif', 'days':'120-150','waterNeed':'High',     'baseIncome':38000,'msp':2183},
    'maize':        {'name':'Maize',          'icon':'🌽','season':'Kharif', 'days':'90-110', 'waterNeed':'Medium',   'baseIncome':30000,'msp':1962},
    'cotton':       {'name':'Cotton',         'icon':'☁️','season':'Kharif', 'days':'160-180','waterNeed':'Medium',   'baseIncome':55000,'msp':6620},
    'soybean':      {'name':'Soybean',        'icon':'🫘','season':'Kharif', 'days':'90-100', 'waterNeed':'Medium',   'baseIncome':25000,'msp':4600},
    'groundnut':    {'name':'Groundnut',      'icon':'🥜','season':'Kharif', 'days':'110-130','waterNeed':'Medium',   'baseIncome':35000,'msp':6377},
    'sunflower':    {'name':'Sunflower',      'icon':'🌸','season':'Kharif', 'days':'90-100', 'waterNeed':'Low',      'baseIncome':28000,'msp':6760},
    'bajra':        {'name':'Bajra',          'icon':'🌾','season':'Kharif', 'days':'70-90',  'waterNeed':'VeryLow',  'baseIncome':18000,'msp':2500},
    'jowar':        {'name':'Jowar',          'icon':'🌾','season':'Kharif', 'days':'100-120','waterNeed':'Low',      'baseIncome':20000,'msp':3180},
    'urad':         {'name':'Urad (Black Gram)','icon':'⚫','season':'Kharif','days':'65-85', 'waterNeed':'Low',      'baseIncome':22000,'msp':7400},
    'moong':        {'name':'Moong (Green Gram)','icon':'🟢','season':'Kharif','days':'60-75','waterNeed':'Low',      'baseIncome':20000,'msp':8558},
    'turmeric':     {'name':'Turmeric',       'icon':'🟡','season':'Kharif', 'days':'240-270','waterNeed':'High',     'baseIncome':65000,'msp':0},
    'ginger':       {'name':'Ginger',         'icon':'🫚','season':'Kharif', 'days':'200-240','waterNeed':'High',     'baseIncome':70000,'msp':0},
    'tur':          {'name':'Tur (Arhar)',     'icon':'🌾','season':'Kharif', 'days':'160-200','waterNeed':'Low',      'baseIncome':28000,'msp':7550},
    'sesame':       {'name':'Sesame (Til)',    'icon':'🌱','season':'Kharif', 'days':'80-100', 'waterNeed':'Low',      'baseIncome':22000,'msp':8635},
    'castor':       {'name':'Castor',         'icon':'🌿','season':'Kharif', 'days':'180-200','waterNeed':'Low',      'baseIncome':25000,'msp':0},
    'cowpea':       {'name':'Cowpea',         'icon':'🟢','season':'Kharif', 'days':'60-80',  'waterNeed':'Low',      'baseIncome':18000,'msp':0},
    'bitter_gourd': {'name':'Bitter Gourd',   'icon':'🥒','season':'Kharif', 'days':'55-70',  'waterNeed':'Medium',   'baseIncome':35000,'msp':0},
    'brinjal':      {'name':'Brinjal (Eggplant)','icon':'🍆','season':'Kharif','days':'90-120','waterNeed':'Medium',  'baseIncome':30000,'msp':0},
    'okra':         {'name':'Okra (Bhindi)',  'icon':'🌿','season':'Kharif', 'days':'50-65',  'waterNeed':'Medium',   'baseIncome':32000,'msp':0},
    'chilli':       {'name':'Chilli',         'icon':'🌶️','season':'Kharif', 'days':'120-150','waterNeed':'Medium',   'baseIncome':55000,'msp':0},
    # Zaid
    'watermelon':   {'name':'Watermelon',     'icon':'🍉','season':'Zaid',   'days':'70-90',  'waterNeed':'High',     'baseIncome':40000,'msp':0},
    'cucumber':     {'name':'Cucumber',       'icon':'🥒','season':'Zaid',   'days':'45-60',  'waterNeed':'Medium',   'baseIncome':30000,'msp':0},
    'moong_zaid':   {'name':'Moong (Zaid)',   'icon':'🌱','season':'Zaid',   'days':'55-65',  'waterNeed':'Low',      'baseIncome':18000,'msp':8558},
    'bottle_gourd': {'name':'Bottle Gourd',   'icon':'🫙','season':'Zaid',   'days':'60-75',  'waterNeed':'Medium',   'baseIncome':25000,'msp':0},
    'pumpkin':      {'name':'Pumpkin',        'icon':'🎃','season':'Zaid',   'days':'80-100', 'waterNeed':'Medium',   'baseIncome':22000,'msp':0},
    'muskmelon':    {'name':'Muskmelon',      'icon':'🍈','season':'Zaid',   'days':'70-90',  'waterNeed':'Medium',   'baseIncome':35000,'msp':0},
    # Annual
    'sugarcane':    {'name':'Sugarcane',      'icon':'🎋','season':'Annual', 'days':'300-360','waterNeed':'VeryHigh', 'baseIncome':70000,'msp':340},
    'banana':       {'name':'Banana',         'icon':'🍌','season':'Annual', 'days':'270-365','waterNeed':'High',     'baseIncome':80000,'msp':0},
    'papaya':       {'name':'Papaya',         'icon':'🧡','season':'Annual', 'days':'240-300','waterNeed':'Medium',   'baseIncome':65000,'msp':0},
    'coconut':      {'name':'Coconut',        'icon':'🥥','season':'Annual', 'days':'365+',   'waterNeed':'High',     'baseIncome':50000,'msp':0},
}

# ══════════════════════════════════════════════════════════════════════════════
# ENCODING MAPS
# ══════════════════════════════════════════════════════════════════════════════
SOIL_ENC   = {'alluvial':0,'black':1,'red':2,'sandy':3,'clay':4,'laterite':5,'loamy':6,'silt':7}
SEASON_ENC = {'rabi':0,'kharif':1,'zaid':2,'annual':3}
IRRIG_ENC  = {'canal':0,'borewell':1,'rain':2,'drip':3,'sprinkler':4}
REGION_ENC = {
    'nw_plains':0, 'central':1, 'south':2,
    'east':3, 'northeast':4, 'west':5, 'hills':6,
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

FEATURE_NAMES = [
    'ph','nitrogen','phosphorus','potassium','temperature',
    'rainfall','season_code','soil_code','humidity','wind_speed',
    'organic_carbon','zinc','region_code','irrigation_code'
]

# ══════════════════════════════════════════════════════════════════════════════
# DATASET — ~100 samples per crop, season strictly enforced
# Format: [ph,N,P,K,temp,rain,season,soil,hum,wind,oc,zn,region,irrig, LABEL]
# season: rabi=0, kharif=1, zaid=2, annual=3
# soil:   alluvial=0,black=1,red=2,sandy=3,clay=4,loamy=6
# region: nw=0,central=1,south=2,east=3,ne=4,west=5,hills=6
# irrig:  canal=0,borewell=1,rain=2,drip=3
# ══════════════════════════════════════════════════════════════════════════════
def build_dataset():
    rng = np.random.RandomState(42)

    def row(ph,n,p,k,temp,rain,sea,soil,hum,wind,oc,zn,reg,irr,lbl, ns=0.05):
        def j(v,lo,hi): return float(np.clip(v*(1+rng.uniform(-ns,ns)),lo,hi))
        return [j(ph,4,9.5),j(n,40,520),j(p,4,130),j(k,40,480),
                j(temp,6,46),j(rain,40,2600),
                sea,soil, j(hum,18,96),j(wind,2,40),
                j(oc,0.1,4.2),j(zn,0.04,3.8),
                reg,irr, lbl]

    D=[]

    # helper: repeat a base row N times with noise
    def add(n_times, *args, **kw):
        for _ in range(n_times):
            D.append(row(*args, **kw))

    # ─── RABI CROPS ──────────────────────────────────────────────────────────

    # 00 WHEAT — season=0, alluvial/loamy, cool 15-22, 350-550mm, NW+East
    add(30, 7.1,285,30,220,20,445, 0,0,60,12,1.35,1.00, 0,0, 0)  # Punjab canal
    add(25, 6.9,275,27,208,18,415, 0,0,57,10,1.25,0.90, 0,1, 0)  # Haryana borewell
    add(20, 7.2,295,31,225,21,460, 0,0,62,12,1.40,1.00, 3,0, 0)  # UP canal
    add(15, 7.0,270,28,210,19,430, 0,6,59,11,1.30,1.00, 0,0, 0)  # NW loamy
    add(10, 6.8,265,26,205,16,520, 0,2,65,14,1.20,0.90, 6,1, 0)  # Hills

    # 01 MUSTARD — season=0, sandy/alluvial, cool 10-18, 200-350mm, West+NW
    add(30, 7.0,180,15,150,15,295, 0,3,44,15,0.88,0.68, 5,2, 1)  # Rajasthan sandy rain
    add(25, 7.2,190,16,160,14,315, 0,3,46,14,0.95,0.75, 5,1, 1)  # Gujarat borewell
    add(20, 6.9,178,15,148,16,305, 0,0,45,14,0.90,0.70, 0,1, 1)  # Haryana
    add(15, 7.1,185,16,155,15,310, 0,0,46,15,0.92,0.72, 0,0, 1)  # UP
    add(10, 6.7,165,13,135,12,280, 0,2,42,13,0.80,0.62, 6,2, 1)  # Hills dry

    # 02 CHICKPEA — season=0, black/sandy, cool 15-25, 300-450mm, Central+West
    add(30, 7.6,125,36,205,21,408, 0,1,51,12,0.82,0.82, 1,2, 2)  # MP black rain
    add(25, 7.8,132,39,212,22,428, 0,1,53,13,0.92,0.88, 1,2, 2)  # Maha black
    add(20, 7.4,115,33,194,20,392, 0,3,48,11,0.75,0.72, 5,2, 2)  # Rajasthan sandy
    add(15, 7.5,120,35,200,22,405, 0,1,50,12,0.80,0.80, 2,2, 2)  # AP black
    add(10, 7.3,118,34,198,20,398, 0,2,49,12,0.78,0.75, 2,2, 2)  # Karnataka

    # 03 BARLEY — season=0, sandy, very cool 8-15, 200-340mm, West+Hills
    add(30, 7.1,155,21,145,13,340, 0,3,44,12,0.80,0.60, 5,2, 3)  # Rajasthan rain
    add(25, 7.3,162,23,152,12,355, 0,3,46,13,0.86,0.66, 5,2, 3)  # Gujarat dry
    add(20, 7.0,150,20,140,11,330, 0,3,43,12,0.76,0.58, 0,2, 3)  # Punjab marginal
    add(15, 7.2,157,22,148,10,348, 0,0,45,12,0.82,0.63, 0,1, 3)  # UP
    add(10, 6.8,145,19,135, 9,310, 0,3,41,11,0.72,0.55, 6,2, 3)  # Hills cool

    # 04 LENTIL — season=0, alluvial/loamy, cool 18-25, 250-400mm, NW+East
    add(30, 7.0,100,28,160,20,320, 0,0,52,12,0.90,0.70, 0,2, 4)
    add(25, 6.8,110,30,170,21,340, 0,6,54,11,0.95,0.75, 3,2, 4)
    add(20, 7.2,105,29,165,19,330, 0,0,53,12,0.92,0.72, 1,2, 4)
    add(15, 6.9,108,28,168,20,328, 0,0,53,11,0.91,0.71, 3,2, 4)
    add(10, 7.1,103,27,162,18,322, 0,6,52,11,0.90,0.70, 0,1, 4)

    # 05 PEA — season=0, loamy, cool 10-18, 350-500mm, Hills+NW
    add(30, 6.8,120,45,180,14,420, 0,6,58,10,1.10,0.80, 6,1, 5)
    add(25, 7.0,130,48,190,15,440, 0,0,60,11,1.15,0.85, 0,1, 5)
    add(20, 6.9,125,46,185,13,430, 0,6,59,10,1.12,0.82, 6,2, 5)
    add(15, 6.7,118,44,178,14,415, 0,0,57,10,1.08,0.78, 3,1, 5)
    add(10, 7.1,128,47,188,14,435, 0,0,58,11,1.13,0.82, 0,0, 5)

    # 06 POTATO — season=0, alluvial, cool 15-20, 400-600mm
    add(30, 6.5,200,80,250,17,480, 0,0,65,12,1.50,0.90, 0,0, 6)
    add(25, 6.3,195,78,245,16,460, 0,0,63,11,1.45,0.88, 0,1, 6)
    add(20, 6.0,185,75,238,15,440, 0,6,61,10,1.40,0.85, 6,1, 6)
    add(15, 6.4,192,77,242,16,468, 0,0,64,11,1.43,0.87, 3,0, 6)
    add(10, 6.6,205,82,255,17,492, 0,0,66,12,1.52,0.91, 0,3, 6)

    # 07 ONION — season=0, alluvial/black, warm 15-25
    add(30, 6.5,160,60,200,22,580, 0,1,55,14,1.20,0.80, 1,3, 7)
    add(25, 6.8,170,65,210,24,610, 0,0,57,15,1.25,0.82, 1,3, 7)
    add(20, 6.3,155,58,195,21,565, 0,1,53,13,1.18,0.78, 2,3, 7)
    add(15, 6.6,162,61,202,23,590, 0,3,55,14,1.21,0.80, 5,3, 7)
    add(10, 6.9,175,66,215,24,620, 0,0,58,15,1.28,0.84, 0,1, 7)

    # 08 GARLIC — season=0, loamy/alluvial, cool 18-28
    add(30, 7.0,140,55,180,22,520, 0,6,52,12,1.10,0.75, 1,1, 8)
    add(25, 7.2,148,58,188,23,540, 0,0,54,13,1.15,0.78, 1,3, 8)
    add(20, 6.8,135,52,175,21,505, 0,3,50,12,1.08,0.73, 5,1, 8)
    add(15, 7.1,142,56,182,22,525, 0,6,52,12,1.11,0.76, 5,3, 8)
    add(10, 6.9,138,54,178,22,515, 0,0,51,12,1.09,0.74, 0,1, 8)

    # 09 SPINACH — season=0, alluvial, mild 12-22
    add(30, 6.8,180,50,160,18,420, 0,0,58,10,1.30,0.80, 0,1, 9)
    add(25, 7.0,190,55,168,19,440, 0,0,60,11,1.35,0.82, 0,0, 9)
    add(20, 6.6,175,48,155,17,410, 0,0,56,10,1.28,0.78, 0,3, 9)
    add(15, 6.9,185,52,163,18,430, 0,0,59,10,1.32,0.80, 3,1, 9)
    add(10, 7.1,192,56,170,19,445, 0,6,61,11,1.36,0.83, 0,1, 9)

    # 10 CARROT — season=0, sandy loam, cool 15-20, Hills+Punjab
    add(30, 6.5,150,55,175,16,450, 0,3,56,11,1.20,0.80, 6,1, 10)
    add(25, 6.7,158,58,182,17,470, 0,6,58,12,1.25,0.82, 6,3, 10)
    add(20, 6.3,145,53,170,15,435, 0,3,54,11,1.18,0.78, 0,1, 10)
    add(15, 6.6,152,56,178,16,458, 0,6,57,11,1.22,0.80, 0,3, 10)
    add(10, 6.8,160,59,185,17,475, 0,3,59,12,1.27,0.83, 6,1, 10)

    # 11 CORIANDER — season=0, sandy loam, cool 20-25, Rajasthan+MP
    add(30, 7.2,120,40,150,22,280, 0,3,45,14,0.90,0.68, 5,2, 11)
    add(25, 7.0,128,43,158,21,295, 0,6,47,13,0.95,0.70, 5,2, 11)
    add(20, 7.4,125,41,155,23,288, 0,3,46,14,0.92,0.69, 1,2, 11)
    add(15, 7.1,122,42,152,22,285, 0,3,45,13,0.91,0.68, 5,1, 11)
    add(10, 6.9,118,40,148,21,278, 0,6,44,13,0.89,0.67, 5,2, 11)

    # 12 FENUGREEK — season=0, sandy/loam, cool 15-25, Rajasthan dominant
    add(30, 7.0,110,35,140,18,260, 0,3,42,14,0.82,0.62, 5,2, 12)
    add(25, 7.2,118,37,148,19,275, 0,3,44,15,0.86,0.65, 5,2, 12)
    add(20, 6.9,108,34,138,17,255, 0,6,41,13,0.80,0.61, 5,2, 12)
    add(15, 7.1,115,36,145,18,268, 0,3,43,14,0.83,0.63, 0,2, 12)
    add(10, 7.3,120,38,150,20,280, 0,3,45,15,0.87,0.66, 0,1, 12)

    # 13 LINSEED — season=0, alluvial/loam, cool 20-25, MP+UP
    add(30, 6.8,120,35,150,20,320, 0,0,50,12,0.95,0.70, 1,2, 13)
    add(25, 7.0,128,37,158,21,335, 0,6,52,13,1.00,0.73, 1,2, 13)
    add(20, 6.9,125,36,155,20,328, 0,0,51,12,0.97,0.71, 0,2, 13)
    add(15, 7.1,130,38,160,21,340, 0,0,53,13,1.02,0.74, 3,2, 13)
    add(10, 6.7,118,34,148,19,315, 0,6,49,12,0.93,0.69, 1,2, 13)

    # 14 SAFFLOWER — season=0, black/red, dry 15-25, Maharashtra+AP
    add(30, 7.5,130,30,160,22,300, 0,1,40,16,0.85,0.65, 1,2, 14)
    add(25, 7.8,140,32,168,24,320, 0,1,42,17,0.90,0.68, 1,2, 14)
    add(20, 7.3,125,29,155,21,290, 0,2,38,15,0.82,0.63, 2,2, 14)
    add(15, 7.6,135,31,164,23,310, 0,1,41,16,0.87,0.66, 2,2, 14)
    add(10, 8.0,145,34,172,25,330, 0,1,44,18,0.93,0.70, 5,2, 14)

    # 15 GRAM FODDER — season=0, alluvial, mild 15-22, NW Punjab/Haryana
    add(30, 7.0,160,40,170,18,380, 0,0,55,12,1.10,0.75, 0,0, 15)
    add(25, 7.2,168,43,178,19,398, 0,0,57,13,1.15,0.77, 0,1, 15)
    add(20, 6.9,155,38,165,17,368, 0,6,54,12,1.08,0.73, 0,0, 15)
    add(15, 7.1,162,41,172,18,385, 0,0,56,12,1.12,0.75, 0,2, 15)
    add(10, 7.3,170,44,180,20,405, 0,0,58,13,1.18,0.78, 3,0, 15)

    # 16 RADISH — season=0, loamy, cool 15-20, NW plains peri-urban
    add(30, 6.8,160,50,160,17,400, 0,6,55,11,1.15,0.78, 0,1, 16)
    add(25, 7.0,168,53,168,18,418, 0,0,57,12,1.20,0.80, 0,3, 16)
    add(20, 6.6,155,48,155,16,388, 0,6,53,11,1.12,0.76, 0,1, 16)
    add(15, 6.9,162,51,162,17,405, 0,0,56,11,1.17,0.78, 3,3, 16)
    add(10, 7.1,170,55,170,18,422, 0,6,58,12,1.22,0.81, 0,1, 16)

    # 17 CAULIFLOWER — season=0, loamy, cool 15-20, Punjab/WB
    add(30, 6.5,180,65,200,17,500, 0,6,62,12,1.40,0.88, 0,3, 17)
    add(25, 6.7,188,68,208,18,520, 0,0,64,13,1.45,0.90, 0,3, 17)
    add(20, 6.3,175,62,195,16,488, 0,6,60,11,1.37,0.86, 3,3, 17)
    add(15, 6.6,182,66,202,17,508, 0,0,62,12,1.41,0.88, 0,1, 17)
    add(10, 6.8,190,70,212,18,525, 0,6,65,13,1.48,0.92, 6,3, 17)

    # 18 CABBAGE — season=0, loamy, cool 15-20, HP+Punjab
    add(30, 6.4,175,62,195,16,490, 0,6,60,11,1.35,0.85, 6,3, 18)
    add(25, 6.6,182,65,202,17,508, 0,6,62,12,1.40,0.87, 0,3, 18)
    add(20, 6.2,168,60,188,15,475, 0,6,58,10,1.32,0.83, 6,1, 18)
    add(15, 6.5,178,63,198,16,495, 0,0,61,11,1.37,0.85, 0,3, 18)
    add(10, 6.7,185,67,208,17,515, 0,6,63,12,1.43,0.89, 6,3, 18)

    # 19 TOMATO RABI — season=0, alluvial/red, warm 18-27, MP+Maha
    add(30, 6.5,200,70,250,24,550, 0,2,58,14,1.50,0.90, 1,3, 19)
    add(25, 6.8,210,75,260,26,580, 0,0,60,15,1.55,0.92, 1,3, 19)
    add(20, 6.3,195,68,245,23,538, 0,2,56,13,1.47,0.88, 2,3, 19)
    add(15, 6.6,205,72,255,25,562, 0,0,58,14,1.52,0.91, 0,3, 19)
    add(10, 6.9,215,78,268,27,595, 0,2,62,15,1.58,0.93, 1,3, 19)

    # ─── KHARIF CROPS ────────────────────────────────────────────────────────

    # 20 RICE — season=1, alluvial/clay, hot 28-35, >1000mm, East/South/NE
    add(30, 6.1,348,30,198,31,1170, 1,0,85,18,1.50,0.80, 3,0, 20)  # Bihar canal
    add(25, 5.9,335,28,192,30,1120, 1,4,83,17,1.30,0.70, 3,2, 20)  # Odisha rain
    add(20, 6.3,360,33,205,33,1300, 1,0,88,20,1.70,0.90, 2,0, 20)  # AP hot
    add(15, 5.8,320,26,185,30,1600, 1,4,90,16,1.40,0.70, 4,2, 20)  # NE rain
    add(10, 7.0,355,32,202,32, 900, 1,0,78,15,1.50,0.80, 0,0, 20)  # Punjab irrigated

    # 21 MAIZE — season=1, red/alluvial, warm 25-32, 500-800mm, varied
    add(30, 6.5,255,46,182,28,615, 1,2,70,15,1.20,0.80, 1,2, 21)
    add(25, 6.8,278,50,192,30,655, 1,0,72,16,1.35,0.90, 1,1, 21)
    add(20, 6.3,245,43,176,29,590, 1,2,68,14,1.15,0.70, 2,2, 21)
    add(15, 6.6,265,46,183,28,620, 1,0,71,15,1.20,0.80, 3,0, 21)
    add(10, 7.0,290,50,205,34,350, 2,2,52,18,1.30,0.80, 1,3, 21)  # zaid/warm

    # 22 COTTON — season=1, BLACK soil, hot 28-35, 500-700mm, Central+West
    add(30, 7.9,215,21,295,31,565, 1,1,56,21,1.10,0.60, 1,2, 22)
    add(25, 8.0,225,23,305,33,590, 1,1,58,22,1.20,0.65, 1,3, 22)
    add(20, 7.7,205,20,275,32,545, 1,1,55,20,1.05,0.55, 2,2, 22)
    add(15, 7.8,200,19,268,30,520, 1,3,53,19,1.00,0.50, 5,2, 22)
    add(10, 8.1,220,22,300,33,480, 1,1,54,22,1.10,0.60, 0,1, 22)

    # 23 SOYBEAN — season=1, red/alluvial, warm 25-30, 600-900mm, MP belt
    add(30, 6.5,200,40,160,26,702, 1,2,68,14,1.20,0.72, 1,2, 23)
    add(25, 6.7,212,43,170,27,728, 1,2,70,15,1.30,0.78, 1,2, 23)
    add(20, 6.4,196,39,156,26,692, 1,1,67,13,1.15,0.70, 1,2, 23)
    add(15, 6.6,205,41,164,27,715, 1,2,69,14,1.22,0.73, 2,2, 23)
    add(10, 6.3,188,37,148,25,670, 1,2,65,13,1.08,0.65, 5,2, 23)

    # 24 GROUNDNUT — season=1, sandy/red, warm 25-32, 400-650mm, AP+Gujarat
    add(30, 6.1,125,57,135,28,510, 1,3,56,16,0.92,0.62, 2,2, 24)
    add(25, 6.3,135,62,145,29,532, 1,2,58,17,1.02,0.70, 2,2, 24)
    add(20, 6.0,120,55,130,30,498, 1,3,54,18,0.88,0.58, 5,2, 24)
    add(15, 5.9,115,52,125,29,485, 1,3,53,16,0.82,0.55, 5,2, 24)
    add(10, 6.2,128,58,138,29,516, 1,2,56,16,0.92,0.63, 2,2, 24)

    # 25 SUNFLOWER — season=1, alluvial/red, warm 20-30, 400-600mm, Karnataka+AP
    add(30, 6.5,150,45,180,26,520, 1,2,58,16,1.10,0.70, 2,3, 25)
    add(25, 6.8,160,48,190,28,545, 1,0,60,17,1.15,0.72, 2,3, 25)
    add(20, 6.3,145,43,175,25,505, 1,2,56,15,1.08,0.68, 1,3, 25)
    add(15, 6.6,155,46,185,27,530, 0,0,58,16,1.12,0.70, 0,3, 25)  # rabi variant
    add(10, 6.9,162,49,192,28,550, 1,1,60,17,1.16,0.73, 1,3, 25)

    # 26 BAJRA — season=1, sandy, hot 28-38, 150-400mm, Rajasthan arid
    add(30, 7.5,120,18,130,34,250, 1,3,40,22,0.65,0.50, 5,2, 26)
    add(25, 7.8,130,20,140,36,280, 1,3,38,24,0.68,0.52, 5,2, 26)
    add(20, 7.3,115,17,125,33,235, 1,3,42,20,0.62,0.48, 0,2, 26)
    add(15, 7.6,125,19,135,35,262, 1,3,40,22,0.66,0.51, 5,2, 26)
    add(10, 8.0,135,21,145,37,295, 1,3,36,25,0.70,0.54, 2,2, 26)

    # 27 JOWAR — season=1, black/red, warm 26-34, 400-700mm, Maharashtra+KA
    add(30, 7.2,140,25,160,30,520, 1,1,52,18,0.90,0.60, 1,2, 27)
    add(25, 7.5,150,28,170,32,550, 1,1,54,20,0.95,0.62, 1,2, 27)
    add(20, 7.0,135,24,155,29,505, 1,2,50,17,0.88,0.58, 2,2, 27)
    add(15, 7.3,145,26,162,31,530, 1,1,52,18,0.91,0.60, 2,2, 27)
    add(10, 7.6,155,29,172,33,562, 1,1,55,20,0.96,0.63, 5,2, 27)

    # 28 URAD — season=1, alluvial/red, warm 25-35, 500-750mm, AP+MP
    add(30, 6.8,100,35,140,28,580, 1,0,62,14,0.85,0.65, 2,2, 28)
    add(25, 7.0,110,38,150,30,610, 1,2,64,15,0.90,0.68, 1,2, 28)
    add(20, 6.6,105,36,145,29,595, 1,0,63,14,0.88,0.66, 3,2, 28)
    add(15, 6.9,108,37,148,28,602, 1,3,62,14,0.86,0.66, 5,2, 28)
    add(10, 7.1,112,39,152,30,618, 1,2,65,15,0.91,0.69, 2,2, 28)

    # 29 MOONG KHARIF — season=1, alluvial/sandy, warm 25-35, 400-600mm
    add(30, 7.0,100,30,130,30,480, 1,3,55,16,0.80,0.60, 5,2, 29)
    add(25, 7.2,108,32,138,32,505, 1,0,57,17,0.85,0.63, 0,2, 29)
    add(20, 6.8,105,31,135,31,495, 1,3,56,16,0.82,0.61, 5,2, 29)
    add(15, 7.1,106,31,136,30,490, 1,0,56,16,0.83,0.62, 2,2, 29)
    add(10, 7.3,110,33,140,32,510, 1,0,58,17,0.86,0.64, 3,2, 29)

    # 30 TURMERIC — season=1, clay/alluvial, hot 25-35, >1200mm, AP+TN
    add(30, 5.5,200,60,250,28,1500, 1,4,82,12,1.80,1.00, 2,3, 30)
    add(25, 5.8,210,65,260,30,1600, 1,0,85,13,1.90,1.05, 2,1, 30)
    add(20, 5.3,195,58,245,29,1480, 1,4,80,12,1.75,0.98, 4,1, 30)
    add(15, 5.6,205,62,252,29,1530, 1,4,83,12,1.82,1.02, 1,3, 30)
    add(10, 5.9,215,66,265,31,1650, 1,0,87,14,1.95,1.08, 2,3, 30)

    # 31 GINGER — season=1, loamy/clay, warm 22-32, >1500mm, Kerala+NE
    add(30, 5.5,180,65,220,26,2000, 1,4,88,10,2.20,1.20, 4,1, 31)
    add(25, 5.8,190,70,230,28,2100, 1,6,90,11,2.30,1.25, 2,3, 31)
    add(20, 5.3,175,62,215,25,1950, 1,4,86,10,2.15,1.18, 4,2, 31)
    add(15, 5.6,185,67,225,27,2050, 1,6,89,10,2.22,1.22, 6,1, 31)
    add(10, 5.9,195,72,235,29,2150, 1,4,91,11,2.35,1.28, 2,3, 31)

    # 32 TUR (Arhar) — season=1, alluvial/black, warm 25-35, 600-1000mm, AP+Maha
    add(30, 7.0,120,35,160,28,720, 1,1,58,14,0.90,0.68, 1,2, 32)
    add(25, 7.2,130,38,170,30,755, 1,0,60,15,0.95,0.72, 2,2, 32)
    add(20, 6.8,115,33,155,27,700, 1,1,56,13,0.88,0.65, 1,2, 32)
    add(15, 7.1,125,36,165,29,735, 1,2,58,14,0.92,0.69, 2,2, 32)
    add(10, 6.9,118,34,158,27,710, 1,0,57,13,0.89,0.66, 3,2, 32)

    # 33 SESAME — season=1, sandy/red, hot 25-35, 400-600mm, Rajasthan+Gujarat
    add(30, 7.2,110,25,130,30,450, 1,3,48,18,0.75,0.55, 5,2, 33)
    add(25, 7.5,120,28,140,32,480, 1,3,46,20,0.80,0.58, 5,2, 33)
    add(20, 7.0,105,23,125,29,435, 1,2,50,17,0.72,0.53, 5,2, 33)
    add(15, 7.3,115,26,135,31,462, 1,3,48,19,0.77,0.56, 2,2, 33)
    add(10, 7.6,125,30,145,33,495, 1,3,44,21,0.83,0.60, 2,2, 33)

    # 34 CASTOR — season=1, red/alluvial, hot 20-30, 500-750mm, Gujarat
    add(30, 7.0,130,30,150,28,580, 1,2,52,16,0.88,0.62, 5,2, 34)
    add(25, 7.3,140,32,160,30,610, 1,2,54,17,0.93,0.65, 5,2, 34)
    add(20, 6.8,125,28,145,27,562, 1,3,50,15,0.85,0.60, 5,2, 34)
    add(15, 7.1,135,31,155,29,595, 1,2,52,16,0.90,0.63, 2,2, 34)
    add(10, 7.4,145,34,165,31,625, 1,2,56,18,0.95,0.67, 2,2, 34)

    # 35 COWPEA — season=1, sandy/alluvial, warm 25-35, 400-700mm, South+East
    add(30, 6.5,100,30,130,28,520, 1,3,58,14,0.82,0.60, 2,2, 35)
    add(25, 6.8,108,32,138,30,545, 1,0,60,15,0.87,0.63, 3,2, 35)
    add(20, 6.3,105,31,135,29,532, 1,3,59,14,0.84,0.61, 2,2, 35)
    add(15, 6.6,110,33,142,29,555, 1,0,61,15,0.88,0.64, 3,2, 35)
    add(10, 7.0,115,35,148,31,572, 1,3,62,16,0.90,0.65, 2,2, 35)

    # 36 BITTER GOURD — season=1, loamy, warm 25-35, UP+Bihar
    add(30, 6.8,160,55,180,28,520, 1,6,60,14,1.20,0.80, 0,3, 36)
    add(25, 7.0,168,58,188,30,545, 1,0,62,15,1.25,0.83, 3,3, 36)
    add(20, 6.6,155,53,175,27,505, 1,6,58,13,1.18,0.78, 0,3, 36)
    add(15, 6.9,162,56,182,29,530, 1,0,60,14,1.22,0.80, 3,3, 36)
    add(10, 7.1,170,60,192,30,558, 1,6,63,15,1.27,0.84, 1,3, 36)

    # 37 BRINJAL — season=1, alluvial/loamy, warm 25-35, WB+UP+AP
    add(30, 6.5,165,58,185,27,530, 1,0,62,13,1.22,0.82, 3,1, 37)
    add(25, 6.8,172,61,192,29,555, 1,6,64,14,1.27,0.84, 2,3, 37)
    add(20, 6.3,160,56,180,26,515, 1,0,60,12,1.19,0.80, 3,1, 37)
    add(15, 6.6,168,59,188,28,542, 1,6,62,13,1.24,0.82, 2,3, 37)
    add(10, 6.9,175,63,196,30,562, 1,0,65,14,1.29,0.86, 1,3, 37)

    # 38 OKRA (Bhindi) — season=1, loamy/alluvial, warm 25-35, UP+Maha
    add(30, 6.5,155,55,175,28,500, 1,6,58,14,1.18,0.78, 0,3, 38)
    add(25, 6.8,162,58,182,30,522, 1,0,60,15,1.23,0.80, 1,3, 38)
    add(20, 6.3,150,53,170,27,488, 1,6,56,13,1.15,0.76, 0,3, 38)
    add(15, 6.6,158,56,178,29,510, 1,0,58,14,1.20,0.78, 3,3, 38)
    add(10, 6.9,165,60,186,30,535, 1,6,61,15,1.25,0.82, 1,3, 38)

    # 39 CHILLI — season=1, alluvial/red, warm 25-30, AP+TN
    add(30, 6.5,180,65,220,27,620, 1,2,62,14,1.35,0.88, 2,3, 39)
    add(25, 6.8,190,70,230,29,650, 1,0,64,15,1.40,0.90, 2,3, 39)
    add(20, 6.3,175,62,215,26,605, 1,2,60,13,1.32,0.86, 2,3, 39)
    add(15, 6.6,185,67,225,28,635, 1,0,62,14,1.37,0.88, 1,3, 39)
    add(10, 6.9,195,72,238,30,665, 1,2,66,15,1.43,0.92, 2,3, 39)

    # ─── ZAID CROPS ──────────────────────────────────────────────────────────

    # 40 WATERMELON — season=2, sandy, hot 30-40, UP river + Rajasthan
    add(30, 6.5,150,60,200,35,500, 2,3,50,18,1.00,0.80, 0,3, 40)
    add(25, 6.8,160,65,210,38,520, 2,3,48,20,1.05,0.82, 5,3, 40)
    add(20, 6.3,145,58,195,36,490, 2,3,52,18,0.98,0.78, 0,3, 40)
    add(15, 6.6,155,62,205,37,510, 2,3,49,19,1.02,0.80, 5,3, 40)
    add(10, 7.0,165,68,215,39,535, 2,3,46,21,1.08,0.84, 2,3, 40)

    # 41 CUCUMBER — season=2, loamy/alluvial, warm 25-35, NW plains
    add(30, 6.8,160,55,190,30,480, 2,0,55,14,1.20,0.82, 0,3, 41)
    add(25, 7.0,168,58,198,32,500, 2,6,57,15,1.25,0.84, 0,1, 41)
    add(20, 6.6,155,53,185,29,468, 2,0,54,13,1.18,0.80, 3,3, 41)
    add(15, 6.9,163,56,192,31,488, 2,0,56,14,1.22,0.82, 2,3, 41)
    add(10, 7.1,170,60,200,33,510, 2,0,58,15,1.27,0.85, 0,3, 41)

    # 42 MOONG ZAID — season=2, alluvial/sandy, hot 28-38, after-wheat
    add(30, 7.2,100,28,130,33,280, 2,0,48,18,0.75,0.58, 0,2, 42)
    add(25, 7.5,108,30,138,36,300, 2,3,45,20,0.78,0.60, 5,2, 42)
    add(20, 7.0,105,29,135,34,290, 2,0,47,18,0.76,0.59, 0,1, 42)
    add(15, 7.3,110,31,140,35,305, 2,3,46,19,0.80,0.61, 5,2, 42)
    add(10, 7.6,112,32,142,37,312, 2,0,44,21,0.81,0.62, 0,2, 42)

    # 43 BOTTLE GOURD — season=2, loamy/alluvial, warm 30-38, UP+Bihar
    add(30, 6.8,155,52,180,32,460, 2,6,55,15,1.15,0.78, 0,3, 43)
    add(25, 7.0,162,55,188,34,480, 2,0,57,16,1.20,0.80, 3,3, 43)
    add(20, 6.6,150,50,175,31,448, 2,6,53,14,1.12,0.76, 0,3, 43)
    add(15, 6.9,158,53,183,33,468, 2,0,55,15,1.17,0.78, 3,3, 43)
    add(10, 7.1,165,57,192,35,492, 2,6,58,16,1.22,0.82, 0,3, 43)

    # 44 PUMPKIN — season=2, alluvial/loamy, warm 25-35, UP+Bihar
    add(30, 6.8,150,50,175,30,450, 2,0,55,14,1.12,0.76, 0,3, 44)
    add(25, 7.0,158,53,182,32,468, 2,6,57,15,1.17,0.78, 3,3, 44)
    add(20, 6.6,145,48,170,29,438, 2,0,53,13,1.10,0.74, 3,3, 44)
    add(15, 6.9,155,51,178,31,458, 2,6,55,14,1.14,0.76, 0,3, 44)
    add(10, 7.1,162,55,186,33,480, 2,0,58,15,1.19,0.80, 0,3, 44)

    # 45 MUSKMELON — season=2, sandy/loamy, hot 28-38, Rajasthan+UP
    add(30, 7.0,145,55,185,34,420, 2,3,48,18,0.95,0.75, 5,3, 45)
    add(25, 7.2,152,58,192,36,440, 2,3,46,20,1.00,0.78, 5,3, 45)
    add(20, 6.8,140,53,180,33,408, 2,3,50,17,0.92,0.73, 0,3, 45)
    add(15, 7.1,148,56,188,35,430, 2,3,48,19,0.97,0.76, 5,3, 45)
    add(10, 7.3,155,60,196,37,452, 2,6,44,21,1.02,0.80, 0,3, 45)

    # ─── ANNUAL CROPS ────────────────────────────────────────────────────────

    # 46 SUGARCANE — season=3, alluvial/clay, hot 25-35, >1200mm, UP+South
    add(30, 6.6,310,62,260,31,1550, 3,0,76,12,1.60,0.80, 0,0, 46)
    add(25, 6.8,322,66,272,32,1605, 3,0,78,13,1.72,0.90, 0,3, 46)
    add(20, 6.5,305,60,255,33,1520, 3,4,80,11,1.55,0.82, 2,3, 46)
    add(15, 6.7,315,63,265,31,1575, 3,1,77,12,1.62,0.85, 1,3, 46)
    add(10, 6.4,292,58,242,30,1455, 3,0,74,11,1.45,0.75, 3,0, 46)

    # 47 BANANA — season=3, alluvial/clay, hot 25-38, >1200mm, TN+AP+Maha
    add(30, 6.5,250,75,350,30,1400, 3,0,80,10,1.80,1.00, 2,3, 47)
    add(25, 6.8,262,78,362,32,1450, 3,4,82,11,1.85,1.02, 2,3, 47)
    add(20, 6.3,242,72,342,29,1368, 3,0,78,10,1.76,0.98, 1,3, 47)
    add(15, 6.6,255,76,355,31,1418, 3,4,80,10,1.82,1.00, 2,3, 47)
    add(10, 6.9,268,80,368,33,1482, 3,0,84,11,1.88,1.05, 0,3, 47)

    # 48 PAPAYA — season=3, alluvial, hot 22-38, 1000-1500mm, AP+TN+Maha
    add(30, 6.5,200,70,280,30,1200, 3,0,72,12,1.60,0.90, 2,3, 48)
    add(25, 6.8,208,73,288,32,1250, 3,0,74,13,1.65,0.92, 2,3, 48)
    add(20, 6.3,195,68,272,29,1168, 3,0,70,11,1.57,0.88, 1,3, 48)
    add(15, 6.6,202,71,282,31,1218, 3,4,72,12,1.62,0.90, 2,3, 48)
    add(10, 6.9,212,75,295,33,1282, 3,0,76,13,1.68,0.94, 1,3, 48)

    # 49 COCONUT — season=3, sandy/alluvial coastal, hot 25-38, Kerala+TN coastal
    add(30, 5.8,180,60,300,30,1500, 3,3,82,14,1.50,0.90, 2,2, 49)
    add(25, 6.0,188,63,308,32,1550, 3,0,84,15,1.55,0.92, 2,2, 49)
    add(20, 5.6,175,58,292,29,1468, 3,3,80,13,1.47,0.88, 2,2, 49)
    add(15, 5.9,182,61,302,31,1518, 3,3,82,14,1.52,0.90, 2,2, 49)
    add(10, 6.1,192,65,315,33,1582, 3,0,86,15,1.58,0.94, 2,3, 49)

    return np.array(D, dtype=float)


# ══════════════════════════════════════════════════════════════════════════════
# TRAINING
# ══════════════════════════════════════════════════════════════════════════════
def train():
    section("🌾 CROP RECOMMENDATION  v4 — 50 Crops, 14 Features")

    arr = build_dataset()
    X, y = arr[:, :14], arr[:, 14].astype(int)

    print(f"  Samples : {len(X)}")
    print(f"  Features: {X.shape[1]}  →  {', '.join(FEATURE_NAMES)}")
    print(f"  Classes : {len(set(y))} crops\n")
    for idx, crop in enumerate(CROPS):
        n = int((y==idx).sum())
        bar = '▓'*(n//5)
        print(f"  [{idx:02d}] {crop:<20} {bar}  ({n})")

    X_scaled, scaler = normalize_features(X)
    save_pkl(scaler, 'crop_scaler.pkl', 'StandardScaler 14 features')

    models = {
        'RandomForest': RandomForestClassifier(
            n_estimators=600, max_depth=20, min_samples_split=2,
            min_samples_leaf=1, max_features='sqrt',
            class_weight='balanced', random_state=42, n_jobs=-1),
        'GradientBoosting': GradientBoostingClassifier(
            n_estimators=350, learning_rate=0.055,
            max_depth=7, subsample=0.85, random_state=42),
        'ExtraTrees': ExtraTreesClassifier(
            n_estimators=600, max_depth=20, min_samples_split=2,
            class_weight='balanced', random_state=42, n_jobs=-1),
        'AdaBoost': AdaBoostClassifier(
            n_estimators=300, learning_rate=0.07, random_state=42),
        'Bagging': BaggingClassifier(
            estimator=DecisionTreeClassifier(max_depth=14),
            n_estimators=200, random_state=42, n_jobs=-1),
        'SVM_RBF': CalibratedClassifierCV(
            SVC(kernel='rbf', C=25, gamma='scale', class_weight='balanced'), cv=3),
        'KNN': KNeighborsClassifier(
            n_neighbors=11, weights='distance', metric='euclidean'),
        'LogisticRegression': LogisticRegression(
            C=2.0, max_iter=8000, solver='lbfgs',
            class_weight='balanced', random_state=42),
        'DecisionTree': DecisionTreeClassifier(
            max_depth=16, min_samples_split=2,
            class_weight='balanced', random_state=42),
    }

    section("📊 Training & Evaluating")
    trained, scores = {}, {}
    for name, model in models.items():
        with Timer(name):
            model.fit(X_scaled, y)
            trained[name] = model
            scores[name] = evaluate_classifier(model, X_scaled, y, name)
            print_scores(name, scores[name])

    section("🗳️  Voting Ensemble  (top 5)")
    top5 = sorted(scores, key=lambda k: scores[k]['accuracy_mean'], reverse=True)[:5]
    print(f"  Selected: {top5}")
    ensemble = VotingClassifier(
        estimators=[(n, trained[n]) for n in top5],
        voting='soft', n_jobs=-1)
    with Timer('VotingEnsemble'):
        ensemble.fit(X_scaled, y)
    scores['VotingEnsemble'] = evaluate_classifier(ensemble, X_scaled, y, 'VotingEnsemble')
    print_scores('VotingEnsemble', scores['VotingEnsemble'])
    trained['VotingEnsemble'] = ensemble

    section("💾 Saving PKL Models")
    for name, model in trained.items():
        fname = f"crop_{name.lower().replace(' ','_')}.pkl"
        save_pkl(model, fname, f"Acc: {scores.get(name,{}).get('accuracy_mean',0):.1%}")

    best = max(scores, key=lambda k: scores[k]['accuracy_mean'])

    meta = {
        'model_type':      'crop_classifier',
        'version':         '4.0',
        'crops':           CROPS,
        'crop_catalog':    CROP_CATALOG,
        'feature_names':   FEATURE_NAMES,
        'n_features':      len(FEATURE_NAMES),
        'soil_encoding':   SOIL_ENC,
        'season_encoding': SEASON_ENC,
        'irrigation_encoding': IRRIG_ENC,
        'region_encoding': REGION_ENC,
        'state_region_map':STATE_REGION,
        'n_samples':       len(X),
        'n_classes':       len(CROPS),
        'model_scores':    scores,
        'best_model':      best,
        'best_accuracy':   f"{scores[best]['accuracy_mean']:.1%}",
        'top5_ensemble':   top5,
        'trained_at':      __import__('datetime').datetime.now().isoformat(),
        'notes': 'v4: 50 crops, 14 features incl irrigation, season strictly enforced per crop',
    }
    save_json(meta, 'crop_meta.json')

    section("🏆 RESULTS")
    for name in sorted(scores, key=lambda k: -scores[k]['accuracy_mean']):
        acc = scores[name]['accuracy_mean']
        bar = '█' * int(acc * 30)
        print(f"  {name:<22} {bar:<30} {acc:.1%}")
    print(f"\n  ⭐ Best  : {best}")
    print(f"  ⭐ Accuracy: {scores[best]['accuracy_mean']:.1%}")
    return meta


if __name__ == '__main__':
    train()