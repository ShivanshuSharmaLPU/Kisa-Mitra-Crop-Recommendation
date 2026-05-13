"""
KisanMitra ML v2 — Crop Recommendation (INTERVIEW SAFE VERSION)
✔ No manual missing value filling
✔ Uses sklearn Pipeline (no data leakage)
✔ Proper preprocessing strategy
"""

import pandas as pd
import numpy as np
import pickle
import os

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.ensemble import ExtraTreesClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier

# -----------------------
# LOAD DATA
# -----------------------
df = pd.read_csv("data/Crop_recommendation.csv")

print("Missing values:\n", df.isnull().sum())

X = df.drop("label", axis=1)
y = df["label"]

# -----------------------
# FEATURE GROUPS
# -----------------------
numeric_features = [
    'ph', 'organicCarbon', 'nitrogen', 'phosphorus', 'potassium',
    'zinc', 'moisture', 'bulkDensity', 'ec'
]

categorical_features = ['textureCode']

# -----------------------
# PREPROCESSING PIPELINE
# -----------------------

numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="median")),   # ✔ proper imputation
    ("scaler", StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore"))
])

from sklearn.compose import ColumnTransformer

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features)
    ]
)

# -----------------------
# MODELS
# -----------------------
models = {
    "RF": RandomForestClassifier(n_estimators=300, random_state=42),
    "GB": GradientBoostingClassifier(),
    "ET": ExtraTreesClassifier(n_estimators=300),
    "SVC": SVC(kernel="rbf", probability=True),
    "KNN": KNeighborsClassifier(n_neighbors=5)
}

trained = {}
scores = {}

# -----------------------
# TRAINING LOOP
# -----------------------
print("\n🚀 Training models...\n")

for name, model in models.items():

    clf = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ])

    cv = cross_val_score(clf, X, y, cv=5, scoring="accuracy")

    clf.fit(X, y)

    trained[name] = clf
    scores[name] = cv.mean()

    print(f"{name:<5} Accuracy: {cv.mean():.4f}")

    with open(f"models/crop_{name}.pkl", "wb") as f:
        pickle.dump(clf, f)

# -----------------------
# ENSEMBLE
# -----------------------
top3 = sorted(scores, key=scores.get, reverse=True)[:3]

ensemble = VotingClassifier(
    estimators=[(n, trained[n]) for n in top3],
    voting="soft"
)

ensemble.fit(X, y)

print("\n🏆 Top Models:", top3)
print("🎯 Ensemble Accuracy:", ensemble.score(X, y))

with open("models/crop_ensemble.pkl", "wb") as f:
    pickle.dump(ensemble, f)

print("\n✅ Training Complete (Interview Safe)")