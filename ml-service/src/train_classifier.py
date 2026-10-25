"""
Supervised Expense Classification Pipeline for SpendSense.
Trains and compares:
1. TF-IDF + Multinomial Naive Bayes (Primary Model)
2. TF-IDF + Decision Tree Classifier (Baseline Comparison)
Outputs evaluation metrics, confusion matrix, and serializes the winning model.
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure ml-service root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from src.config import (
    CATEGORIES,
    CATEGORY_ID_TO_NAME,
    CATEGORY_NAME_TO_ID,
    CLASSIFIER_METADATA_PATH,
    CLASSIFIER_MODEL_PATH,
    SYNTHETIC_DATA_DIR,
)
from src.preprocessing import prepare_transaction_text


def load_dataset() -> pd.DataFrame:
    """Loads labeled transactions dataset."""
    dataset_path = SYNTHETIC_DATA_DIR / "transactions_labeled.csv"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}. Run generate_synthetic.py first.")
    
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} transactions from {dataset_path.name}")
    return df


def train_and_evaluate_classifiers():
    df = load_dataset()

    # Prepare features and labels
    print("Preprocessing text features...")
    df["processed_text"] = df.apply(
        lambda row: prepare_transaction_text(row["description"], row.get("merchant")), axis=1
    )
    
    X = df["processed_text"].values
    y = df["category_name"].values
    category_names = sorted(list(set(y)))

    # Stratified Train-Test Split (80% Train, 20% Held-out Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Dataset split: {len(X_train)} training samples, {len(X_test)} held-out test samples.")

    # -------------------------------------------------------------
    # 1. Model A: Multinomial Naive Bayes Pipeline (Primary)
    # -------------------------------------------------------------
    print("\n--- Training Model A: TF-IDF + Multinomial Naive Bayes ---")
    mnb_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=3500, sublinear_tf=True)),
        ("clf", MultinomialNB(alpha=0.5)),
    ])
    mnb_pipeline.fit(X_train, y_train)
    y_pred_mnb = mnb_pipeline.predict(X_test)

    acc_mnb = accuracy_score(y_test, y_pred_mnb)
    macro_f1_mnb = f1_score(y_test, y_pred_mnb, average="macro")
    weighted_f1_mnb = f1_score(y_test, y_pred_mnb, average="weighted")
    print(f"Multinomial Naive Bayes -> Accuracy: {acc_mnb:.4f} | Macro F1: {macro_f1_mnb:.4f} | Weighted F1: {weighted_f1_mnb:.4f}")

    # -------------------------------------------------------------
    # 2. Model B: Decision Tree Pipeline (Baseline Comparison)
    # -------------------------------------------------------------
    print("\n--- Training Model B: TF-IDF + Decision Tree (Baseline) ---")
    dt_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=3500, sublinear_tf=True)),
        ("clf", DecisionTreeClassifier(max_depth=20, min_samples_split=5, random_state=42)),
    ])
    dt_pipeline.fit(X_train, y_train)
    y_pred_dt = dt_pipeline.predict(X_test)

    acc_dt = accuracy_score(y_test, y_pred_dt)
    macro_f1_dt = f1_score(y_test, y_pred_dt, average="macro")
    weighted_f1_dt = f1_score(y_test, y_pred_dt, average="weighted")
    print(f"Decision Tree Baseline  -> Accuracy: {acc_dt:.4f} | Macro F1: {macro_f1_dt:.4f} | Weighted F1: {weighted_f1_dt:.4f}")

    # -------------------------------------------------------------
    # Comparative Summary Table
    # -------------------------------------------------------------
    print("\n" + "=" * 65)
    print(f"{'Model Architecture':<30} | {'Accuracy':<10} | {'Macro F1':<10} | {'Weighted F1':<10}")
    print("=" * 65)
    print(f"{'Multinomial Naive Bayes':<30} | {acc_mnb:<10.4f} | {macro_f1_mnb:<10.4f} | {weighted_f1_mnb:<10.4f}")
    print(f"{'Decision Tree (Baseline)':<30} | {acc_dt:<10.4f} | {macro_f1_dt:<10.4f} | {weighted_f1_dt:<10.4f}")
    print("=" * 65)

    # Detailed Classification Report for MNB
    print("\nDetailed Per-Class Performance (Multinomial Naive Bayes):")
    report_dict = classification_report(y_test, y_pred_mnb, output_dict=True)
    print(classification_report(y_test, y_pred_mnb, digits=4))

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred_mnb, labels=category_names)

    # -------------------------------------------------------------
    # 3. Model Serialization & Metadata Export
    # -------------------------------------------------------------
    print(f"\nSerializing primary pipeline to {CLASSIFIER_MODEL_PATH}...")
    joblib.dump(mnb_pipeline, CLASSIFIER_MODEL_PATH)

    metadata = {
        "model_version": "mnb-v1.0.0",
        "model_type": "MultinomialNB",
        "vectorizer": "TfidfVectorizer(ngram_range=(1,2), max_features=3500)",
        "training_timestamp": datetime.now().isoformat(),
        "total_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "classes": category_names,
        "metrics": {
            "mnb": {
                "accuracy": round(float(acc_mnb), 4),
                "macro_f1": round(float(macro_f1_mnb), 4),
                "weighted_f1": round(float(weighted_f1_mnb), 4),
            },
            "decision_tree_baseline": {
                "accuracy": round(float(acc_dt), 4),
                "macro_f1": round(float(macro_f1_dt), 4),
                "weighted_f1": round(float(weighted_f1_dt), 4),
            },
        },
        "per_class_report": report_dict,
        "confusion_matrix": {
            "labels": category_names,
            "matrix": cm.tolist(),
        },
    }

    with open(CLASSIFIER_METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved evaluation metadata to {CLASSIFIER_METADATA_PATH}")

    # -------------------------------------------------------------
    # 4. Verification Inference on Sample Unseen Queries
    # -------------------------------------------------------------
    print("\n--- Verifying Live Inference on Unseen Test Strings ---")
    test_queries = [
        {"merchant": "Starbucks", "description": "Starbucks Caramel Frappuccino Coffee"},
        {"merchant": "Uber", "description": "Uber Trip payment Bangalore Airport"},
        {"merchant": "Airtel", "description": "Airtel Broadband Monthly Fiber Bill"},
        {"merchant": "Apollo Pharmacy", "description": "Apollo Pharmacy Purchase cough syrup"},
        {"merchant": "Zomato", "description": "Zomato Order Dinner Biryani"},
        {"merchant": "Amazon", "description": "Amazon Retail Shoes and T-shirt"},
    ]

    for item in test_queries:
        processed = prepare_transaction_text(item["description"], item["merchant"])
        pred_label = mnb_pipeline.predict([processed])[0]
        probs = mnb_pipeline.predict_proba([processed])[0]
        conf = float(np.max(probs))
        cat_id = CATEGORY_NAME_TO_ID.get(pred_label, 10)
        print(f"Query: '{item['description']}' -> Predicted: [{cat_id}] {pred_label} (Confidence: {conf:.2%})")

    print("\nPhase 3 Supervised Classification Complete!")


if __name__ == "__main__":
    train_and_evaluate_classifiers()
