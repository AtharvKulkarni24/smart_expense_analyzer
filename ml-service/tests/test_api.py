"""
Automated Integration and Endpoint Tests for SpendSense FastAPI Microservice.
"""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["classifier_loaded"] is True
    assert data["clustering_loaded"] is True


def test_predict_category_endpoint(client):
    payload = {
        "description": "Starbucks Caramel Frappuccino Coffee",
        "merchant": "Starbucks",
        "amount": 350.0,
    }
    response = client.post("/predict/category", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "Food & Dining"
    assert data["category_id"] == 1
    assert data["confidence"] > 0.75
    assert "Food & Dining" in data["scores"]
    assert data["model_version"] == "mnb-v1.0.0"


def test_cluster_profile_endpoint(client):
    payload = {
        "period_month": "2026-03",
        "total_expenditure": 28000.0,
        "monthly_transaction_count": 48,
        "average_transaction_amount": 583.33,
        "proportions": {
            "Food & Dining": 0.42,
            "Groceries": 0.22,
            "Transport": 0.08,
            "Shopping": 0.08,
            "Bills & Utilities": 0.10,
            "Entertainment": 0.05,
            "Healthcare": 0.02,
            "Education": 0.01,
            "Travel": 0.00,
            "Other": 0.02,
        },
    }
    response = client.post("/cluster/profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["cluster_id"], int)
    assert "Dining & Essentials Heavy" in data["profile_label"] or len(data["profile_label"]) > 0
    assert len(data["top_contributing_categories"]) >= 1
    assert data["model_version"] == "kmeans-v1.0.0"


def test_anomaly_evaluate_endpoint(client):
    payload = {
        "amount": 4200.0,
        "category": "Food & Dining",
        "history": [150.0, 180.0, 220.0, 280.0, 310.0, 350.0, 400.0],
    }
    response = client.post("/anomaly/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_anomaly"] is True
    assert data["severity"] in ["moderate", "high"]
    assert data["multiplier"] > 5.0
