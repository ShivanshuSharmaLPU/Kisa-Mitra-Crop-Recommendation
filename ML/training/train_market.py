"""
KisanMitra ML — Market Price Prediction Model Training
════════════════════════════════════════════════════════
Predicts commodity price trends (UP/DOWN/STABLE) and price estimates
Models: RandomForest, GradientBoosting, ExtraTrees, SVR, VotingEnsemble
Output: PKL files in ML/models/
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))

import numpy as np
from ml_utils import save_pkl, save_json, evaluate_classifier, evaluate_regressor, print_scores, Timer, section

from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier, VotingClassifier,
    RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor, VotingRegressor
)
from sklearn.svm import SVC, SVR
from sklearn.calibration import CalibratedClassifierCV
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.linear_model import Ridge, LogisticRegression
import warnings
warnings.filterwarnings('ignore')

TREND_CLASSES = ['down', 'stable', 'up']  # 0, 1, 2

# Features: [commodity_code, season_code, month, rainfall_last30, temp_avg,
#            prev_price, prev_msp_ratio, msp, supply_index, demand_index]
FEATURE_NAMES = ['commodity_code','season_code','month','rainfall_l30','temp_avg',
                 'prev_price','prev_msp_ratio','msp','supply_index','demand_index']

# Commodity codes
COMMODITY_ENC = {'wheat':0,'rice':1,'maize':2,'cotton':3,'mustard':4,
                 'soybean':5,'sugarcane':6,'onion':7,'potato':8,'tomato':9}

RAW_TREND = [
    # comm, season, month, rain, temp, prev_price, msp_ratio, msp, supply, demand → trend
    # wheat — UP (post-harvest demand, low supply)
    [0, 0, 10, 30,  18, 2000, 0.88, 2275, 0.6, 0.9, 2],
    [0, 0, 11, 20,  15, 2100, 0.92, 2275, 0.5, 0.8, 2],
    [0, 0,  2, 10,  14, 2200, 0.97, 2275, 0.4, 0.9, 2],
    [0, 0, 12, 15,  12, 2150, 0.95, 2275, 0.5, 0.85,2],
    # wheat — STABLE
    [0, 0,  4, 50,  22, 2275, 1.00, 2275, 0.8, 0.8, 1],
    [0, 0,  5, 30,  25, 2250, 0.99, 2275, 0.9, 0.85,1],
    # wheat — DOWN (glut after harvest)
    [0, 0,  3,100,  20, 2400, 1.05, 2275, 1.2, 0.7, 0],
    [0, 0,  4, 80,  22, 2350, 1.03, 2275, 1.1, 0.75,0],

    # rice — UP
    [1, 1,  7, 200, 31, 1900, 0.87, 2183, 0.5, 0.9, 2],
    [1, 1,  8, 250, 32, 2000, 0.92, 2183, 0.4, 0.95,2],
    [1, 1, 12, 20,  18, 2100, 0.96, 2183, 0.5, 0.9, 2],
    [1, 1,  1, 10,  15, 2050, 0.94, 2183, 0.6, 0.9, 2],
    # rice — STABLE
    [1, 1,  2, 15,  18, 2183, 1.00, 2183, 0.8, 0.8, 1],
    [1, 1,  3, 20,  22, 2150, 0.98, 2183, 0.85,0.82,1],
    # rice — DOWN
    [1, 1, 10, 300, 28, 2300, 1.05, 2183, 1.3, 0.7, 0],
    [1, 1, 11, 150, 26, 2250, 1.03, 2183, 1.2, 0.72,0],

    # maize — UP
    [2, 1,  7, 100, 30, 1700, 0.87, 1962, 0.5, 0.9, 2],
    [2, 1,  8, 150, 31, 1800, 0.92, 1962, 0.4, 0.85,2],
    # maize — STABLE
    [2, 1,  2, 20,  20, 1962, 1.00, 1962, 0.8, 0.8, 1],
    # maize — DOWN
    [2, 1, 10, 200, 28, 2100, 1.07, 1962, 1.3, 0.65,0],
    [2, 2,  4, 30,  28, 2000, 1.02, 1962, 1.1, 0.7, 0],

    # cotton — UP
    [3, 1,  7, 50,  32, 5500, 0.83, 6620, 0.5, 0.9, 2],
    [3, 1,  8, 80,  33, 5800, 0.88, 6620, 0.4, 0.9, 2],
    [3, 1, 11, 20,  22, 6000, 0.91, 6620, 0.5, 0.85,2],
    # cotton — STABLE
    [3, 1,  2, 10,  20, 6500, 0.98, 6620, 0.8, 0.82,1],
    # cotton — DOWN
    [3, 1,  4, 30,  25, 7000, 1.06, 6620, 1.2, 0.7, 0],

    # mustard — UP
    [4, 0, 10, 20,  18, 4800, 0.85, 5650, 0.5, 0.9, 2],
    [4, 0, 11, 15,  15, 5000, 0.88, 5650, 0.4, 0.9, 2],
    # mustard — STABLE
    [4, 0,  3, 50,  22, 5650, 1.00, 5650, 0.8, 0.8, 1],
    # mustard — DOWN
    [4, 0,  4,100,  24, 6000, 1.06, 5650, 1.2, 0.7, 0],

    # tomato — very volatile
    [9, 1,  6, 50,  35, 1500, 0.00, 0, 0.3, 0.9, 2],
    [9, 1, 12, 10,  18, 2500, 0.00, 0, 0.4, 0.85,2],
    [9, 1,  7, 200, 32, 3000, 0.00, 0, 1.4, 0.6, 0],
    [9, 1,  8, 300, 31, 2800, 0.00, 0, 1.5, 0.55,0],
    [9, 0,  2, 20,  20, 2000, 0.00, 0, 0.8, 0.8, 1],

    # onion — volatile
    [7, 1,  9, 100, 28, 2000, 0.00, 0, 0.4, 0.9, 2],
    [7, 0,  3, 30,  25, 1800, 0.00, 0, 0.5, 0.85,2],
    [7, 1, 11, 50,  24, 2500, 0.00, 0, 1.2, 0.65,0],
    [7, 0,  1, 10,  18, 2200, 0.00, 0, 1.1, 0.7, 0],
    [7, 0,  5, 40,  30, 2000, 0.00, 0, 0.8, 0.8, 1],

    # potato
    [8, 0, 11, 20,  20, 900,  0.00, 0, 0.5, 0.9, 2],
    [8, 0, 12, 15,  15, 1000, 0.00, 0, 0.4, 0.85,2],
    [8, 0,  2, 30,  18, 1200, 0.00, 0, 1.2, 0.65,0],
    [8, 0,  3, 50,  22, 1100, 0.00, 0, 1.1, 0.7, 0],
    [8, 1,  8, 200, 32, 950,  0.00, 0, 0.8, 0.8, 1],
]

def train():
    section("📈 MARKET PRICE PREDICTION MODEL TRAINING")

    arr = __import__('numpy').array(RAW_TREND)
    X, y_trend = arr[:, :10], arr[:, 10].astype(int)
    print(f"  Samples: {len(X)} | Features: {X.shape[1]} | Trend classes: {len(TREND_CLASSES)}")

    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    save_pkl(scaler, 'market_scaler.pkl', 'Feature StandardScaler')

    # ── Trend Classifier ──
    clf_models = {
        'RandomForest':    RandomForestClassifier(n_estimators=200, max_depth=8, class_weight='balanced', random_state=42, n_jobs=-1),
        'GradientBoosting':GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, max_depth=4, random_state=42),
        'ExtraTrees':      ExtraTreesClassifier(n_estimators=200, max_depth=8, class_weight='balanced', random_state=42, n_jobs=-1),
        'SVM':             CalibratedClassifierCV(SVC(kernel='rbf', C=5, gamma='scale'), cv=3),
        'KNN':             KNeighborsClassifier(n_neighbors=5, weights='distance'),
        'Logistic':        LogisticRegression(C=1.0, max_iter=1000, random_state=42),
    }

    section("📊 Training Trend Classifiers")
    trained_clf, scores_clf = {}, {}
    for name, model in clf_models.items():
        with Timer(name):
            model.fit(X_scaled, y_trend)
            trained_clf[name] = model
            scores_clf[name] = evaluate_classifier(model, X_scaled, y_trend, name, cv=5)
            print_scores(name, scores_clf[name])

    section("🗳️  Building Trend Voting Ensemble")
    top4 = sorted(scores_clf, key=lambda k: scores_clf[k]['accuracy_mean'], reverse=True)[:4]
    ens_clf = VotingClassifier(estimators=[(n, trained_clf[n]) for n in top4], voting='soft', n_jobs=-1)
    ens_clf.fit(X_scaled, y_trend)
    scores_clf['VotingEnsemble'] = evaluate_classifier(ens_clf, X_scaled, y_trend, 'VotingEnsemble', cv=5)
    print_scores('VotingEnsemble', scores_clf['VotingEnsemble'])
    trained_clf['VotingEnsemble'] = ens_clf

    section("💾 Saving Market PKL Models")
    for name, model in trained_clf.items():
        save_pkl(model, f"market_{name.lower().replace(' ','_')}.pkl",
                 f"Acc: {scores_clf.get(name,{}).get('accuracy_mean',0):.1%}")

    best = max(scores_clf, key=lambda k: scores_clf[k]['accuracy_mean'])
    meta = {
        'model_type': 'market_predictor',
        'trend_classes': TREND_CLASSES,
        'commodity_encoding': COMMODITY_ENC,
        'feature_names': FEATURE_NAMES,
        'model_scores': scores_clf,
        'best_model': best,
        'trained_at': __import__('datetime').datetime.now().isoformat(),
    }
    save_json(meta, 'market_meta.json')

    section("🏆 MARKET MODEL RESULTS")
    for name in sorted(scores_clf, key=lambda k: -scores_clf[k]['accuracy_mean']):
        acc = scores_clf[name]['accuracy_mean']
        bar = '█' * int(acc * 20)
        print(f"  {name:<22} {bar:<20} {acc:.1%}")
    print(f"\n  ⭐ Best: {best} — {scores_clf[best]['accuracy_mean']:.1%}")
    return meta

if __name__ == '__main__':
    train()
