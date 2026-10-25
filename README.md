# SpendSense

> **Smart Expense Analyzer & Spending Pattern Detector**  
> Full-Stack Web Application with Machine Learning | Semester-5 DWM Project

---

## Overview

**SpendSense** is an intelligent personal expense management and analytics platform combining supervised natural language processing, unsupervised behavioral clustering, statistical outlier detection, and modern consumer financial UX:

1. **Supervised Expense Categorization (NLP):** TF-IDF ($3,500$ unigrams & bigrams) + Multinomial Naive Bayes (MNB) achieving **100% accuracy and 1.0000 Macro F1** on held-out test data (evaluated against a **70.43% Decision Tree** baseline), suggesting expense categories from transaction descriptions and merchant metadata.
2. **Unsupervised Spending Profile Discovery (Clustering):** K-Means clustering ($K=5$, selected via Silhouette Analysis & Elbow Method) on 12-dimensional monthly spending vectors identifying behavioral financial archetypes:
   * *Balanced Budgeter*
   * *Dining & Essentials Heavy*
   * *Discretionary & Shopping Heavy*
   * *Fixed Obligations Heavy*
   * *Travel & Mobility Heavy*
3. **Interactive "What-If" Habit Simulator:** Live K-Means simulation sliders allowing users to experiment with lifestyle allocations and observe real-time archetype transitions with 1-tap presets (*Frugal Saver*, *Foodie Enthusiast*, *Shopaholic*, *Frequent Traveler*).
4. **Statistical Anomaly Detection:** Non-parametric Tukey’s Fences ($Q3 + 1.5 \times \text{IQR}$) per-user, per-category historical thresholds to flag unusually high spending spikes without rigid static caps.
5. **Consumer Financial Experience:**
   * **Dynamic Month & Year Picker:** Rolling 18-month selector with 1-click step navigation (`◀` / `▶`).
   * **Transaction Ledger:** Full search, category/date filtering, CSV statement import, and 1-click CSV export.
   * **Edit & Audit Transactions:** Seamless modal to edit descriptions, amounts, merchants, dates, and categories.
   * **Dashboard Budget Overrun Alerts:** Prominent alert banners when any category exceeds 100% limit.
   * **Profile & Account Security:** Name update, secure password change with bcrypt verification, and account statistics.

---

## Architecture & Technology Stack

* **Frontend:** React 19 + Vite 8 + Tailwind CSS + Recharts + Lucide Icons
* **Backend:** Node.js + Express.js + Prisma ORM + PostgreSQL 16 (Docker)
* **ML Microservice:** Python 3.12 + FastAPI + Scikit-Learn + Pandas + NumPy + Joblib
* **Documentation & Contracts:**
  * [`docs/api-specification.md`](docs/api-specification.md) — Complete REST API contract
  * [`docs/architecture.md`](docs/architecture.md) — System component architecture & diagrams
  * [`docs/model-evaluation.md`](docs/model-evaluation.md) — Rigorous ML benchmarks & confusion matrix

---

## Project Structure

```
smart_expense_analyzer/
├── frontend/             # React SPA (Vite, Tailwind, Recharts)
│   ├── src/
│   │   ├── components/   # Common, Layout, & Transaction Modals
│   │   ├── pages/        # Dashboard, Transactions, Budgets, Insights, Auth
│   │   └── services/     # Centralized API client & color palettes
├── backend/              # Node.js Express REST API & Prisma schema
│   ├── prisma/           # schema.prisma & seed.js
│   └── src/
│       ├── controllers/  # Transaction, Budget, Analytics, Auth controllers
│       ├── routes/       # Express route handlers
│       └── services/     # Internal ML gateway client & fallbacks
├── ml-service/           # Python FastAPI inference microservice
│   ├── data/             # Raw, processed, and synthetic transaction datasets
│   ├── models/           # Serialized .joblib artifacts & cluster metadata
│   ├── src/              # Preprocessing, training, and IQR anomaly scripts
│   ├── tests/            # Automated pytest test suites
│   ├── main.py           # FastAPI inference microservice entry point
│   └── requirements.txt  # Pinned ML dependencies
├── docker-compose.yml    # PostgreSQL container configuration
├── .env.example          # Environment variables blueprint
└── README.md
```

---

## Quickstart Guide

### 1. Database Setup (Docker PostgreSQL)
Ensure Docker Desktop is running, then launch the database container:
```powershell
# Start PostgreSQL container on port 5433
docker compose up -d postgres
```

### 2. Python ML Microservice Setup
Open a terminal for the ML inference service:
```powershell
cd ml-service

# Activate virtual environment
.\.venv\Scripts\activate   # Windows (or source .venv/bin/activate on Unix)

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run pytest test suite
pytest tests/

# Launch FastAPI microservice (port 8000)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
> **Health Check:** Open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) (`"status": "ok"`).  
> **Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Express Backend Setup
Open a second terminal for the Node.js REST API:
```powershell
cd backend

# Install dependencies
npm install

# Push Prisma schema to PostgreSQL
npx prisma generate
npx prisma db push

# Seed categories, demo user, budgets, and initial transactions
npm run prisma:seed

# Start Express development server (port 5001)
npm run dev
```
> **Health Check:** Open [http://localhost:5001/api/v1/health](http://localhost:5001/api/v1/health) (`"status": "healthy"`).

### 4. React Frontend Setup
Open a third terminal for the web application:
```powershell
cd frontend

# Install dependencies
npm install

# Launch Vite development server (port 5173)
npm run dev
```
> **Web Application:** Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Login Credentials

The seed script pre-populates the database with realistic sample transactions and budgets:
* **Email:** `atharv@example.com`
* **Password:** `password123`

---

## REST API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/v1/auth/me` | Fetch current user & account statistics |
| `PATCH` | `/api/v1/auth/profile` | Update profile name with token re-issuance |
| `POST` | `/api/v1/auth/change-password` | Change account password with bcrypt validation |
| `GET` | `/api/v1/transactions` | Query filtered, paginated transactions |
| `POST` | `/api/v1/transactions` | Record new transaction with ML auto-categorization |
| `PATCH` | `/api/v1/transactions/:id` | Update transaction & log active learning corrections |
| `DELETE`| `/api/v1/transactions/:id` | Remove transaction record |
| `POST` | `/api/v1/transactions/import` | Batch ingest CSV statement transactions |
| `GET` | `/api/v1/budgets` | Fetch monthly category budget utilization |
| `POST` | `/api/v1/budgets` | Upsert category budget limit |
| `GET` | `/api/v1/analytics/summary` | Aggregate monthly spend & daily trends |
| `GET` | `/api/v1/insights/spending-patterns` | Retrieve K-Means spending personality |
| `GET` | `/api/v1/insights/unusual-expenses` | Flag statistical outlier expenses via IQR |
| `POST` | `/api/v1/insights/simulate-profile` | Live "What-If" K-Means habit simulator |
| `GET` | `/api/v1/insights/model-metrics` | DWM model evaluation & active learning stats |

---

## Academic Evaluation Summary

* **Model A (Supervised Expense Categorization):**
  * **Multinomial Naive Bayes:** **100% Accuracy, 1.0000 Macro F1** on held-out test data.
  * **Decision Tree Baseline:** **70.43% Accuracy, 0.7337 Macro F1**.
  * **DWM Finding:** Naive Bayes significantly outperforms Decision Trees in high-dimensional sparse text feature spaces ($D=3,500$) due to independent conditional probability estimation.
* **Model B (Unsupervised Spending Profile Discovery):**
  * Selected $K=5$ clusters via Silhouette Analysis (Score: `0.2828`) and Elbow Method.
  * 12-dimensional feature space (10 category proportions + transaction count + average spend).
* **Statistical Anomaly Detection:**
  * Non-parametric Tukey’s upper fences ($Q3 + 1.5 \times \text{IQR}$) per user/category.
* **Full Evaluation Report:** See [`docs/model-evaluation.md`](docs/model-evaluation.md).
