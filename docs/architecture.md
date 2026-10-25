# SpendSense: System Architecture & Technical Specification

**Project:** SpendSense – Smart Expense Analyzer & Spending Pattern Detector  
**Course:** Semester-5 Data Warehousing & Mining (DWM)  
**Architecture:** Layered Decoupled Microservice Architecture (Client-Gateway-Worker)  

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Layer1 ["Layer 1: Presentation (React SPA)"]
        UI_Dash["Dashboard (Recharts)"]
        UI_Trans["Transactions & CSV Upload"]
        UI_Budget["Budget Tracking"]
        UI_Auth["Authentication (JWT)"]
    end

    subgraph Layer2 ["Layer 2: API Gateway & Orchestration (Express.js)"]
        AuthMid["JWT Auth Middleware & Ownership Guards"]
        TransCtrl["Transaction & CSV Controller"]
        BudgetCtrl["Budget & Utilization Calculator"]
        AnalyticsCtrl["Monthly Aggregation & Rollup Engine"]
        MLClient["ML Service Client with Fallback"]
    end

    subgraph Layer3 ["Layer 3: Relational Persistence (PostgreSQL + Prisma)"]
        DB[("PostgreSQL Database")]
        Schema["6 Core Tables:
        - users
        - categories (1-10)
        - transactions
        - budgets
        - expense_predictions
        - spending_profiles"]
    end

    subgraph Layer4 ["Layer 4: Machine Learning Microservice (FastAPI + Python 3.12)"]
        FastAPIApp["FastAPI REST App (:8000)"]
        Classifier["TF-IDF + Multinomial Naive Bayes"]
        Clusterer["StandardScaler + K-Means (K=5)"]
        Anomaly["Statistical IQR Outlier Engine"]
    end

    UI_Dash <-->|HTTP REST /api/v1| AuthMid
    UI_Trans <-->|HTTP REST /api/v1| AuthMid
    UI_Budget <-->|HTTP REST /api/v1| AuthMid
    UI_Auth <-->|HTTP REST /api/v1| AuthMid

    AuthMid --> TransCtrl
    AuthMid --> BudgetCtrl
    AuthMid --> AnalyticsCtrl

    TransCtrl <-->|Prisma ORM| DB
    BudgetCtrl <-->|Prisma ORM| DB
    AnalyticsCtrl <-->|Prisma ORM| DB

    TransCtrl --> MLClient
    AnalyticsCtrl --> MLClient

    MLClient <-->|Internal HTTP /predict /cluster| FastAPIApp
    FastAPIApp --> Classifier
    FastAPIApp --> Clusterer
    FastAPIApp --> Anomaly
```

---

## 2. Core Architectural Principles

1. **Private ML Microservice:** The Python FastAPI service runs on an internal network (`localhost:8000`) and is **never exposed directly to public browsers**. All requests flow through Express for JWT validation and user tenancy verification.
2. **Resilience & Graceful Degradation:** If the Python ML microservice is unreachable or times out (>2000ms), Express activates an internal keyword heuristic fallback. User transaction creation never fails due to an ML service outage.
3. **Multi-Tenancy & Data Isolation:** Every database operation in Express enforces strict user ownership (`where: { userId: req.user.id }`), preventing cross-user data access.
4. **Precision Financial Math:** All monetary amounts are stored in PostgreSQL using `@db.Decimal(12, 2)` to eliminate floating-point rounding errors.
5. **Decoupled Training vs. Inference:** Model training runs offline via batch scripts (`train_classifier.py`, `train_clustering.py`), outputting immutable serialized `.joblib` artifacts loaded read-only into memory on FastAPI startup.
