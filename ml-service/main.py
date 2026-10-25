"""
SpendSense Machine Learning Microservice.
Exposes FastAPI REST endpoints for:
1. Category Prediction (TF-IDF + Multinomial Naive Bayes)
2. Monthly Spending Profile Clustering (K-Means)
3. Statistical Anomaly Detection (IQR Upper Fence)
"""
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.anomaly import AnomalyDetector
from src.config import (
    CATEGORY_ID_TO_NAME,
    CATEGORY_NAME_TO_ID,
    CLASSIFIER_METADATA_PATH,
    CLASSIFIER_MODEL_PATH,
    KMEANS_METADATA_PATH,
    KMEANS_MODEL_PATH,
)
from src.preprocessing import prepare_transaction_text

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("spendsense_ml")

# Global model state
models = {}
anomaly_detector = AnomalyDetector(min_sample_size=5, iqr_multiplier=1.5)

# Proportion column ordering expected by K-Means model
PROPORTION_KEYS = [
    ("prop_food_dining", ["Food & Dining", "food & dining", "food_and_dining"]),
    ("prop_groceries", ["Groceries", "groceries"]),
    ("prop_transport", ["Transport", "transport"]),
    ("prop_shopping", ["Shopping", "shopping"]),
    ("prop_bills_utilities", ["Bills & Utilities", "bills & utilities", "bills_and_utilities"]),
    ("prop_entertainment", ["Entertainment", "entertainment"]),
    ("prop_healthcare", ["Healthcare", "healthcare"]),
    ("prop_education", ["Education", "education"]),
    ("prop_travel", ["Travel", "travel"]),
    ("prop_other", ["Other", "other"]),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Loads machine learning models and metadata into memory once during startup.
    """
    logger.info("Initializing SpendSense ML Microservice...")

    # Load Classifier
    if CLASSIFIER_MODEL_PATH.exists():
        logger.info(f"Loading classifier model from {CLASSIFIER_MODEL_PATH}...")
        models["classifier"] = joblib.load(CLASSIFIER_MODEL_PATH)
        if CLASSIFIER_METADATA_PATH.exists():
            with open(CLASSIFIER_METADATA_PATH, "r") as f:
                models["classifier_metadata"] = json.load(f)
    else:
        logger.warning(f"Classifier model artifact not found at {CLASSIFIER_MODEL_PATH}")

    # Load K-Means
    if KMEANS_MODEL_PATH.exists():
        logger.info(f"Loading K-Means clustering model from {KMEANS_MODEL_PATH}...")
        models["kmeans"] = joblib.load(KMEANS_MODEL_PATH)
        if KMEANS_METADATA_PATH.exists():
            with open(KMEANS_METADATA_PATH, "r") as f:
                models["kmeans_metadata"] = json.load(f)
    else:
        logger.warning(f"K-Means model artifact not found at {KMEANS_MODEL_PATH}")

    yield

    logger.info("Shutting down SpendSense ML Microservice.")
    models.clear()


app = FastAPI(
    title="SpendSense ML Service",
    description="Internal machine learning inference microservice for SpendSense expense analyzer.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for internal Node.js backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------
# Request & Response Schemas
# -------------------------------------------------------------
class CategoryPredictRequest(BaseModel):
    description: str = Field(..., examples=["Starbucks Caramel Frappuccino Coffee"])
    merchant: Optional[str] = Field(None, examples=["Starbucks"])
    amount: Optional[float] = Field(None, examples=[350.0])


class CategoryPredictResponse(BaseModel):
    predicted_category: str = Field(..., examples=["Food & Dining"])
    category_id: int = Field(..., examples=[1])
    confidence: float = Field(..., examples=[0.942])
    scores: Dict[str, float]
    model_version: str = Field(..., examples=["mnb-v1.0.0"])


class ClusterProfileRequest(BaseModel):
    period_month: str = Field(..., examples=["2026-03"])
    total_expenditure: float = Field(..., examples=[24500.0])
    monthly_transaction_count: int = Field(..., examples=[38])
    average_transaction_amount: Optional[float] = Field(None, examples=[644.74])
    proportions: Dict[str, float] = Field(
        ...,
        examples=[{
            "Food & Dining": 0.35,
            "Groceries": 0.20,
            "Transport": 0.10,
            "Shopping": 0.15,
            "Bills & Utilities": 0.12,
            "Entertainment": 0.05,
            "Healthcare": 0.01,
            "Education": 0.00,
            "Travel": 0.00,
            "Other": 0.02,
        }],
    )


class ClusterProfileResponse(BaseModel):
    cluster_id: int = Field(..., examples=[1])
    profile_label: str = Field(..., examples=["Dining & Essentials Heavy"])
    summary: str = Field(..., examples=["35% allocated to Food & Dining..."])
    top_contributing_categories: List[str]
    model_version: str = Field(..., examples=["kmeans-v1.0.0"])


class AnomalyCheckRequest(BaseModel):
    amount: float = Field(..., examples=[3500.0])
    category: str = Field(..., examples=["Food & Dining"])
    history: List[float] = Field(..., examples=[[180.0, 220.0, 250.0, 300.0, 350.0, 400.0]])


class AnomalyCheckResponse(BaseModel):
    is_anomaly: bool
    severity: str
    amount: Optional[float] = None
    threshold: Optional[float] = None
    historical_median: Optional[float] = None
    multiplier: Optional[float] = None
    sample_count: int
    message: str


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Health check verifying service readiness and loaded model artifacts.
    """
    return {
        "status": "ok",
        "classifier_loaded": "classifier" in models,
        "clustering_loaded": "kmeans" in models,
        "version": "1.0.0",
    }


@app.post("/predict/category", response_model=CategoryPredictResponse, status_code=status.HTTP_200_OK)
def predict_category(payload: CategoryPredictRequest):
    """
    Predicts the expense category for a transaction description using TF-IDF + Multinomial Naive Bayes.
    """
    clf = models.get("classifier")
    if not clf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Classifier model is not loaded or unavailable.",
        )

    clean_text = prepare_transaction_text(payload.description, payload.merchant)
    if not clean_text:
        return CategoryPredictResponse(
            predicted_category="Other",
            category_id=10,
            confidence=0.50,
            scores={"Other": 1.0},
            model_version="mnb-v1.0.0",
        )

    # Predict class and probability scores
    predicted_label = clf.predict([clean_text])[0]
    probabilities = clf.predict_proba([clean_text])[0]
    class_labels = clf.classes_

    scores = {label: round(float(prob), 4) for label, prob in zip(class_labels, probabilities)}
    confidence = round(float(np.max(probabilities)), 4)
    cat_id = CATEGORY_NAME_TO_ID.get(predicted_label, 10)

    version = models.get("classifier_metadata", {}).get("model_version", "mnb-v1.0.0")

    return CategoryPredictResponse(
        predicted_category=predicted_label,
        category_id=cat_id,
        confidence=confidence,
        scores=scores,
        model_version=version,
    )


@app.post("/cluster/profile", response_model=ClusterProfileResponse, status_code=status.HTTP_200_OK)
def cluster_profile(payload: ClusterProfileRequest):
    """
    Assigns a monthly user spending profile to a K-Means cluster and returns an interpreted archetype.
    """
    kmeans_pipeline = models.get("kmeans")
    if not kmeans_pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="K-Means clustering model is not loaded or unavailable.",
        )

    props_dict = payload.proportions or {}

    # Map incoming proportion dict to ordered 10-dimensional vector
    prop_vector = []
    for col_name, aliases in PROPORTION_KEYS:
        val = 0.0
        if col_name in props_dict:
            val = props_dict[col_name]
        else:
            for alias in aliases:
                if alias in props_dict:
                    val = props_dict[alias]
                    break
        prop_vector.append(float(val))

    # Calculate average amount if not supplied
    avg_amt = payload.average_transaction_amount
    if avg_amt is None or avg_amt <= 0:
        avg_amt = round(payload.total_expenditure / max(1, payload.monthly_transaction_count), 2)

    feature_vector = prop_vector + [float(payload.monthly_transaction_count), float(avg_amt)]

    # Infer cluster
    assigned_cluster = int(kmeans_pipeline.predict([feature_vector])[0])

    # Fetch cluster centroid profile interpretation
    metadata = models.get("kmeans_metadata", {})
    profiles = metadata.get("cluster_profiles", {})
    cluster_info = profiles.get(str(assigned_cluster), {})

    profile_label = cluster_info.get("label", f"Cluster {assigned_cluster} Spender")
    summary = cluster_info.get("summary", "Monthly spending profile derived via K-Means clustering.")
    top_categories = cluster_info.get("top_categories", ["Essentials"])
    version = metadata.get("model_version", "kmeans-v1.0.0")

    return ClusterProfileResponse(
        cluster_id=assigned_cluster,
        profile_label=profile_label,
        summary=summary,
        top_contributing_categories=top_categories,
        model_version=version,
    )


@app.post("/anomaly/evaluate", response_model=AnomalyCheckResponse, status_code=status.HTTP_200_OK)
def evaluate_anomaly(payload: AnomalyCheckRequest):
    """
    Checks if a transaction amount is an unusual outlier relative to the user's category history.
    """
    result = anomaly_detector.evaluate_transaction(
        amount=payload.amount,
        category=payload.category,
        history=payload.history,
    )
    return AnomalyCheckResponse(**result)
