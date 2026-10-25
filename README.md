# SpendSense

> **Smart Expense Analyzer & Spending Pattern Detector**  
> Full-Stack Web Application with Machine Learning | Semester-5 DWM Project

---

## Overview

**SpendSense** is a machine-learning-powered personal expense management and analytics platform that combines:
1. **Supervised Expense Categorization:** TF-IDF + Multinomial Naive Bayes (evaluated against a Decision Tree baseline) suggesting expense categories from transaction descriptions and merchant metadata.
2. **Unsupervised Spending Profile Discovery:** K-Means clustering ($K=5$) on monthly category proportion vectors identifying behavioral spending archetypes (e.g., *Dining & Essentials Heavy*, *Discretionary & Shopping Heavy*, *Fixed Obligations Heavy*, *Travel & Mobility Heavy*, *Balanced Budgeter*).
3. **Statistical Anomaly Detection:** Interquartile Range (IQR) upper-fence thresholds to highlight unusually high expenses relative to personal category spending history.
4. **Interactive Analytics Dashboard:** Real-time budget tracking, category breakdowns, and monthly spending comparisons.

---

## Architecture & Technology Stack

* **Frontend:** React + Vite + Tailwind CSS + Recharts
* **Backend:** Node.js + Express.js + Prisma ORM + PostgreSQL
* **ML Service:** Python 3.12 + FastAPI + Scikit-Learn + Pandas + NumPy + Joblib
* **API Specification:** [`docs/api-specification.md`](docs/api-specification.md)
* **System Architecture:** [`docs/architecture.md`](docs/architecture.md)
* **Model Evaluation Report:** [`docs/model-evaluation.md`](docs/model-evaluation.md)

---

## Project Structure

```
smart_expense_analyzer/
├── frontend/             # React SPA (Vite, Tailwind, Recharts)
├── backend/              # Node.js Express REST API & Prisma schema
├── ml-service/           # Python FastAPI inference microservice
│   ├── data/             # Raw, processed, and synthetic datasets
│   ├── models/           # Serialized .joblib artifacts & metadata
│   ├── src/              # Preprocessing, training, and anomaly scripts
│   ├── tests/            # Automated pytest test suites
│   ├── main.py           # FastAPI application entry point
│   └── requirements.txt  # Pinned ML dependencies
├── docs/                 # Single-source-of-truth technical contracts
│   ├── api-specification.md
│   ├── architecture.md
│   └── model-evaluation.md
├── .gitignore
├── .env.example
└── README.md
```

---

## Quickstart Guide

### 1. Python ML Service Setup
```bash
cd ml-service
# Activate virtual environment
.venv\Scripts\activate   # Windows (or source .venv/bin/activate on Unix)

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/

# Launch FastAPI microservice (port 8000)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Express Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### 3. React Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Academic Evaluation Summary

* **Model A (Expense Categorization):**
  * **Multinomial Naive Bayes:** **100% Accuracy, 1.0000 Macro F1** on held-out test data.
  * **Decision Tree Baseline:** **70.43% Accuracy, 0.7337 Macro F1**.
* **Model B (Spending Pattern Clustering):**
  * Selected $K=5$ clusters via Silhouette Analysis (Score: `0.2828`).
  * Centroids map dynamically to 5 interpretable spending archetypes.
* **Full Report:** See [`docs/model-evaluation.md`](docs/model-evaluation.md).
