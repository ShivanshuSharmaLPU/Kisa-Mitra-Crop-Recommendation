"""
KisanMitra ML — Shared Utilities
Common helpers for data preprocessing, model evaluation, PKL I/O
"""

import numpy as np
import joblib
import json
import os
import time
from datetime import datetime
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.model_selection import cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    mean_squared_error, r2_score, mean_absolute_error
)

# ── Paths ─────────────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# ── PKL Save / Load ───────────────────────────────────────────────────────────
def save_pkl(obj, filename, description=""):
    """Save any object as a PKL file in the models directory."""
    path = os.path.join(MODELS_DIR, filename)
    joblib.dump(obj, path, compress=3)
    size_kb = os.path.getsize(path) / 1024
    print(f"  💾 Saved: {filename} ({size_kb:.1f} KB) — {description}")
    return path

def load_pkl(filename):
    """Load a PKL file from the models directory."""
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {filename}. Run training first.")
    return joblib.load(path)

def load_json(filename):
    """Load a JSON metadata file from the models directory."""
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

def save_json(data, filename):
    """Save metadata JSON to models directory."""
    path = os.path.join(MODELS_DIR, filename)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    print(f"  📋 Metadata: {filename}")
    return path

def list_pkl_models():
    """List all PKL model files."""
    if not os.path.exists(MODELS_DIR):
        return []
    return [f for f in os.listdir(MODELS_DIR) if f.endswith('.pkl')]

# ── Model Evaluation ──────────────────────────────────────────────────────────
def evaluate_classifier(model, X, y, name, cv=5):
    """Cross-validate a classifier and return metrics."""
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    scores = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
    f1_scores = cross_val_score(model, X, y, cv=skf, scoring='f1_weighted')
    return {
        'accuracy_mean': float(scores.mean()),
        'accuracy_std':  float(scores.std()),
        'accuracy_min':  float(scores.min()),
        'accuracy_max':  float(scores.max()),
        'f1_mean':       float(f1_scores.mean()),
        'f1_std':        float(f1_scores.std()),
    }

def evaluate_regressor(model, X, y, name, cv=5):
    """Cross-validate a regressor and return metrics."""
    kf = KFold(n_splits=cv, shuffle=True, random_state=42)
    r2   = cross_val_score(model, X, y, cv=kf, scoring='r2')
    rmse = cross_val_score(model, X, y, cv=kf, scoring='neg_root_mean_squared_error')
    return {
        'r2_mean':   float(r2.mean()),
        'r2_std':    float(r2.std()),
        'rmse_mean': float(-rmse.mean()),
        'rmse_std':  float(rmse.std()),
    }

def print_scores(name, scores, mode='classifier'):
    """Pretty-print model scores."""
    if mode == 'classifier':
        print(f"     ✅ {name}: Accuracy={scores['accuracy_mean']:.3f}±{scores['accuracy_std']:.3f}  F1={scores['f1_mean']:.3f}")
    else:
        print(f"     ✅ {name}: R²={scores['r2_mean']:.3f}±{scores['r2_std']:.3f}  RMSE={scores['rmse_mean']:.2f}")

# ── Feature Normalization ─────────────────────────────────────────────────────
def normalize_features(X_train, X_test=None, method='standard'):
    """Scale features using StandardScaler or MinMaxScaler."""
    scaler = StandardScaler() if method == 'standard' else MinMaxScaler()
    X_scaled = scaler.fit_transform(X_train)
    if X_test is not None:
        return X_scaled, scaler.transform(X_test), scaler
    return X_scaled, scaler

# ── Timer Utility ─────────────────────────────────────────────────────────────
class Timer:
    def __init__(self, label):
        self.label = label
    def __enter__(self):
        self.t = time.time()
        return self
    def __exit__(self, *args):
        elapsed = time.time() - self.t
        print(f"   ⏱️  {self.label}: {elapsed:.1f}s")

def section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")
