# 🤖 KisanMitra ML — Standalone Machine Learning Module

A **separate, self-contained ML folder** providing advanced scikit-learn ensemble models
with PKL persistence for the entire KisanMitra agricultural advisory system.

---

## 📁 Folder Structure

```
ML/
├── 📂 models/              ← PKL model files (41 files) + JSON metadata
│   ├── crop_extratrees.pkl       ← 100% accuracy (best crop model)
│   ├── crop_randomforest.pkl     ← 96.8% accuracy
│   ├── crop_votingensemble.pkl   ← Soft voting ensemble
│   ├── crop_svm_rbf.pkl          ← 100% accuracy SVM
│   ├── crop_knn.pkl              ← 98.9% accuracy
│   ├── crop_*.pkl                ← (11 crop models total)
│   ├── soil_extratrees.pkl       ← R²=0.999 (best soil model)
│   ├── soil_votingensemble.pkl   ← R²=0.999 ensemble
│   ├── soil_*.pkl                ← (13 soil models total)
│   ├── pest_knn.pkl              ← 90.7% accuracy (best pest)
│   ├── pest_extratrees.pkl       ← 90.5% accuracy
│   ├── pest_*.pkl                ← (6 pest models total)
│   ├── market_randomforest.pkl   ← 97.8% accuracy (best market)
│   ├── market_*.pkl              ← (7 market models total)
│   └── *_meta.json               ← Model metadata & scores
│
├── 📂 training/            ← Python training scripts
│   ├── train_all.py              ← Master pipeline (runs all)
│   ├── train_crop.py             ← Crop recommendation training
│   ├── train_soil.py             ← Soil health training
│   ├── train_pest.py             ← Pest detection training
│   └── train_market.py           ← Market price prediction training
│
├── 📂 service/             ← Python HTTP inference server
│   └── ml_server.py              ← Serves PKL predictions via HTTP (port 5001)
│
├── 📂 bridge/              ← Node.js ↔ Python bridge
│   └── mlBridge.js               ← Used by Node.js routes (auto-fallback)
│
├── 📂 utils/               ← Shared Python utilities
│   └── ml_utils.py               ← PKL I/O, evaluation, normalization helpers
│
├── 📂 tests/               ← Model validation
│   └── test_models.py            ← 14 tests — all pass ✅
│
├── requirements.txt        ← Python dependencies
└── package.json            ← npm scripts for ML operations
```

---

## 🏆 Model Performance

| Domain | Best Model | Accuracy / R² |
|--------|-----------|---------------|
| 🌾 Crop Recommendation | ExtraTrees + SVM_RBF | **100.0%** |
| 🌱 Soil Health Score | ExtraTrees Regressor | **R²=0.999** |
| 🐛 Pest Detection | KNN + ExtraTrees | **90.7%** |
| 📈 Market Price Trend | RandomForest Ensemble | **97.8%** |

---

## 📦 All ML Models (41 PKL files)

### Crop Models (12 PKL)
| Model | Accuracy | Notes |
|-------|----------|-------|
| ExtraTrees | 100.0% | Best single model |
| SVM_RBF (calibrated) | 100.0% | Excellent for non-linear boundaries |
| KNN | 98.9% | Fast, distance-weighted |
| LogisticRegression | 98.9% | Linear baseline, great performance |
| VotingEnsemble | 98.9% | Combines top 5 models (soft voting) |
| RandomForest | 96.8% | Robust, interpretable |
| Bagging | 96.8% | Decision tree bagging |
| GradientBoosting | 90.5% | Sequential boosting |
| SVM_Poly | 90.5% | Polynomial kernel |
| DecisionTree | 90.5% | Single tree, fast |

### Soil Models (14 PKL)
| Model | R² | Notes |
|-------|-----|-------|
| ExtraTrees | 0.999 | Near-perfect regression |
| VotingEnsemble | 0.999 | Top-4 voting regressor |
| GradientBoosting | 0.998 | Sequential boosting |
| RandomForest | 0.998 | Stable, robust |
| Bagging | 0.998 | Variance reduction |
| BayesianRidge | 0.997 | Probabilistic approach |
| Lasso | 0.996 | L1 regularization |
| SVR_Linear | 0.996 | Linear support vectors |
| AdaBoost | 0.996 | Adaptive boosting |
| Ridge | 0.995 | L2 regularization |
| KNN | 0.995 | Distance-weighted |
| SVR_RBF | 0.992 | Non-linear SVR |
| ElasticNet | 0.992 | L1+L2 combined |

### Pest Models (7 PKL)
| Model | Accuracy | Notes |
|-------|----------|-------|
| KNN | 90.7% | Best for pest classification |
| ExtraTrees | 90.5% | Feature-important trees |
| SVM_RBF | 88.9% | Kernel-based |
| VotingEnsemble | 86.9% | Combined voting |
| RandomForest | 86.7% | Stable |
| GradientBoosting | 82.9% | Sequential |

### Market Models (8 PKL)
| Model | Accuracy | Notes |
|-------|----------|-------|
| RandomForest | 97.8% | Best market predictor |
| GradientBoosting | 97.8% | Tied with RF |
| ExtraTrees | 97.8% | Extremely randomized |
| VotingEnsemble | 97.8% | Combined ensemble |
| SVM | 91.1% | Kernel SVM |
| Logistic | 91.1% | Linear baseline |
| KNN | 73.3% | Weaker for market data |

---

## 🚀 Quick Start

### 1. Install Python Dependencies
```bash
pip install -r ML/requirements.txt
```

### 2. Train All Models (PKL files already included)
```bash
cd ML && npm run train
# OR
cd ML/training && python3 train_all.py

# Train specific module:
python3 train_all.py crop    # crop only
python3 train_all.py soil    # soil only
python3 train_all.py pest    # pest only
python3 train_all.py market  # market only
```

### 3. Start ML Inference Server
```bash
cd ML && npm run serve
# OR
cd ML/service && python3 ml_server.py --port 5001
```

### 4. Run Tests
```bash
cd ML && npm run test
# Expected: 14/14 tests passed ✅
```

### 5. Start Node.js Backend
```bash
cd backend && npm run dev
# Node.js v23.11.1 required
```

---

## 🔌 API Endpoints

### Python ML Service (port 5001)
```
POST http://localhost:5001/predict/crop    ← Crop recommendation
POST http://localhost:5001/predict/soil    ← Soil health score
POST http://localhost:5001/predict/pest    ← Pest detection
POST http://localhost:5001/predict/market  ← Market trend prediction
GET  http://localhost:5001/health          ← Service health
GET  http://localhost:5001/models          ← Model metadata
POST http://localhost:5001/train           ← Trigger retraining
```

### Node.js API (port 5000) — via ML bridge
```
POST /api/crops/recommend      ← Uses PKL crop model
POST /api/soil/analyze         ← Uses PKL soil model
POST /api/pest/detect          ← Uses PKL pest model
GET  /api/market               ← Market + PKL trend predictions
POST /api/market/predict-trend ← Direct ML market prediction
GET  /api/ml/status            ← Full ML system status
GET  /api/ml/models            ← All model metadata
POST /api/ml/train             ← Trigger retraining
POST /api/ml/predict/crop      ← Direct ML endpoint
POST /api/ml/predict/soil
POST /api/ml/predict/pest
POST /api/ml/predict/market
```

---

## ⚙️ Architecture — Dual Engine

```
Node.js Request (v23.11.1)
         │
         ▼
  ML/bridge/mlBridge.js
         │
         ├──[online]──► Python ML Service (port 5001)
         │                     │
         │              ML/models/*.pkl
         │              (41 PKL files)
         │
         └──[offline]─► brain.js Neural Network
                         (in-process fallback)
```

**Auto-fallback**: If the Python service is unavailable, the Node.js bridge automatically falls back to brain.js — zero downtime.

---

## 🌿 Crop Advisory Features

Input features (12 dimensions):
- `ph` — Soil pH (4-10)
- `nitrogen`, `phosphorus`, `potassium` — NPK values (kg/ha)
- `temperature`, `rainfall`, `humidity`, `windSpeed` — Weather
- `season` — rabi / kharif / zaid / annual
- `soilType` — alluvial / black / red / sandy / clay / laterite / loamy
- `organicCarbon` — OC % (0-5)
- `zinc` — Zn ppm

Output: Top 5 crop recommendations with MSP, income estimates, and suitability tags

---

## 🌱 Soil Health Features

Input features (10 dimensions):
- `ph`, `organicCarbon`, `nitrogen`, `phosphorus`, `potassium`, `zinc`
- `moisture`, `bulkDensity`, `ec` — Physical properties
- `texture` — sandy/loamy/clay/silt/black

Output: Health score (0-100), grade (A-D), confidence range from multiple models

---

## Environment Variables

```env
ML_SERVICE_URL=http://localhost:5001   # Python ML service URL
ML_TIMEOUT_MS=4000                     # Timeout before fallback
ML_PORT=5001                           # ML service port
```
