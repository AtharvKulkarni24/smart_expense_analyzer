# SpendSense: Shared API Specification & Database Contract

This document is the **single source of truth** for both **Member 1 (Full-Stack)** and **Member 2 (ML & Data)**.  
Any changes to schemas, column names, endpoint URLs, or JSON keys must be agreed upon by both members and updated here first.

---

## 1. Fixed Category Taxonomy

Both the Node.js backend database and the Python ML classification model **MUST** use these exact 10 category names and IDs:

| ID | Exact Category Name | Description / Example Merchants |
|---|---|---|
| **1** | `Food & Dining` | Restaurants, cafes, Zomato, Swiggy, Starbucks, McDonald's |
| **2** | `Groceries` | Supermarkets, Blinkit, Zepto, Walmart, milk, produce |
| **3** | `Transport` | Uber, Ola, petrol, diesel, metro, bus, parking, tolls |
| **4** | `Shopping` | Amazon, Flipkart, clothing, Zara, electronics, shoes |
| **5** | `Bills & Utilities` | Electricity, water, Wi-Fi, mobile recharge, rent, gas |
| **6** | `Entertainment` | Netflix, Spotify, movies, cinema, gaming, events |
| **7** | `Healthcare` | Pharmacy, doctor visits, hospital, medicine, dental |
| **8** | `Education` | Tuition, books, courses, Udemy, Coursera, college fees |
| **9** | `Travel` | Flights, hotels, Airbnb, train tickets, vacation |
| **10** | `Other` | Miscellaneous, cash withdrawals, uncategorized |

---

## 2. Common Database Schema (PostgreSQL + Prisma)

Both members must adhere to these exact table names, field names, and data types.

### 2.1 Table: `users`
* `id`: `String` (UUID, Primary Key)
* `name`: `String` (User display name)
* `email`: `String` (Unique)
* `password_hash`: `String` (Bcrypt hash)
* `created_at`: `DateTime` (Default: `now()`)

### 2.2 Table: `categories`
* `id`: `Int` (Autoincrement Primary Key, 1 to 10)
* `name`: `String` (Unique, from taxonomy above)
* `is_default`: `Boolean` (Default: `true`)

### 2.3 Table: `transactions`
* `id`: `String` (UUID, Primary Key)
* `user_id`: `String` (FK -> `users.id`, Cascade Delete)
* `amount`: `Decimal(12, 2)` (Never float!)
* `currency`: `String` (Default: `"INR"`)
* `description`: `String` (Raw description, e.g. "Starbucks Coffee")
* `merchant`: `String?` (Optional merchant name)
* `category_id`: `Int` (FK -> `categories.id`)
* `transaction_date`: `DateTime`
* `source`: `String` (`"manual"`, `"csv"`, or `"synthetic"`)
* `created_at`: `DateTime` (Default: `now()`)
* **Indexes:** `[user_id, transaction_date]`, `[user_id, category_id]`

### 2.4 Table: `budgets`
* `id`: `String` (UUID, Primary Key)
* `user_id`: `String` (FK -> `users.id`, Cascade Delete)
* `category_id`: `Int` (FK -> `categories.id`)
* `month`: `String` (Format: `"YYYY-MM"`, e.g. `"2026-03"`)
* `limit_amount`: `Decimal(12, 2)`
* `currency`: `String` (Default: `"INR"`)
* `created_at`: `DateTime` (Default: `now()`)
* **Unique Constraint:** `@@unique([user_id, category_id, month])`

### 2.5 Table: `expense_predictions`
* `id`: `String` (UUID, Primary Key)
* `transaction_id`: `String` (Unique, FK -> `transactions.id`, Cascade Delete)
* `predicted_category_id`: `Int` (FK -> `categories.id`)
* `model_version`: `String` (e.g. `"mnb-v1.0.0"`)
* `scores_json`: `Json` (Class probabilities dictionary)
* `accepted_category_id`: `Int?` (FK -> `categories.id`, tracks user correction)
* `created_at`: `DateTime` (Default: `now()`)

### 2.6 Table: `spending_profiles`
* `id`: `String` (UUID, Primary Key)
* `user_id`: `String` (FK -> `users.id`, Cascade Delete)
* `period_month`: `String` (Format: `"YYYY-MM"`)
* `cluster_id`: `Int` (K-Means assigned cluster number)
* `profile_label`: `String` (e.g. `"Food & Dining Heavy"`, `"Balanced Budgeter"`)
* `model_version`: `String` (e.g. `"kmeans-v1.0.0"`)
* `created_at`: `DateTime` (Default: `now()`)
* **Unique Constraint:** `@@unique([user_id, period_month])`

---

## 3. Internal ML Microservice Contract (FastAPI ⇄ Express)

* **Host:** `http://localhost:8000` (Private, internal network only)
* **Express ML Client:** `backend/src/services/mlService.js`
* **FastAPI App:** `ml-service/main.py`

### 3.1 Health Check
* **Method & Path:** `GET /health`
* **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "classifier_loaded": true,
    "clustering_loaded": true,
    "version": "1.0.0"
  }
  ```

### 3.2 Category Prediction Endpoint
* **Method & Path:** `POST /predict/category`
* **Request Payload (JSON):**
  ```json
  {
    "description": "Starbucks Caramel Frappuccino",
    "merchant": "Starbucks",
    "amount": 350.00
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "predicted_category": "Food & Dining",
    "category_id": 1,
    "confidence": 0.94,
    "scores": {
      "Food & Dining": 0.94,
      "Groceries": 0.03,
      "Transport": 0.01,
      "Shopping": 0.01,
      "Bills & Utilities": 0.00,
      "Entertainment": 0.01,
      "Healthcare": 0.00,
      "Education": 0.00,
      "Travel": 0.00,
      "Other": 0.00
    },
    "model_version": "mnb-v1.0.0"
  }
  ```

### 3.3 Spending Profile Clustering Endpoint
* **Method & Path:** `POST /cluster/profile`
* **Request Payload (JSON):**
  ```json
  {
    "period_month": "2026-03",
    "total_expenditure": 24500.00,
    "monthly_transaction_count": 38,
    "average_transaction_amount": 644.74,
    "proportions": {
      "Food & Dining": 0.35,
      "Groceries": 0.20,
      "Transport": 0.10,
      "Shopping": 0.15,
      "Bills & Utilities": 0.12,
      "Entertainment": 0.05,
      "Healthcare": 0.01,
      "Education": 0.00,
      "Travel": 0.00,
      "Other": 0.02
    }
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "cluster_id": 2,
    "profile_label": "Dining & Essentials Heavy",
    "summary": "35% of monthly spending allocated to Food & Dining, 20% to Groceries. Discretionary spending remains controlled.",
    "top_contributing_categories": ["Food & Dining", "Groceries"],
    "model_version": "kmeans-v1.0.0"
  }
  ```

---

## 4. Public Express API Contract (React Frontend ⇄ Express Backend)

All endpoints are prefixed with `/api/v1`.  
All protected endpoints require header: `Authorization: Bearer <JWT_TOKEN>`.

### Standard Response Envelope
```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

### 4.1 Authentication Endpoints
* `POST /api/v1/auth/register`
  * Body: `{ "name": "Atharv", "email": "atharv@example.com", "password": "password123" }`
  * Returns: `{ "user": { "id", "name", "email" }, "token": "jwt..." }`
* `POST /api/v1/auth/login`
  * Body: `{ "email": "atharv@example.com", "password": "password123" }`
  * Returns: `{ "user": { "id", "name", "email" }, "token": "jwt..." }`
* `GET /api/v1/auth/me`
  * Returns logged-in user profile.

### 4.2 Transaction Endpoints
* `GET /api/v1/transactions`
  * Query parameters: `page`, `limit`, `categoryId`, `startDate`, `endDate`, `minAmount`, `maxAmount`, `search`, `sortBy`, `order`
  * Returns: `{ transactions: [...], pagination: { total, page, limit, totalPages } }`
* `POST /api/v1/transactions`
  * Body: `{ "amount": 250, "description": "Dominos Pizza", "merchant": "Dominos", "transactionDate": "2026-03-15", "categoryId": 1 }`
  * If `categoryId` is omitted, Express automatically calls ML `/predict/category` to assign it!
* `PATCH /api/v1/transactions/:id`
  * Updates any field with user ownership check.
* `DELETE /api/v1/transactions/:id`
  * Deletes transaction with user ownership check.
* `POST /api/v1/transactions/import`
  * `multipart/form-data` with `file: <CSV file>`.
  * Returns: `{ importedCount: 80, rejectedCount: 2, rejectedRows: [{ row: 14, reason: "Invalid amount" }] }`

### 4.3 Budget Endpoints
* `GET /api/v1/budgets?month=2026-03`
  * Returns all category budgets for the user with calculated `actualSpent`, `remaining`, and `utilizationPercentage`.
* `POST /api/v1/budgets`
  * Body: `{ "categoryId": 1, "month": "2026-03", "limitAmount": 5000 }`
  * Upserts the budget limit for `(user, category, month)`.

### 4.4 Analytics & Insights Endpoints
* `GET /api/v1/analytics/summary?month=2026-03`
  * Returns: `totalSpent`, `transactionCount`, `averageTransaction`, `categoryBreakdown: [{ categoryId, name, amount, percentage }]`
* `GET /api/v1/insights/spending-patterns?month=2026-03`
  * Returns K-Means cluster assignment and human-readable profile badge.
* `GET /api/v1/insights/unusual-expenses?month=2026-03`
  * Returns transactions flagged by the statistical anomaly detector ($> Q_3 + 1.5 \times \text{IQR}$ or $> \mu + 2.5\sigma$).

---

## 5. Fallback & Resilience Rules (No Deadlocks)

1. **If FastAPI ML Service is not running or takes > 2000ms:**
   - Express **does not crash or return a 500 error** to the user.
   - `mlService.js` automatically uses a keyword-based rule fallback to suggest a category.
   - Transaction is saved with model version `"fallback-heuristic-v1.0"`.
2. **If user corrects a predicted category:**
   - `transactions.category_id` is updated to the user's selected category.
   - `expense_predictions.accepted_category_id` records the corrected category (used to benchmark real-world model accuracy).
