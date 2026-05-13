<<<<<<< HEAD
# 🌾 KisanMitra Smart Crop Advisory 

## 📌 Project Overview
**KisanMitra ** is an AI-powered crop advisory platform that helps farmers choose the **best crop and analyze soil health** using advanced **Machine Learning models**.

The system uses **multiple scikit-learn models, ensemble learning, and a dual prediction engine** to ensure high accuracy and reliability.

---

# 🚀 Key Features

## 1️⃣ Advanced Machine Learning System

Uses **6 Machine Learning models** from **scikit-learn**:

- Random Forest
- Gradient Boosting
- Extra Trees
- Support Vector Machine (SVM)
- K-Nearest Neighbors (KNN)
- Logistic Regression

### Voting Ensemble Model
- Combines the top models
- Improves prediction accuracy

### PKL (Pickle) Model Files
- Models are saved to disk
- Enables **fast production inference**

---

## 2️⃣ Dual Prediction Engine

The system uses **two prediction engines**:

### Python ML Service (Primary Engine)
- Uses trained **scikit-learn models (.pkl)**
- Provides high accuracy predictions

### Neural Network Fallback
- Uses **brain.js**
- Automatically used if Python ML service fails

---

# 📊 Model Performance

| Model | Performance |
|------|-------------|
| Crop Prediction | ~99% accuracy |
| ExtraTrees Cross Validation | ~100% accuracy |
| Random Forest | ~97.3% accuracy |
| Soil Health Prediction | R² Score 0.66+ |

---

# 🏗 System Architecture

```
User Request
     │
     ▼
Node.js Backend (Express API)
     │
     ├── Python ML Service (Primary)
     │        │
     │        ├ crop_extra_trees.pkl
     │        ├ crop_random_forest.pkl
     │        ├ crop_ensemble.pkl
     │        ├ crop_gradient_boosting.pkl
     │        ├ crop_svm.pkl
     │        ├ crop_knn.pkl
     │        │
     │        ├ soil_ensemble.pkl
     │        ├ soil_gradient_boosting.pkl
     │        └ soil_ridge.pkl
     │
     └── brain.js Neural Network (Fallback)
```

---

# ⚙️ Installation & Setup

## 1️⃣ Train ML Models

This step generates **PKL model files**.

```bash
cd backend
npm run ml:train
```

or

```bash
python3 ml/python/train_all.py
```

---

## 2️⃣ Start Python ML Service

```bash
npm run ml:service
```

Runs on:

```
http://localhost:5001
```

---

## 3️⃣ Start Backend Server

```bash
npm run dev
```

Runs on:

```
http://localhost:5000
```

---

## 4️⃣ Start Frontend

```bash
cd frontend
npm run dev
```

Runs on:

```
http://localhost:5173
```

---

## 🟢 Start Full System (One Command)

```bash
npm run start:full
```

This command starts:

- Backend
- ML service
- Frontend

---

# 🔌 ML API Endpoints

| Method | Endpoint | Description |
|------|----------|-------------|
| POST | `/api/crops/recommend` | Predict best crop |
| POST | `/api/soil/analyze` | Soil health analysis |
| GET | `/api/ml/status` | ML service health |
| POST | `/api/ml/train` | Retrain ML models |
| GET | `/api/crops/ml-info` | Crop model metadata |
| GET | `/api/soil/ml-info` | Soil model metadata |

---

# 📁 ML Model Files

Location:

```
backend/ml/models/
```

### Crop Models

```
crop_scaler.pkl
crop_extra_trees.pkl
crop_random_forest.pkl
crop_gradient_boosting.pkl
crop_ensemble.pkl
crop_svm.pkl
crop_knn.pkl
crop_logistic.pkl
crop_meta.json
```

### Soil Models

```
soil_scaler.pkl
soil_ensemble.pkl
soil_gradient_boosting.pkl
soil_ridge.pkl
soil_random_forest.pkl
soil_knn.pkl
soil_meta.json
```

---

# 🐍 Python Dependencies

```
scikit-learn >= 1.3.0
numpy >= 1.24.0
pandas >= 2.0.0
scipy >= 1.11.0
joblib >= 1.3.0
```

Install dependencies:

```bash
pip install -r backend/ml/python/requirements.txt
```

---

# 🟢 Node.js Requirements

Requires:

```
Node.js v23.11.1+
```

Uses **native fetch API**, so **Axios is not required**.

---

# 🔑 Environment Variables (.env)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kisanmitra
ML_SERVICE_URL=http://localhost:5001
JWT_SECRET=your_secret_here
OPENAI_API_KEY=your_openai_key
ML_PORT=5001
```

---

# 🛠 Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB

### Machine Learning
- Python
- scikit-learn
- joblib

### Frontend
- React
- Vite

### AI
- Ensemble ML Models
- Neural Networks (brain.js)
=======
# KisanMitra-Crop-Recommendation
>>>>>>> 8cbf291dc3e7b7339aa3ed54f7fd57523edc5b91
