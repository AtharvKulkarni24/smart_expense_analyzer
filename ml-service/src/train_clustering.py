"""
Unsupervised Spending Pattern Clustering Pipeline for SpendSense.
Trains K-Means clustering on aggregated user-month spending profiles.
Evaluates candidate values of K using Silhouette Scores and Inertia (Elbow Method).
Interprets centroids to assign meaningful profile labels and serializes the model.
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
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.config import (
    CATEGORIES,
    KMEANS_METADATA_PATH,
    KMEANS_MODEL_PATH,
    SYNTHETIC_DATA_DIR,
)

# Feature column definitions
PROPORTION_COLS = [
    "prop_food_dining",
    "prop_groceries",
    "prop_transport",
    "prop_shopping",
    "prop_bills_utilities",
    "prop_entertainment",
    "prop_healthcare",
    "prop_education",
    "prop_travel",
    "prop_other",
]

NUMERICAL_COLS = [
    "monthly_transaction_count",
    "average_transaction_amount",
]

FEATURE_COLS = PROPORTION_COLS + NUMERICAL_COLS

# Map column back to readable category name
COL_TO_CAT_NAME = {
    "prop_food_dining": "Food & Dining",
    "prop_groceries": "Groceries",
    "prop_transport": "Transport",
    "prop_shopping": "Shopping",
    "prop_bills_utilities": "Bills & Utilities",
    "prop_entertainment": "Entertainment",
    "prop_healthcare": "Healthcare",
    "prop_education": "Education",
    "prop_travel": "Travel",
    "prop_other": "Other",
}


def load_dataset() -> pd.DataFrame:
    """Loads synthetic monthly spending profiles."""
    dataset_path = SYNTHETIC_DATA_DIR / "monthly_profiles.csv"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}. Run generate_synthetic.py first.")
    
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} monthly profiles from {dataset_path.name}")
    return df


def evaluate_candidate_k(X_scaled: np.ndarray, k_range=range(2, 8)):
    """
    Computes Inertia and Silhouette Score for candidate values of K.
    """
    print("\n--- Evaluating Candidate K Values (Clustering Tuning) ---")
    results = []

    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(X_scaled)
        
        inertia = kmeans.inertia_
        sil_score = silhouette_score(X_scaled, cluster_labels)
        
        results.append({
            "k": k,
            "inertia": round(float(inertia), 2),
            "silhouette_score": round(float(sil_score), 4),
        })

    print(f"{'K':<5} | {'Inertia (Elbow)':<18} | {'Silhouette Score':<18}")
    print("-" * 45)
    for r in results:
        print(f"{r['k']:<5} | {r['inertia']:<18.2f} | {r['silhouette_score']:<18.4f}")

    # Select K with maximum silhouette score, or default optimal
    best_k_entry = max(results, key=lambda x: x["silhouette_score"])
    print(f"\nOptimal K identified by Silhouette Score: K = {best_k_entry['k']} (Score: {best_k_entry['silhouette_score']})")
    return results, best_k_entry["k"]


def interpret_centroids(kmeans: KMeans, scaler: StandardScaler) -> dict:
    """
    Analyzes cluster centroids in the original unscaled feature space
    and derives human-interpretable labels and descriptions.
    """
    # Inverse transform to inspect real proportion and amount values
    raw_centroids = scaler.inverse_transform(kmeans.cluster_centers_)
    cluster_profiles = {}

    for cluster_id in range(kmeans.n_clusters):
        centroid = raw_centroids[cluster_id]
        
        # Extract proportions (first 10 features)
        props = centroid[:len(PROPORTION_COLS)]
        tx_count = round(float(centroid[len(PROPORTION_COLS)]), 1)
        avg_amt = round(float(centroid[len(PROPORTION_COLS) + 1]), 2)

        # Rank categories by proportion
        cat_ranking = sorted(
            [(COL_TO_CAT_NAME[col], float(val)) for col, val in zip(PROPORTION_COLS, props)],
            key=lambda x: x[1],
            reverse=True,
        )

        top_cat, top_prop = cat_ranking[0]
        second_cat, second_prop = cat_ranking[1]

        # Calculate standard deviation of proportions (low = balanced)
        prop_std = float(np.std(props))

        # Dynamic Rule-Based Centroid Labeling
        if prop_std < 0.06 and top_prop < 0.25:
            label = "Balanced Budgeter"
            summary = (
                f"Expenditure is evenly distributed across essential categories. "
                f"Average transaction: INR {avg_amt:.2f} across {tx_count:.0f} monthly transactions."
            )
        elif top_cat == "Food & Dining" and top_prop >= 0.30:
            label = "Dining & Essentials Heavy"
            summary = (
                f"Significant expenditure concentrated in {top_cat} ({top_prop * 100:.1f}%) "
                f"and {second_cat} ({second_prop * 100:.1f}%)."
            )
        elif top_cat == "Shopping" and top_prop >= 0.30:
            label = "Discretionary & Shopping Heavy"
            summary = (
                f"High discretionary spending in {top_cat} ({top_prop * 100:.1f}%), "
                f"with {second_cat} at {second_prop * 100:.1f}%."
            )
        elif top_cat == "Bills & Utilities" and top_prop >= 0.35:
            label = "Fixed Obligations Heavy"
            summary = (
                f"Major share allocated to {top_cat} ({top_prop * 100:.1f}%), "
                f"indicating prominent fixed household overheads."
            )
        elif top_cat in ["Travel", "Transport"] and (top_prop + second_prop) >= 0.35:
            label = "Travel & Mobility Heavy"
            summary = (
                f"Elevated allocation to {top_cat} ({top_prop * 100:.1f}%) "
                f"and {second_cat} ({second_prop * 100:.1f}%)."
            )
        else:
            label = f"{top_cat} Focused Spender"
            summary = f"Dominant spending in {top_cat} ({top_prop * 100:.1f}%)."

        cluster_profiles[str(cluster_id)] = {
            "cluster_id": cluster_id,
            "label": label,
            "summary": summary,
            "top_categories": [top_cat, second_cat],
            "average_transaction_count": tx_count,
            "average_transaction_amount": avg_amt,
            "proportions": {cat: round(float(val), 4) for cat, val in cat_ranking},
        }

    return cluster_profiles


def train_and_evaluate_clustering():
    df = load_dataset()
    X = df[FEATURE_COLS].values

    # Feature Scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Tuning candidate K
    tuning_results, optimal_k = evaluate_candidate_k(X_scaled, k_range=range(2, 8))

    # Standardize on K=5 for the 5 agreed archetypes
    selected_k = 5
    print(f"\n--- Training Final K-Means Model with K = {selected_k} ---")
    
    kmeans_pipeline = Pipeline([
        ("scaler", scaler),
        ("kmeans", KMeans(n_clusters=selected_k, random_state=42, n_init=20)),
    ])
    kmeans_pipeline.fit(X)

    cluster_labels = kmeans_pipeline.named_steps["kmeans"].labels_
    final_sil_score = silhouette_score(X_scaled, cluster_labels)
    print(f"Final K-Means (K={selected_k}) Silhouette Score: {final_sil_score:.4f}")

    # Interpret Centroids
    cluster_profiles = interpret_centroids(
        kmeans_pipeline.named_steps["kmeans"],
        kmeans_pipeline.named_steps["scaler"],
    )

    print("\n--- Discovered Cluster Centroid Profiles ---")
    for cid, prof in cluster_profiles.items():
        print(f"\nCluster {cid}: [{prof['label']}]")
        print(f"  Summary: {prof['summary']}")
        print(f"  Top Categories: {prof['top_categories']}")
        print(f"  Avg Tx Count: {prof['average_transaction_count']} | Avg Tx Amount: INR {prof['average_transaction_amount']}")

    # Serialize Model & Export Metadata
    print(f"\nSerializing clustering pipeline to {KMEANS_MODEL_PATH}...")
    joblib.dump(kmeans_pipeline, KMEANS_MODEL_PATH)

    metadata = {
        "model_version": "kmeans-v1.0.0",
        "algorithm": "KMeans",
        "n_clusters": selected_k,
        "features": FEATURE_COLS,
        "silhouette_score": round(float(final_sil_score), 4),
        "tuning_evaluation": tuning_results,
        "cluster_profiles": cluster_profiles,
        "training_timestamp": datetime.now().isoformat(),
        "total_profiles_trained": len(df),
    }

    with open(KMEANS_METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved clustering metadata to {KMEANS_METADATA_PATH}")

    # -------------------------------------------------------------
    # Verification: Test Inference on Unseen Monthly Vectors
    # -------------------------------------------------------------
    print("\n--- Verifying Inference on Sample Monthly Vectors ---")
    
    test_cases = [
        {
            "name": "Food Centric Profile",
            "proportions": {
                "prop_food_dining": 0.45, "prop_groceries": 0.20, "prop_transport": 0.08,
                "prop_shopping": 0.07, "prop_bills_utilities": 0.10, "prop_entertainment": 0.05,
                "prop_healthcare": 0.02, "prop_education": 0.01, "prop_travel": 0.00, "prop_other": 0.02
            },
            "monthly_transaction_count": 52,
            "average_transaction_amount": 420.0,
        },
        {
            "name": "Shopping Heavy Profile",
            "proportions": {
                "prop_food_dining": 0.10, "prop_groceries": 0.10, "prop_transport": 0.08,
                "prop_shopping": 0.48, "prop_bills_utilities": 0.08, "prop_entertainment": 0.10,
                "prop_healthcare": 0.01, "prop_education": 0.02, "prop_travel": 0.01, "prop_other": 0.02
            },
            "monthly_transaction_count": 35,
            "average_transaction_amount": 1650.0,
        },
    ]

    for tc in test_cases:
        row_vector = [tc["proportions"][col] for col in PROPORTION_COLS] + [
            tc["monthly_transaction_count"],
            tc["average_transaction_amount"],
        ]
        assigned_cluster = int(kmeans_pipeline.predict([row_vector])[0])
        profile_info = cluster_profiles[str(assigned_cluster)]
        print(f"\nTest: '{tc['name']}' -> Cluster [{assigned_cluster}]: {profile_info['label']}")
        print(f"  Summary: {profile_info['summary']}")

    print("\nPhase 4 Spending Pattern Clustering Complete!")


if __name__ == "__main__":
    train_and_evaluate_clustering()
