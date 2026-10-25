"""
Statistical Anomaly Detection Engine for SpendSense.
Applies category-specific Interquartile Range (IQR) and Z-score statistical thresholds
to detect unusually high expenses without generating false alarms on cold starts.
"""
from typing import Dict, List, Optional
import numpy as np


class AnomalyDetector:
    """
    Evaluates individual and batch transactions against historical category spending.
    """

    def __init__(self, min_sample_size: int = 5, iqr_multiplier: float = 1.5):
        self.min_sample_size = min_sample_size
        self.iqr_multiplier = iqr_multiplier

    def evaluate_transaction(
        self,
        amount: float,
        category: str,
        history: List[float],
    ) -> Dict:
        """
        Evaluates whether a transaction amount is an unusual outlier compared to historical records.
        """
        clean_history = [float(x) for x in history if x is not None and not np.isnan(x) and x > 0]
        n_samples = len(clean_history)

        # Guardrail: Insufficient historical data
        if n_samples < self.min_sample_size:
            return {
                "is_anomaly": False,
                "severity": "normal",
                "reason": "insufficient_history",
                "sample_count": n_samples,
                "threshold": None,
                "historical_median": round(float(np.median(clean_history)), 2) if n_samples > 0 else None,
                "message": f"Insufficient historical data in {category} ({n_samples}/{self.min_sample_size} needed) to determine anomalies.",
            }

        q1 = float(np.percentile(clean_history, 25))
        q3 = float(np.percentile(clean_history, 75))
        median = float(np.median(clean_history))
        iqr = q3 - q1

        # Calculate threshold
        if iqr > 0:
            threshold = q3 + (self.iqr_multiplier * iqr)
            extreme_threshold = q3 + (3.0 * iqr)
        else:
            # Fallback to mean + 2.5 * std when IQR is 0 (e.g., fixed subscription costs)
            mean = float(np.mean(clean_history))
            std = float(np.std(clean_history))
            threshold = mean + (2.5 * std if std > 0 else 0.5 * mean)
            extreme_threshold = mean + (3.5 * std if std > 0 else 1.0 * mean)

        is_anomaly = amount > threshold

        if not is_anomaly:
            return {
                "is_anomaly": False,
                "severity": "normal",
                "amount": amount,
                "threshold": round(threshold, 2),
                "historical_median": round(median, 2),
                "sample_count": n_samples,
                "message": f"Amount is within typical spending range for {category}.",
            }

        severity = "high" if amount > extreme_threshold else "moderate"
        multiplier = round(amount / max(1.0, median), 1)

        message = (
            f"Unusually high for {category}: INR {amount:.2f} is {multiplier}x higher than your "
            f"typical transaction (median: INR {median:.2f}, typical upper limit: INR {threshold:.2f})."
        )

        return {
            "is_anomaly": True,
            "severity": severity,
            "amount": amount,
            "threshold": round(threshold, 2),
            "historical_median": round(median, 2),
            "multiplier": multiplier,
            "sample_count": n_samples,
            "message": message,
        }

    def detect_batch_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """
        Analyzes a collection of user transactions, groups by category,
        and identifies anomalies relative to each category's distribution.
        """
        # Group historical amounts by category
        category_amounts: Dict[str, List[float]] = {}
        for tx in transactions:
            cat = tx.get("category_name", "Other")
            amt = float(tx.get("amount", 0.0))
            if amt > 0:
                category_amounts.setdefault(cat, []).append(amt)

        flagged_anomalies = []
        for tx in transactions:
            cat = tx.get("category_name", "Other")
            amt = float(tx.get("amount", 0.0))
            history = category_amounts.get(cat, [])

            eval_res = self.evaluate_transaction(amount=amt, category=cat, history=history)
            if eval_res["is_anomaly"]:
                flagged_anomalies.append({
                    "transaction_id": tx.get("transaction_id") or tx.get("id"),
                    "description": tx.get("description"),
                    "category": cat,
                    "amount": amt,
                    "date": tx.get("transaction_date") or tx.get("date"),
                    "anomaly_details": eval_res,
                })

        return flagged_anomalies
