"""
Unit Tests for SpendSense Statistical Anomaly Detection Engine.
"""
import pytest
from src.anomaly import AnomalyDetector


@pytest.fixture
def detector():
    return AnomalyDetector(min_sample_size=5, iqr_multiplier=1.5)


def test_normal_expense(detector):
    history = [150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0]
    result = detector.evaluate_transaction(amount=320.0, category="Food & Dining", history=history)
    
    assert result["is_anomaly"] is False
    assert result["severity"] == "normal"
    assert result["historical_median"] == 300.0


def test_high_anomaly_expense(detector):
    history = [150.0, 200.0, 220.0, 280.0, 310.0, 350.0, 400.0]
    # Q1=200, Q3=350, IQR=150, Upper Fence = 350 + 1.5*150 = 575
    # Amount 3500 is extreme
    result = detector.evaluate_transaction(amount=3500.0, category="Food & Dining", history=history)
    
    assert result["is_anomaly"] is True
    assert result["severity"] == "high"
    assert result["multiplier"] > 5.0
    assert "Unusually high for Food & Dining" in result["message"]


def test_insufficient_history_guardrail(detector):
    # Only 3 historical records (< min_sample_size 5)
    history = [120.0, 180.0, 220.0]
    result = detector.evaluate_transaction(amount=1500.0, category="Food & Dining", history=history)
    
    assert result["is_anomaly"] is False
    assert result["reason"] == "insufficient_history"
    assert result["sample_count"] == 3


def test_batch_anomaly_detection(detector):
    transactions = [
        {"id": "1", "description": "Coffee", "category_name": "Food & Dining", "amount": 180.0},
        {"id": "2", "description": "Lunch", "category_name": "Food & Dining", "amount": 250.0},
        {"id": "3", "description": "Snacks", "category_name": "Food & Dining", "amount": 220.0},
        {"id": "4", "description": "Dinner", "category_name": "Food & Dining", "amount": 350.0},
        {"id": "5", "description": "Breakfast", "category_name": "Food & Dining", "amount": 150.0},
        {"id": "6", "description": "Buffet", "category_name": "Food & Dining", "amount": 400.0},
        {"id": "7", "description": "Luxury Banquet", "category_name": "Food & Dining", "amount": 6800.0}, # Outlier!
    ]
    
    anomalies = detector.detect_batch_anomalies(transactions)
    assert len(anomalies) == 1
    assert anomalies[0]["transaction_id"] == "7"
    assert anomalies[0]["amount"] == 6800.0
