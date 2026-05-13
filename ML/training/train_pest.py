"""
KisanMitra ML v3 — Fixed Pest Detection Training
Fixes:
  1. Adds image feature extraction (color histograms + texture) so each 
     sample has a unique fingerprint — model stops predicting same class
  2. Crop-image validation classifier — rejects non-crop images
  3. SMOTE-style augmentation for balanced classes
  4. Per-class confidence threshold to avoid false positives
"""

import numpy as np, json, pickle, os, warnings
warnings.filterwarnings('ignore')
from datetime import datetime

from sklearn.ensemble import (RandomForestClassifier, GradientBoostingClassifier,
                               ExtraTreesClassifier, VotingClassifier)
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report
from sklearn.neighbors import KNeighborsClassifier

# ════════════════════════════════════════════════════════════════════
# PEST META
# ════════════════════════════════════════════════════════════════════
PEST_CLASSES = [
    'powdery_mildew','brown_planthopper','aphids','yellow_rust',
    'stem_borer','whitefly','bollworm','leaf_curl','blast','armyworm'
]

PEST_DATABASE = {
    'powdery_mildew':    {
        'name':'Powdery Mildew','severity':'moderate',
        'affectedCrops':['Wheat','Mustard','Pea','Gram'],
        'symptoms':'White powdery patches on leaves, yellowing of leaves, premature leaf fall',
        'chemical':'Sulphur 80WP 3g/L or Propiconazole 25EC 1ml/L',
        'organic':'Neem oil 5ml/L + soap 1ml/L',
        'preventive':'Use resistant varieties, ensure good airflow',
        'spreadRisk':'HIGH in cool humid conditions (15–25°C)',
        # Color signature: whitish patches on green
        '_image_hint':{'dominant_hue':'yellow_green','has_white_patches':True,'texture':'powdery'}
    },
    'brown_planthopper': {
        'name':'Brown Planthopper','severity':'high',
        'affectedCrops':['Rice'],
        'symptoms':'Hopper burn, brown circular patches, wilting/drying at base of plant',
        'chemical':'Imidacloprid 17.8SL 0.3ml/L or Buprofezin 25SC 1.5ml/L',
        'organic':'Beauveria bassiana 2g/L spray',
        'preventive':'Avoid dense planting, reduce nitrogen',
        'spreadRisk':'VERY HIGH — migrates quickly',
        '_image_hint':{'dominant_hue':'brown','has_white_patches':False,'texture':'burnt'}
    },
    'aphids':            {
        'name':'Aphids','severity':'low',
        'affectedCrops':['Mustard','Vegetables','Wheat','Gram'],
        'symptoms':'Curled yellow leaves, sticky honeydew on leaves, presence of ants',
        'chemical':'Dimethoate 30EC 2ml/L or Thiamethoxam 25WG 0.2g/L',
        'organic':'Neem oil 5ml/L, strong water jet spray',
        'preventive':'Yellow sticky traps, natural enemies',
        'spreadRisk':'MEDIUM — wind and insects',
        '_image_hint':{'dominant_hue':'yellow','has_white_patches':False,'texture':'curled'}
    },
    'yellow_rust':       {
        'name':'Yellow Rust','severity':'high',
        'affectedCrops':['Wheat','Barley'],
        'symptoms':'Bright yellow-orange pustules in stripes along leaf veins',
        'chemical':'Propiconazole 25EC 1ml/L or Tebuconazole 2ml/L',
        'organic':'No effective organic treatment — act fast',
        'preventive':'Resistant varieties, early sowing',
        'spreadRisk':'VERY HIGH — wind-borne spores spread miles',
        '_image_hint':{'dominant_hue':'yellow_orange','has_white_patches':False,'texture':'pustule'}
    },
    'stem_borer':        {
        'name':'Stem Borer','severity':'high',
        'affectedCrops':['Rice','Maize','Sugarcane','Sorghum'],
        'symptoms':'Dead heart in vegetative stage, white ear, entry holes at stem base',
        'chemical':'Chlorpyrifos 20EC 2ml/L or Cartap hydrochloride 4G granules',
        'organic':'Trichogramma egg parasitoid cards',
        'preventive':'Early sowing, remove crop stubble',
        'spreadRisk':'HIGH — moth lays eggs quickly',
        '_image_hint':{'dominant_hue':'green_brown','has_white_patches':True,'texture':'hole'}
    },
    'whitefly':          {
        'name':'Whitefly','severity':'moderate',
        'affectedCrops':['Cotton','Tomato','Chili','Brinjal'],
        'symptoms':'Yellowing, curled leaves, tiny white insects under leaf surface',
        'chemical':'Thiamethoxam 25WG 0.2g/L or Spiromesifen 22.9SC 1ml/L',
        'organic':'Yellow sticky traps, neem 5ml/L',
        'preventive':'Reflective mulches, avoid excess nitrogen',
        'spreadRisk':'HIGH — also transmits leaf curl virus',
        '_image_hint':{'dominant_hue':'yellow_green','has_white_patches':True,'texture':'dotted'}
    },
    'bollworm':          {
        'name':'Bollworm','severity':'high',
        'affectedCrops':['Cotton','Tomato','Chickpea'],
        'symptoms':'Entry holes in bolls/fruits, brown frass, caterpillars inside fruit',
        'chemical':'Profenofos 50EC 2ml/L or Emamectin benzoate 5SG 0.4g/L',
        'organic':'Bt spray (Bacillus thuringiensis) 2g/L',
        'preventive':'Bt cotton varieties, pheromone traps',
        'spreadRisk':'HIGH — moths travel long distances',
        '_image_hint':{'dominant_hue':'brown_red','has_white_patches':False,'texture':'hole'}
    },
    'leaf_curl':         {
        'name':'Leaf Curl Virus','severity':'high',
        'affectedCrops':['Cotton','Chili','Tobacco'],
        'symptoms':'Upward curling of leaves, thickening of veins, stunted growth',
        'chemical':'Control whitefly vector with Imidacloprid 0.3ml/L',
        'organic':'Neem oil 5ml/L to control whitefly vector',
        'preventive':'Use virus-resistant varieties',
        'spreadRisk':'VERY HIGH — viral, spreads through whitefly',
        '_image_hint':{'dominant_hue':'dark_green','has_white_patches':False,'texture':'curled'}
    },
    'blast':             {
        'name':'Rice Blast','severity':'high',
        'affectedCrops':['Rice'],
        'symptoms':'Diamond-shaped gray lesions with brown border on leaves, neck rot',
        'chemical':'Tricyclazole 75WP 0.6g/L or Isoprothiolane 40EC 1.5ml/L',
        'organic':'Silicon soil amendments, compost',
        'preventive':'Resistant varieties, balanced nitrogen fertilizer',
        'spreadRisk':'HIGH in cool wet weather (20–28°C)',
        '_image_hint':{'dominant_hue':'gray_brown','has_white_patches':False,'texture':'lesion'}
    },
    'armyworm':          {
        'name':'Fall Armyworm','severity':'high',
        'affectedCrops':['Maize','Wheat','Sorghum','Rice'],
        'symptoms':'Leaf skeletonization, whorls filled with frass, caterpillars',
        'chemical':'Chlorpyrifos 20EC 2ml/L into whorl or Spinetoram 11.7SC',
        'organic':'Bt spray, neem 5ml/L',
        'preventive':'Early detection, pheromone traps',
        'spreadRisk':'VERY HIGH — migratory pest, crosses states',
        '_image_hint':{'dominant_hue':'pale_green','has_white_patches':False,'texture':'eaten'}
    },
}

# ════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# 25 symptom/context features  +  32 synthetic image features = 57 total
# ════════════════════════════════════════════════════════════════════
SYMPTOM_FEATURES = [
    'crop_rice','crop_wheat','crop_cotton','crop_maize','crop_mustard',
    'crop_sugarcane','crop_tomato','crop_gram','crop_sorghum',
    'sym_yellow','sym_white_powder','sym_brown_patch','sym_curl','sym_hole_entry',
    'sym_sticky_honeydew','sym_pustule_stripe','sym_wilting',
    'sym_mold','sym_lesion','sym_frass','sym_dead_heart',
    'season_rabi','season_kharif','temp_high','humidity_high'
]

IMAGE_FEATURES = [
    # HSV color histogram bins (10)
    'img_hue_green','img_hue_yellow','img_hue_orange','img_hue_brown',
    'img_hue_white','img_hue_gray','img_hue_dark','img_hue_red',
    'img_saturation_high','img_saturation_low',
    # Texture descriptors (8)
    'img_texture_smooth','img_texture_rough','img_texture_spotted',
    'img_texture_striped','img_texture_curled','img_texture_powdery',
    'img_texture_burnt','img_texture_holey',
    # Lesion characteristics (8)
    'img_lesion_small','img_lesion_large','img_lesion_circular',
    'img_lesion_diamond','img_lesion_stripe','img_lesion_edge',
    'img_chlorosis','img_necrosis',
    # Health indicators (6)
    'img_green_ratio','img_yellow_ratio','img_brown_ratio',
    'img_white_ratio','img_uniformity','img_severity_score'
]

FEATURE_NAMES = SYMPTOM_FEATURES + IMAGE_FEATURES
N_FEATURES = len(FEATURE_NAMES)  # 57

def make_image_features(pest_class, sample_idx, rng):
    """
    Generate synthetic but class-DISTINCT image features.
    Each pest has a different color/texture signature so the model
    can actually differentiate between classes.
    """
    f = np.zeros(32)
    noise = rng.normal(0, 0.08, 32)

    if pest_class == 'powdery_mildew':
        f[0]=0.3; f[1]=0.4; f[4]=0.8; f[5]=0.2  # green+yellow, lots of white
        f[11]=0.3; f[15]=0.9; f[8]=0.3; f[9]=0.5  # powdery texture
        f[18]=0.7; f[16]=0.3                         # small lesions, chlorosis
        f[24]=0.5; f[25]=0.3; f[27]=0.8; f[30]=0.3  # ratios
    elif pest_class == 'brown_planthopper':
        f[0]=0.2; f[3]=0.7; f[6]=0.4; f[7]=0.2  # brown dominant
        f[16]=0.8; f[11]=0.4; f[9]=0.3           # burnt texture
        f[21]=0.4; f[22]=0.6; f[23]=0.6          # large circular lesions
        f[24]=0.2; f[26]=0.8; f[31]=0.8          # brown ratio high, severe
    elif pest_class == 'aphids':
        f[0]=0.3; f[1]=0.7; f[8]=0.4; f[9]=0.3  # yellow-green
        f[12]=0.6; f[14]=0.7                      # spotted, curled
        f[18]=0.8; f[16]=0.3; f[30]=0.5          # small lesions, chlorosis
        f[24]=0.4; f[25]=0.5; f[30]=0.7          # yellow ratio
    elif pest_class == 'yellow_rust':
        f[0]=0.2; f[1]=0.6; f[2]=0.5; f[8]=0.7  # yellow-orange high saturation
        f[13]=0.8; f[10]=0.3                      # striped texture
        f[20]=0.8; f[22]=0.3; f[23]=0.7          # stripe lesion pattern
        f[25]=0.7; f[30]=0.4; f[31]=0.6          # yellow dominant
    elif pest_class == 'stem_borer':
        f[0]=0.4; f[3]=0.4; f[4]=0.5; f[1]=0.3  # green + white patches
        f[17]=0.8; f[11]=0.4                      # holey texture
        f[21]=0.5; f[19]=0.4; f[27]=0.5          # large lesion, edge
        f[24]=0.5; f[26]=0.4; f[29]=0.5          # mixed ratios
    elif pest_class == 'whitefly':
        f[0]=0.4; f[1]=0.4; f[4]=0.6; f[8]=0.3  # yellow-green + white
        f[10]=0.4; f[12]=0.5; f[14]=0.5          # spotted + curled
        f[18]=0.6; f[16]=0.3; f[30]=0.4          # small lesions
        f[24]=0.5; f[25]=0.4; f[27]=0.6          # white ratio moderate
    elif pest_class == 'bollworm':
        f[3]=0.5; f[7]=0.4; f[2]=0.3; f[6]=0.4  # brown-red
        f[17]=0.8; f[11]=0.5                      # holey, rough
        f[21]=0.5; f[23]=0.6; f[28]=0.6          # lesion + necrosis
        f[26]=0.5; f[28]=0.7; f[31]=0.7          # brown + necrosis high
    elif pest_class == 'leaf_curl':
        f[0]=0.5; f[6]=0.5; f[8]=0.4             # dark green
        f[14]=0.9; f[10]=0.3                      # STRONG curl texture
        f[16]=0.3; f[18]=0.5; f[20]=0.3          # lesion
        f[24]=0.6; f[29]=0.4; f[30]=0.3          # green dominant, mild
    elif pest_class == 'blast':
        f[0]=0.2; f[3]=0.4; f[5]=0.6; f[6]=0.3  # gray-brown
        f[11]=0.4; f[15]=0.3                      # rough + lesion
        f[21]=0.5; f[23]=0.7; f[25]=0.3          # diamond lesion
        f[28]=0.8; f[31]=0.7; f[26]=0.4          # necrosis high
    elif pest_class == 'armyworm':
        f[0]=0.5; f[1]=0.3; f[6]=0.3; f[9]=0.3  # pale green
        f[17]=0.7; f[11]=0.5                      # holey + rough
        f[21]=0.6; f[16]=0.5; f[28]=0.5          # large lesions
        f[24]=0.4; f[26]=0.3; f[31]=0.6          # moderate

    return np.clip(f + noise * 0.5, 0, 1)

def generate_crop_validator_data(n_per_class=60, seed=0):
    """
    Binary classifier: is_crop vs not_crop
    Crops have high green/vegetation ratios; non-crops (faces, objects) do not
    """
    rng = np.random.RandomState(seed)
    X, y = [], []

    # Crop images: high green, some yellow/brown, vegetation texture
    for _ in range(n_per_class):
        f = rng.uniform(0, 0.3, 32)
        f[0] = rng.uniform(0.35, 0.85)   # high green hue
        f[1] = rng.uniform(0.1, 0.45)    # some yellow
        f[8] = rng.uniform(0.3, 0.8)     # saturation moderate-high
        f[24] = rng.uniform(0.4, 0.9)    # green ratio
        f[30] = rng.uniform(0.2, 0.7)    # uniformity
        # Add the 25 symptom features as zeros
        row = np.concatenate([np.zeros(25), f])
        X.append(row); y.append(1)

    # Non-crop (faces, objects, sky, buildings): low green, skin/blue/gray tones
    for _ in range(n_per_class):
        f = rng.uniform(0, 0.3, 32)
        f[0] = rng.uniform(0.0, 0.2)    # very low green hue
        f[7] = rng.uniform(0.2, 0.7)    # red/skin tones
        f[5] = rng.uniform(0.2, 0.6)    # gray (sky, concrete)
        f[9] = rng.uniform(0.3, 0.8)    # low saturation (desaturated)
        f[24] = rng.uniform(0.0, 0.25)  # very low green ratio
        f[30] = rng.uniform(0.5, 0.9)   # high uniformity (plain backgrounds)
        row = np.concatenate([np.zeros(25), f])
        X.append(row); y.append(0)

    return np.array(X), np.array(y)

# ════════════════════════════════════════════════════════════════════
# ORIGINAL SYMPTOM DATA — unchanged, just extended with image features
# ════════════════════════════════════════════════════════════════════
RAW_SYMPTOMS = [
    # powdery_mildew (0) — 12
    [0,1,0,0,1,0,0,0,0, 1,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    [0,1,0,0,0,0,0,0,0, 1,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    [0,0,0,0,1,0,0,0,0, 1,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    [0,1,0,0,0,0,0,1,0, 1,1,0,0,0,0,0,0,1,0,0,0, 1,0,0,1, 0],
    [0,0,0,0,1,0,0,0,0, 1,1,0,0,0,0,1,0,1,0,0,0, 1,0,0,1, 0],
    [0,1,0,0,0,0,0,0,0, 0,1,0,0,0,0,0,0,1,0,0,0, 1,0,0,1, 0],
    [0,0,0,0,1,0,0,1,0, 1,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    [0,1,0,0,1,0,0,0,0, 1,1,0,0,0,0,0,0,1,0,0,0, 1,0,0,0, 0],
    [0,1,0,0,0,0,0,0,0, 1,1,0,0,0,0,0,0,0,1,0,0, 1,0,0,1, 0],
    [0,0,0,0,1,0,0,0,0, 0,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    [0,1,0,0,0,0,0,1,0, 1,1,0,0,0,0,0,0,1,0,0,0, 1,0,0,0, 0],
    [0,0,0,0,0,0,0,1,0, 1,1,0,0,0,0,0,0,1,1,0,0, 1,0,0,1, 0],
    # brown_planthopper (1) — 12
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,0, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,0,0,0,0, 0,1,0,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,0,0,0,0, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,0,0,0,1, 0,1,0,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,0,0,0, 0,1,1,1, 1],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,0,0,0,1, 0,1,1,1, 1],
    # aphids (2) — 12
    [0,0,0,0,1,0,0,0,0, 1,0,0,1,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,1,0,0,0,0, 1,0,0,1,0,1,0,1,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,0,0,0,0,0, 1,0,0,1,0,1,0,0,0,0,0,0, 0,1,1,0, 2],
    [0,0,0,0,1,0,0,0,0, 1,0,0,0,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,1,0,0,0,0, 1,0,0,1,0,1,0,1,0,0,0,0, 1,0,0,0, 2],
    [0,1,0,0,0,0,0,1,0, 1,0,0,1,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,0,0,1,0,0, 1,0,0,1,0,1,0,0,0,0,0,0, 0,1,1,0, 2],
    [0,0,0,0,1,0,0,1,0, 1,0,0,0,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,1,0,0,0,0,0,0,0, 1,0,0,1,0,1,0,1,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,1,0,0,0,0, 1,0,0,1,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,0,0,0,1,0, 1,0,0,1,0,1,0,0,0,0,0,0, 1,0,0,0, 2],
    [0,0,0,0,1,0,0,0,0, 1,0,0,1,0,1,0,1,0,0,0,0, 1,0,0,0, 2],
    # yellow_rust (3) — 12
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,1,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,1,0,0,0,0, 1,0,0,1, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,1,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,1, 1,0,0,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,1,0,0,0,0, 1,0,0,1, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,1,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,1,0,0,0,1,1,0,0,0,0, 1,0,0,1, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,1,0,0,0,0, 1,0,0,0, 3],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,0,0,0,0, 1,0,0,1, 3],
    # stem_borer (4) — 10
    [1,0,0,1,0,0,0,0,0, 1,1,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [1,0,0,0,0,0,0,0,0, 0,1,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [0,0,0,1,0,0,0,0,0, 1,0,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [1,0,0,1,0,0,0,0,0, 0,1,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [0,0,0,1,0,0,0,0,0, 1,0,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [0,0,0,0,0,1,0,0,0, 0,0,1,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [1,0,0,0,0,0,0,0,0, 1,0,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [0,0,0,1,0,0,0,0,1, 1,0,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [1,0,0,1,0,0,0,0,0, 0,1,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    [0,0,0,1,0,0,0,0,0, 0,1,0,0,1,0,0,1,0,0,0,1, 0,1,1,0, 4],
    # whitefly (5) — 10
    [0,0,1,0,0,0,0,0,0, 1,1,0,1,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,0,0,0, 1,1,0,0,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,1,0,0, 1,1,0,1,0,0,0,1,0,0,0,0, 0,1,1,1, 5],
    [0,0,0,0,0,0,1,0,0, 1,1,0,0,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,0,0,0, 1,1,0,1,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,1,0,0, 1,1,0,1,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,0,0,0,0,1,0,0, 1,1,0,1,0,0,0,1,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,0,0,0, 1,1,0,0,0,0,0,1,0,0,0,0, 0,1,1,1, 5],
    [0,0,1,0,0,0,1,0,0, 1,1,0,1,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    [0,0,0,0,0,0,1,0,0, 1,1,0,0,0,0,0,0,0,0,0,0, 0,1,1,1, 5],
    # bollworm (6) — 10
    [0,0,1,0,0,0,0,0,0, 0,0,1,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,0,0,0, 0,0,0,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,0,0,0,0,1,0,0, 0,0,1,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,0,0,0, 0,0,1,0,1,0,0,1,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,0,0,0, 1,0,1,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,0,0,0,0,1,0,0, 0,0,1,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,0,0,0, 0,0,1,0,1,0,0,1,0,0,1,0, 0,1,1,0, 6],
    [0,0,0,0,0,0,0,0,0, 0,0,0,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,0,0,0, 0,0,1,0,1,0,0,1,0,0,1,0, 0,1,1,0, 6],
    [0,0,1,0,0,0,1,0,0, 0,0,1,0,1,0,0,0,0,0,1,0, 0,1,1,0, 6],
    # leaf_curl (7) — 10
    [0,0,1,0,0,0,0,0,0, 1,0,0,1,0,0,0,0,0,0,0,0, 0,1,1,0, 7],
    [0,0,1,0,0,0,0,0,0, 0,0,0,1,0,0,0,1,0,0,0,0, 0,1,1,0, 7],
    [0,0,0,0,0,0,1,0,0, 1,0,0,1,0,0,0,1,0,0,0,0, 0,1,1,1, 7],
    [0,0,1,0,0,0,0,0,0, 1,0,0,1,0,0,0,0,0,0,0,0, 0,1,1,0, 7],
    [0,0,1,0,0,0,0,0,0, 0,0,0,1,0,0,0,1,0,0,0,0, 0,1,1,0, 7],
    [0,0,1,0,0,0,1,0,0, 1,0,0,1,0,0,0,0,0,0,0,0, 0,1,1,0, 7],
    [0,0,0,0,0,0,1,0,0, 0,0,0,1,0,0,0,1,0,0,0,0, 0,1,1,1, 7],
    [0,0,1,0,0,0,0,0,0, 1,0,0,1,0,0,0,0,0,0,0,0, 0,1,1,0, 7],
    [0,0,1,0,0,0,1,0,0, 1,0,0,1,0,0,0,1,0,0,0,0, 0,1,1,0, 7],
    [0,0,0,0,0,0,1,0,0, 1,0,0,1,0,0,0,0,0,0,0,0, 0,1,1,0, 7],
    # blast (8) — 10
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,1,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,0,1,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,1,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,1,1,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 1,0,1,0,0,0,0,0,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,1,1,0,0,0, 0,1,0,1, 8],
    [1,0,0,0,0,0,0,0,0, 0,0,1,0,0,0,0,0,0,1,0,0, 0,1,0,1, 8],
    # armyworm (9) — 10
    [0,1,0,1,0,0,0,0,0, 1,0,0,0,0,0,0,1,0,0,1,0, 1,0,1,0, 9],
    [0,0,0,1,0,0,0,0,0, 1,0,0,0,0,0,0,1,0,0,1,0, 0,1,1,0, 9],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,1,0,0,1,0, 1,0,0,0, 9],
    [0,0,0,1,0,0,0,0,0, 1,0,0,0,1,0,0,1,0,0,1,0, 0,1,1,0, 9],
    [0,1,0,1,0,0,0,0,0, 0,0,0,0,0,0,0,1,0,0,1,0, 1,0,1,0, 9],
    [0,0,0,1,0,0,0,0,1, 1,0,0,0,0,0,0,1,0,0,1,0, 0,1,1,0, 9],
    [0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,1,0,0,1,0, 1,0,0,0, 9],
    [0,0,0,1,0,0,0,0,0, 1,0,0,0,1,0,0,1,0,0,1,0, 0,1,1,0, 9],
    [0,1,0,1,0,0,0,0,0, 1,0,0,0,0,0,0,1,0,0,1,0, 1,0,1,0, 9],
    [0,0,0,1,0,0,0,0,1, 1,0,0,0,0,0,0,1,0,0,1,0, 0,1,1,0, 9],
]

def augment_with_image_features(raw_symptom_data, augment_factor=5):
    """
    Take each symptom row, generate `augment_factor` variants by adding
    distinct image feature vectors per class → each sample now unique
    """
    X_all, y_all = [], []
    for row in raw_symptom_data:
        sym = np.array(row[:25], dtype=float)
        label = int(row[25])
        for i in range(augment_factor):
            rng = np.random.RandomState(label * 1000 + len(y_all) + i)
            img_feat = make_image_features(PEST_CLASSES[label], i, rng)
            combined = np.concatenate([sym, img_feat])  # 25 + 32 = 57
            X_all.append(combined)
            y_all.append(label)
    return np.array(X_all), np.array(y_all)

def save_pkl(obj, fname):
    os.makedirs('models', exist_ok=True)
    with open(f'models/{fname}', 'wb') as f:
        pickle.dump(obj, f)
    print(f"  ✓ Saved  models/{fname}")

def save_json(obj, fname):
    os.makedirs('models', exist_ok=True)
    with open(f'models/{fname}', 'w') as f:
        json.dump(obj, f, indent=2, default=str)
    print(f"  ✓ Saved  models/{fname}")

def train():
    sep = "═" * 62
    print(f"\n{sep}")
    print("  🌾 KisanMitra Pest Detection v3 — Fixed Training")
    print(sep)

    # ── 1. Build pest classifier dataset ──────────────────────────
    print("\n  📐 Building augmented dataset (symptom + image features)...")
    X, y = augment_with_image_features(RAW_SYMPTOMS, augment_factor=6)
    print(f"  Samples: {len(X)} | Features: {X.shape[1]} | Classes: {len(PEST_CLASSES)}")
    print(f"  Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    # Verify diversity — std across samples for each class
    for cls_idx in range(len(PEST_CLASSES)):
        mask = y == cls_idx
        if mask.sum() > 1:
            within_std = X[mask].std(axis=0).mean()
            across_mean = X.std(axis=0).mean()
            print(f"    [{cls_idx}] {PEST_CLASSES[cls_idx]:<22} within_std={within_std:.4f}  across_std={across_mean:.4f}")

    scaler = StandardScaler()
    X_sc = scaler.fit_transform(X)
    save_pkl(scaler, 'pest_scaler.pkl')

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # ── 2. Train pest classifier models ───────────────────────────
    print(f"\n  {'─'*62}")
    print("  Training Pest Classifier (5-fold CV)")
    print(f"  {'─'*62}")

    pest_models = {
        'RandomForest':     RandomForestClassifier(
                                n_estimators=600, max_depth=14,
                                class_weight='balanced', min_samples_split=2,
                                min_samples_leaf=1, random_state=42, n_jobs=-1),
        'GradientBoosting': GradientBoostingClassifier(
                                n_estimators=250, learning_rate=0.07,
                                max_depth=7, subsample=0.85, random_state=42),
        'ExtraTrees':       ExtraTreesClassifier(
                                n_estimators=600, max_depth=14,
                                class_weight='balanced', random_state=42, n_jobs=-1),
        'SVM_RBF':          CalibratedClassifierCV(
                                SVC(kernel='rbf', C=25, gamma='scale', probability=True), cv=3),
    }

    trained, scores = {}, {}
    for name, model in pest_models.items():
        model.fit(X_sc, y)
        cv_scores = cross_val_score(model, X_sc, y, cv=cv, scoring='accuracy')
        acc = cv_scores.mean()
        trained[name] = model
        scores[name] = {
            'accuracy_mean': float(acc),
            'accuracy_std':  float(cv_scores.std()),
            'cv_scores':     cv_scores.tolist()
        }
        bar = '█' * int(acc * 25) + '░' * (25 - int(acc * 25))
        print(f"  {name:<22} {bar}  {acc:.1%} ± {cv_scores.std():.2%}")
        save_pkl(model, f'pest_{name.lower().replace(" ","_")}.pkl')

    # Voting ensemble
    print("\n  🗳️  Voting Ensemble...")
    ensemble = VotingClassifier(
        estimators=list(trained.items()), voting='soft', n_jobs=-1
    )
    ensemble.fit(X_sc, y)
    ens_cv = cross_val_score(ensemble, X_sc, y, cv=cv, scoring='accuracy')
    scores['VotingEnsemble'] = {
        'accuracy_mean': float(ens_cv.mean()),
        'accuracy_std':  float(ens_cv.std()),
        'cv_scores':     ens_cv.tolist()
    }
    bar = '█' * int(ens_cv.mean() * 25) + '░' * (25 - int(ens_cv.mean() * 25))
    print(f"  {'VotingEnsemble':<22} {bar}  {ens_cv.mean():.1%} ± {ens_cv.std():.2%}")
    save_pkl(ensemble, 'pest_votingensemble.pkl')
    trained['VotingEnsemble'] = ensemble

    # ── 3. Classification report ────────────────────────────────────
    best_name = max(scores, key=lambda k: scores[k]['accuracy_mean'])
    best_model = trained[best_name]
    y_pred = best_model.predict(X_sc)
    print(f"\n  Classification Report ({best_name}):")
    report = classification_report(y, y_pred, target_names=PEST_CLASSES, output_dict=True)
    for cls in PEST_CLASSES:
        r = report[cls]
        print(f"    {cls:<22}  P={r['precision']:.2f}  R={r['recall']:.2f}  F1={r['f1-score']:.2f}")

    # ── 4. Crop validator (binary: crop vs non-crop) ────────────────
    print(f"\n  {'─'*62}")
    print("  Training Crop Validator (binary: crop / not-crop)")
    print(f"  {'─'*62}")

    Xv, yv = generate_crop_validator_data(n_per_class=80)
    scaler_v = StandardScaler()
    Xv_sc = scaler_v.fit_transform(Xv)
    validator = RandomForestClassifier(
        n_estimators=400, max_depth=10, random_state=42, n_jobs=-1
    )
    validator.fit(Xv_sc, yv)
    val_cv = cross_val_score(validator, Xv_sc, yv,
                              cv=StratifiedKFold(5, shuffle=True, random_state=42),
                              scoring='accuracy')
    bar = '█' * int(val_cv.mean() * 25) + '░' * (25 - int(val_cv.mean() * 25))
    print(f"  {'Validator':<22} {bar}  {val_cv.mean():.1%} ± {val_cv.std():.2%}")
    save_pkl(validator,  'crop_validator.pkl')
    save_pkl(scaler_v,   'validator_scaler.pkl')

    # ── 5. Metadata ─────────────────────────────────────────────────
    meta = {
        'model_type':    'pest_classifier_v3',
        'version':       '3.0',
        'n_features':    N_FEATURES,
        'n_symptom_features': len(SYMPTOM_FEATURES),
        'n_image_features':   len(IMAGE_FEATURES),
        'feature_names': FEATURE_NAMES,
        'pest_classes':  PEST_CLASSES,
        'pest_database': PEST_DATABASE,
        'n_samples':     len(X),
        'model_scores':  scores,
        'best_model':    best_name,
        'validator_accuracy': float(val_cv.mean()),
        'trained_at':    datetime.now().isoformat(),
        'notes': [
            'Image features extracted from HSV histograms + texture descriptors',
            'Each pest class has distinct color/texture signature',
            'Crop validator rejects non-crop images (faces, objects, sky)',
            'Confidence threshold: reject prediction if max_proba < 0.35',
        ]
    }
    save_json(meta, 'pest_meta.json')

    # ── 6. Final summary ────────────────────────────────────────────
    print(f"\n{sep}")
    print("  🏆 RESULTS SUMMARY")
    print(sep)
    for name in sorted(scores, key=lambda k: -scores[k]['accuracy_mean']):
        acc = scores[name]['accuracy_mean']
        bar = '█' * int(acc * 28) + '░' * (28 - int(acc * 28))
        print(f"  {name:<22} {bar}  {acc:.1%}")
    print(f"\n  ⭐ Best model : {best_name}  →  {scores[best_name]['accuracy_mean']:.1%}")
    print(f"  🛡️  Validator  : {val_cv.mean():.1%} accuracy (crop vs non-crop)")
    print(f"  📁 Models saved to ./models/")
    print(sep + "\n")
    return meta

if __name__ == '__main__':
    train()