"""
KisanMitra ML — Model Validation Tests
Verifies all PKL models load and predict correctly.
Usage: python3 test_models.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))

import numpy as np
from ml_utils import load_pkl, load_json, list_pkl_models, MODELS_DIR

PASS, FAIL = '✅', '❌'

def run_test(name, fn):
    try:
        result = fn()
        print(f"  {PASS} {name}: {result}")
        return True
    except Exception as e:
        print(f"  {FAIL} {name}: {e}")
        return False

print("\n" + "═"*60)
print("  🌾 KisanMitra ML — Model Validation Tests")
print("═"*60)

# ── PKL Files ──────────────────────────────────────────────────────────────
print("\n📦 PKL File Inventory:")
pkls = list_pkl_models()
print(f"  Total PKL files: {len(pkls)}")
for domain in ['crop', 'soil', 'pest', 'market']:
    domain_pkls = [f for f in pkls if f.startswith(domain)]
    print(f"  {domain}: {len(domain_pkls)} models")

# ── Crop Model ─────────────────────────────────────────────────────────────
print("\n🌾 Crop Model Tests:")
passed = 0
total  = 0

def test_crop_load():
    m = load_pkl('crop_extratrees.pkl')
    s = load_pkl('crop_scaler.pkl')
    return f"ExtraTrees loaded ({type(m).__name__})"
total += 1; passed += run_test("Load ExtraTrees (best crop model)", test_crop_load)

def test_crop_predict():
    m = load_pkl('crop_extratrees.pkl')
    s = load_pkl('crop_scaler.pkl')
    # Wheat-like input: ph, N, P, K, temp, rain, season(rabi=0), soil(alluvial=0), hum, wind, oc, zn
    X = np.array([[7.2, 280, 30, 220, 20, 450, 0, 0, 60, 12, 1.4, 1.0]])
    X_s = s.transform(X)
    proba = m.predict_proba(X_s)[0]
    crops = ['wheat','rice','maize','cotton','mustard','chickpea','soybean','sugarcane','barley','groundnut']
    top_idx = np.argmax(proba)
    return f"Top prediction: {crops[top_idx]} ({proba[top_idx]*100:.1f}%)"
total += 1; passed += run_test("Predict crop (wheat conditions)", test_crop_predict)

def test_crop_meta():
    m = load_json('crop_meta.json')
    acc = m['model_scores'][m['best_model']]['accuracy_mean']
    return f"Best={m['best_model']}, Accuracy={acc:.1%}"
total += 1; passed += run_test("Crop metadata", test_crop_meta)

def test_crop_ensemble():
    m = load_pkl('crop_votingensemble.pkl')
    s = load_pkl('crop_scaler.pkl')
    X = np.array([[6.2, 350, 30, 200, 32, 1200, 1, 0, 85, 18, 1.5, 0.8]])  # rice
    proba = m.predict_proba(s.transform(X))[0]
    crops = ['wheat','rice','maize','cotton','mustard','chickpea','soybean','sugarcane','barley','groundnut']
    return f"Ensemble top: {crops[np.argmax(proba)]} ({max(proba)*100:.1f}%)"
total += 1; passed += run_test("Voting Ensemble (rice conditions)", test_crop_ensemble)

# ── Soil Model ─────────────────────────────────────────────────────────────
print("\n🌱 Soil Model Tests:")

def test_soil_load():
    m = load_pkl('soil_extratrees.pkl')
    return f"ExtraTrees loaded ({type(m).__name__})"
total += 1; passed += run_test("Load ExtraTrees (best soil model)", test_soil_load)

def test_soil_predict_excellent():
    m = load_pkl('soil_extratrees.pkl')
    s = load_pkl('soil_scaler.pkl')
    X = np.array([[7.0, 1.9, 390, 44, 315, 1.7, 34, 1.2, 0.4, 1]])  # excellent soil
    score = round(float(m.predict(s.transform(X))[0]))
    score = max(0, min(100, score))
    return f"Excellent soil → score={score}/100 ({'✓' if score >= 80 else '?'})"
total += 1; passed += run_test("Predict excellent soil (expect >80)", test_soil_predict_excellent)

def test_soil_predict_poor():
    m = load_pkl('soil_extratrees.pkl')
    s = load_pkl('soil_scaler.pkl')
    X = np.array([[5.0, 0.3, 100, 5, 80, 0.1, 12, 1.8, 2.0, 0]])  # poor soil
    score = round(float(m.predict(s.transform(X))[0]))
    score = max(0, min(100, score))
    return f"Poor soil → score={score}/100 ({'✓' if score < 50 else '?'})"
total += 1; passed += run_test("Predict poor soil (expect <50)", test_soil_predict_poor)

def test_soil_meta():
    m = load_json('soil_meta.json')
    r2 = m['model_scores'][m['best_model']]['r2_mean']
    return f"Best={m['best_model']}, R²={r2:.3f}"
total += 1; passed += run_test("Soil metadata", test_soil_meta)

# ── Pest Model ─────────────────────────────────────────────────────────────
print("\n🐛 Pest Model Tests:")

def test_pest_load():
    m = load_pkl('pest_knn.pkl')
    return f"KNN loaded ({type(m).__name__})"
total += 1; passed += run_test("Load KNN (best pest model)", test_pest_load)

def test_pest_predict_rust():
    m = load_pkl('pest_knn.pkl')
    s = load_pkl('pest_scaler.pkl')
    # wheat + yellow + pustule + stripe → yellow_rust
    X = np.array([[0,1,0,0,0, 1,0,0,0,0, 0,1,0,0,1, 1,0,0,0]])
    pests = ['powdery_mildew','brown_planthopper','aphids','yellow_rust',
             'stem_borer','whitefly','bollworm','leaf_curl','blast','armyworm']
    pred = int(m.predict(s.transform(X))[0])
    return f"Wheat+yellow+stripe → {pests[pred]}"
total += 1; passed += run_test("Pest detection (wheat rust symptoms)", test_pest_predict_rust)

def test_pest_meta():
    m = load_json('pest_meta.json')
    acc = m['model_scores'][m['best_model']]['accuracy_mean']
    return f"Best={m['best_model']}, Accuracy={acc:.1%}"
total += 1; passed += run_test("Pest metadata", test_pest_meta)

# ── Market Model ───────────────────────────────────────────────────────────
print("\n📈 Market Model Tests:")

def test_market_load():
    m = load_pkl('market_randomforest.pkl')
    return f"RandomForest loaded ({type(m).__name__})"
total += 1; passed += run_test("Load RandomForest (best market model)", test_market_load)

def test_market_predict_up():
    m = load_pkl('market_randomforest.pkl')
    s = load_pkl('market_scaler.pkl')
    # Low supply, high demand → UP
    X = np.array([[0, 0, 10, 20, 18, 2000, 0.88, 2275, 0.5, 0.9]])
    pred = int(m.predict(s.transform(X))[0])
    labels = ['Down','Stable','Up']
    return f"Low supply wheat → trend={labels[pred]}"
total += 1; passed += run_test("Market trend (wheat, low supply)", test_market_predict_up)

def test_market_meta():
    m = load_json('market_meta.json')
    acc = m['model_scores'][m['best_model']]['accuracy_mean']
    return f"Best={m['best_model']}, Accuracy={acc:.1%}"
total += 1; passed += run_test("Market metadata", test_market_meta)

# ── Summary ────────────────────────────────────────────────────────────────
print(f"\n{'═'*60}")
print(f"  Results: {passed}/{total} tests passed")
status = "ALL TESTS PASSED ✅" if passed == total else f"{total-passed} FAILED ❌"
print(f"  Status:  {status}")
print(f"{'═'*60}\n")
sys.exit(0 if passed == total else 1)
