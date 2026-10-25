"""
Synthetic Dataset Generator for SpendSense ML Service.
Generates:
1. Labeled transaction records for text classification (Naive Bayes vs. Decision Tree).
2. Monthly user spending profile vectors for clustering (K-Means).
"""
import random
import uuid
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

import os
import sys
from pathlib import Path

# Ensure ml-service root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import (
    CATEGORIES,
    CATEGORY_SEEDS,
    CATEGORY_NAME_TO_ID,
    SYNTHETIC_DATA_DIR,
)

# Set random seeds for reproducibility
random.seed(42)
np.random.seed(42)


def generate_synthetic_transactions(num_samples: int = 3500) -> pd.DataFrame:
    """
    Generates realistic, labeled personal expense transactions with natural noise.
    """
    print(f"Generating {num_samples} synthetic transactions across 10 categories...")
    
    records = []
    start_date = datetime(2026, 1, 1)
    end_date = datetime(2026, 10, 25)
    total_days = (end_date - start_date).days
    
    users = [f"user_{i:03d}" for i in range(1, 31)] # 30 synthetic users
    
    samples_per_category = num_samples // len(CATEGORIES)
    
    for category in CATEGORIES:
        cat_name = category["name"]
        cat_id = category["id"]
        seed_data = CATEGORY_SEEDS[cat_name]
        
        merchants = seed_data["merchants"]
        templates = seed_data["templates"]
        min_amt, max_amt = seed_data["amount_range"]
        mean_amt = seed_data["mean_amount"]
        
        for _ in range(samples_per_category):
            merchant = random.choice(merchants)
            template = random.choice(templates)
            digits = random.randint(1000, 99999)
            
            # Generate description with realistic variation
            desc = template.format(merchant=merchant, digits=digits)
            
            # Inject realistic text noise (case variations, spacing)
            noise_roll = random.random()
            if noise_roll < 0.15:
                desc = desc.upper()
            elif noise_roll < 0.30:
                desc = desc.lower()
            elif noise_roll < 0.40:
                desc = desc.replace(" ", "*")
            
            # Generate amount using log-normal distribution centered around mean
            sigma = 0.55
            mu = np.log(mean_amt) - (sigma ** 2) / 2
            raw_amount = np.random.lognormal(mu, sigma)
            amount = round(float(np.clip(raw_amount, min_amt, max_amt)), 2)
            
            # Random date within the period
            rand_days = random.randint(0, total_days)
            tx_date = start_date + timedelta(days=rand_days, hours=random.randint(8, 22), minutes=random.randint(0, 59))
            
            records.append({
                "transaction_id": str(uuid.uuid4()),
                "user_id": random.choice(users),
                "transaction_date": tx_date.strftime("%Y-%m-%d %H:%M:%S"),
                "period_month": tx_date.strftime("%Y-%m"),
                "merchant": merchant,
                "description": desc,
                "amount": amount,
                "currency": "INR",
                "category_id": cat_id,
                "category_name": cat_name,
                "source": "synthetic"
            })
            
    df = pd.DataFrame(records)
    # Shuffle dataframe
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    output_path = SYNTHETIC_DATA_DIR / "transactions_labeled.csv"
    df.to_csv(output_path, index=False)
    print(f" Saved {len(df)} transactions to: {output_path}")
    return df


def generate_synthetic_monthly_profiles(num_profiles: int = 400) -> pd.DataFrame:
    """
    Generates structured monthly spending profiles with distinct behavioral archetypes
    for K-Means clustering experimentation and evaluation.
    """
    print(f"Generating {num_profiles} monthly spending profiles...")
    
    categories = [cat["name"] for cat in CATEGORIES]
    records = []
    
    # Archetypes define base proportional biases
    archetypes = [
        {
            "name": "Food & Dining Heavy",
            "weights": {
                "Food & Dining": 0.42, "Groceries": 0.20, "Transport": 0.10, "Shopping": 0.08,
                "Bills & Utilities": 0.10, "Entertainment": 0.05, "Healthcare": 0.02,
                "Education": 0.01, "Travel": 0.00, "Other": 0.02
            },
            "expenditure_range": (18000, 35000),
            "tx_count_range": (35, 70)
        },
        {
            "name": "Shopping & Discretionary Heavy",
            "weights": {
                "Food & Dining": 0.12, "Groceries": 0.10, "Transport": 0.08, "Shopping": 0.45,
                "Bills & Utilities": 0.08, "Entertainment": 0.12, "Healthcare": 0.01,
                "Education": 0.01, "Travel": 0.01, "Other": 0.02
            },
            "expenditure_range": (25000, 65000),
            "tx_count_range": (25, 55)
        },
        {
            "name": "Fixed Obligations & Essentials Heavy",
            "weights": {
                "Food & Dining": 0.10, "Groceries": 0.18, "Transport": 0.08, "Shopping": 0.05,
                "Bills & Utilities": 0.45, "Entertainment": 0.03, "Healthcare": 0.05,
                "Education": 0.03, "Travel": 0.00, "Other": 0.03
            },
            "expenditure_range": (20000, 48000),
            "tx_count_range": (15, 35)
        },
        {
            "name": "Travel & Commute Heavy",
            "weights": {
                "Food & Dining": 0.14, "Groceries": 0.08, "Transport": 0.20, "Shopping": 0.08,
                "Bills & Utilities": 0.08, "Entertainment": 0.04, "Healthcare": 0.01,
                "Education": 0.00, "Travel": 0.35, "Other": 0.02
            },
            "expenditure_range": (30000, 85000),
            "tx_count_range": (20, 50)
        },
        {
            "name": "Balanced Budgeter",
            "weights": {
                "Food & Dining": 0.18, "Groceries": 0.18, "Transport": 0.12, "Shopping": 0.12,
                "Bills & Utilities": 0.18, "Entertainment": 0.08, "Healthcare": 0.05,
                "Education": 0.04, "Travel": 0.02, "Other": 0.03
            },
            "expenditure_range": (15000, 40000),
            "tx_count_range": (25, 50)
        }
    ]
    
    profiles_per_archetype = num_profiles // len(archetypes)
    users = [f"user_{i:03d}" for i in range(1, 61)]
    months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]
    
    for archetype in archetypes:
        base_weights = archetype["weights"]
        min_exp, max_exp = archetype["expenditure_range"]
        min_tx, max_tx = archetype["tx_count_range"]
        
        for _ in range(profiles_per_archetype):
            # Add Dirichlet noise around base weights
            alpha = np.array([max(0.001, base_weights.get(c, 0.01) * 35.0) for c in categories])
            sampled_props = np.random.dirichlet(alpha)
            
            total_exp = round(float(np.random.uniform(min_exp, max_exp)), 2)
            tx_count = int(np.random.randint(min_tx, max_tx + 1))
            avg_amount = round(total_exp / max(1, tx_count), 2)
            
            row = {
                "profile_id": str(uuid.uuid4()),
                "user_id": random.choice(users),
                "period_month": random.choice(months),
                "ground_truth_archetype": archetype["name"],
                "total_expenditure": total_exp,
                "monthly_transaction_count": tx_count,
                "average_transaction_amount": avg_amount,
            }
            
            # Assign proportion columns
            for cat_name, prop in zip(categories, sampled_props):
                # Clean column name: prop_food_and_dining
                col_name = f"prop_{cat_name.lower().replace(' & ', '_').replace(' ', '_')}"
                row[col_name] = round(float(prop), 4)
                
            records.append(row)
            
    df = pd.DataFrame(records)
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    output_path = SYNTHETIC_DATA_DIR / "monthly_profiles.csv"
    df.to_csv(output_path, index=False)
    print(f" Saved {len(df)} monthly profiles to: {output_path}")
    return df


if __name__ == "__main__":
    tx_df = generate_synthetic_transactions(num_samples=3500)
    print("Transaction Category Distribution:")
    print(tx_df["category_name"].value_counts())
    
    prof_df = generate_synthetic_monthly_profiles(num_profiles=400)
    print("\nMonthly Profile Archetype Distribution:")
    print(prof_df["ground_truth_archetype"].value_counts())
    print("\nPhase 2 Synthetic Data Generation Complete!")
