"""
KisanMitra ML — Master Training Pipeline
══════════════════════════════════════════
Trains ALL models and saves PKL files to ML/models/

Usage:
  python train_all.py          # train all
  python train_all.py crop     # train only crop
  python train_all.py soil     # train only soil
  python train_all.py pest     # train only pest
  python train_all.py market   # train only market
"""

import sys, os, time

BASE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(BASE, '..', 'utils'))

def banner(title):
    print(f"\n{'═'*62}")
    print(f"  {title}")
    print(f"{'═'*62}")

def run_module(module_name, label):
    banner(f"📌 {label}")
    t0 = time.time()
    mod = __import__(module_name)
    result = mod.train()
    elapsed = time.time() - t0
    print(f"\n  ✅ {label} complete in {elapsed:.1f}s")
    return result, elapsed

# Determine which to train
target = sys.argv[1].lower() if len(sys.argv) > 1 else 'all'
sys.path.insert(0, BASE)

banner("🌾  KisanMitra ML — Master Training Pipeline")
print("  Models: RandomForest, GradientBoosting, ExtraTrees, SVM,")
print("          KNN, AdaBoost, Bagging, Ridge, BayesianRidge + Voting Ensembles")
print("  Output: ML/models/*.pkl + ML/models/*_meta.json")

results = {}
total_start = time.time()

if target in ('all', 'crop'):
    results['crop'], _ = run_module('train_crop', 'Crop Recommendation')

if target in ('all', 'soil'):
    results['soil'], _ = run_module('train_soil', 'Soil Health Analysis')

if target in ('all', 'pest'):
    results['pest'], _ = run_module('train_pest', 'Pest Detection')

if target in ('all', 'market'):
    results['market'], _ = run_module('train_market', 'Market Price Prediction')

total_elapsed = time.time() - total_start

banner("🏆  TRAINING COMPLETE — SUMMARY")
from ml_utils import list_pkl_models

pkl_files = list_pkl_models()
print(f"\n  📦 PKL files saved: {len(pkl_files)}")
for f in sorted(pkl_files):
    from ml_utils import MODELS_DIR
    size_kb = os.path.getsize(os.path.join(MODELS_DIR, f)) / 1024
    print(f"     {f:<42} {size_kb:6.1f} KB")

if 'crop' in results:
    m = results['crop']
    best = m.get('best_model','?')
    acc  = m.get('model_scores',{}).get(best,{}).get('accuracy_mean',0)
    print(f"\n  🌾 Crop  → {best}: {acc:.1%} accuracy")

if 'soil' in results:
    m = results['soil']
    best = m.get('best_model','?')
    r2   = m.get('model_scores',{}).get(best,{}).get('r2_mean',0)
    print(f"  🌱 Soil  → {best}: R²={r2:.3f}")

if 'pest' in results:
    m = results['pest']
    best = m.get('best_model','?')
    acc  = m.get('model_scores',{}).get(best,{}).get('accuracy_mean',0)
    print(f"  🐛 Pest  → {best}: {acc:.1%} accuracy")

if 'market' in results:
    m = results['market']
    best = m.get('best_model','?')
    acc  = m.get('model_scores',{}).get(best,{}).get('accuracy_mean',0)
    print(f"  📈 Market→ {best}: {acc:.1%} accuracy")

print(f"\n  ⏱️  Total training time: {total_elapsed:.1f}s")
print(f"\n  🚀 Start ML service:")
print(f"     cd ML/service && python ml_server.py")
print(f"\n  🔌 Node.js: Already integrated — runs automatically")
print(f"{'═'*62}\n")
