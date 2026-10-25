# SpendSense: Machine Learning Model Evaluation Report

**Project:** SpendSense – Smart Expense Analyzer & Spending Pattern Detector  
**Course/Domain:** Data Warehousing & Mining (DWM) / Applied Machine Learning  
**Date:** October 2026  
**Status:** Evaluated and Serialized  

---

## 1. Overview & Dataset Provenance

SpendSense incorporates two core machine learning components alongside a statistical anomaly detection engine:
1. **Model A (Supervised Text Classification):** Multinomial Naive Bayes evaluated against a Decision Tree baseline to predict transaction expense categories from descriptions and merchant metadata.
2. **Model B (Unsupervised Clustering):** K-Means clustering applied to aggregated monthly user expenditure vectors to discover behavioral spending archetypes.
3. **Statistical Anomaly Detection:** Interquartile Range (IQR) upper-fence statistical outlier detection with cold-start guardrails.

### Dataset Composition
* **Total Labeled Transactions:** 3,500 records.
* **Category Coverage:** 10 agreed taxonomy classes (350 records per class, balanced).
* **Train / Test Split:** Stratified 80% Training ($N = 2,800$), 20% Held-Out Test ($N = 700$). The test partition was kept completely separate and never used during vocabulary fitting or hyperparameter tuning.
* **Monthly Spending Profiles:** 400 user-month feature vectors spanning 5 behavioral archetypes across 6 calendar months.

---

## 2. Supervised Expense Categorization (Model A)

### 2.1 Feature Engineering & Vectorization
* **Preprocessing:** Case-folding, noise punctuation removal (`*`, `#`, `-`, `_`, `/`), isolated transaction digits and store code filtering, and merchant prefix fusion (`merchant + " " + description`).
* **Vectorization:** `TfidfVectorizer(ngram_range=(1, 2), max_features=3500, sublinear_tf=True)`.

### 2.2 Model Architectures Compared
* **Primary Model:** `MultinomialNB(alpha=0.5)` with Laplace smoothing.
* **Baseline Comparison:** `DecisionTreeClassifier(max_depth=20, min_samples_split=5, random_state=42)`.

### 2.3 Experimental Comparison Results on Held-out Test Set ($N = 700$)

| Model Architecture | Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Weighted F1-Score |
|---|---|---|---|---|---|
| **Multinomial Naive Bayes (Primary)** | **100.00%** | **1.0000** | **1.0000** | **1.0000** | **1.0000** |
| **Decision Tree (Baseline)** | **70.43%** | **0.7412** | **0.7043** | **0.7337** | **0.7337** |

#### Why Naive Bayes Outperformed the Decision Tree
1. **High Dimensional Sparsity:** TF-IDF unigram and bigram feature spaces are sparse and high-dimensional ($D = 3,500$). Decision trees partition one feature at a time along orthogonal axes, making them prone to suboptimal greedy splits and high variance when features are sparse.
2. **Independence Assumption Fit:** Although words in a phrase exhibit dependencies, Naive Bayes' conditional independence assumption ($P(d|c) = \prod P(w_i|c)$) produces optimal ranking decisions and calibrated probability margins when vocabulary indicators are distinct.
3. **Inference Latency:** Multinomial Naive Bayes requires only dot-product operations on log probabilities, yielding an inference latency under **4 milliseconds** per transaction.

### 2.4 Per-Class Classification Report (Multinomial Naive Bayes)

| Category | Precision | Recall | F1-Score | Support (Held-Out Test) |
|---|---|---|---|---|
| **Food & Dining** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Groceries** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Transport** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Shopping** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Bills & Utilities** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Entertainment** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Healthcare** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Education** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Travel** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Other** | 1.0000 | 1.0000 | 1.0000 | 70 |
| **Overall Macro Avg** | **1.0000** | **1.0000** | **1.0000** | **700** |

---

## 3. Unsupervised Spending Pattern Clustering (Model B)

### 3.1 Feature Vector Formulation
Each user-month profile is transformed into a 12-dimensional continuous feature vector:
$$\mathbf{x} = [p_{\text{food}}, p_{\text{groc}}, p_{\text{trans}}, p_{\text{shop}}, p_{\text{bills}}, p_{\text{ent}}, p_{\text{health}}, p_{\text{edu}}, p_{\text{travel}}, p_{\text{other}}, C_{\text{tx}}, \bar{A}_{\text{tx}}]$$
where $\sum_{i=1}^{10} p_i = 1.0$, $C_{\text{tx}}$ is the monthly transaction count, and $\bar{A}_{\text{tx}}$ is the average transaction amount. All features are standardized using `StandardScaler` prior to distance computation.

### 3.2 Evaluation of Candidate Cluster Counts ($K \in [2, 7]$)

| Candidate $K$ | Inertia (Elbow Criterion) | Silhouette Score | Qualitative Assessment |
|---|---|---|---|
| $K = 2$ | 3911.92 | 0.1954 | Under-segmented (aggregates all non-essentials together) |
| $K = 3$ | 3198.66 | 0.2390 | Broad clusters; loses distinction between shopping and travel |
| $K = 4$ | 2555.75 | 0.2863 | High silhouette score; groups dining and grocery profiles |
| **$K = 5$ (Selected)** | **2278.58** | **0.2828** | **Optimal balance of silhouette separation and business interpretability** |
| $K = 6$ | 2156.18 | 0.2678 | Overfitting; fragments balanced profiles into artificial splits |
| $K = 7$ | 2046.06 | 0.2764 | Diminishing returns with redundant centroids |

### 3.3 Centroid Analysis & Discovered Archetypes ($K = 5$)

| Cluster ID | Interpreted Archetype Label | Top Contributing Categories | Avg Monthly Count | Avg Transaction Amount | Centroid Behavioral Summary |
|---|---|---|---|---|---|
| **0** | **Travel & Mobility Heavy** | Travel (34.6%), Transport (20.2%) | 35.3 tx | ₹1,736.72 | Significant expenditure on intercity transport, flights, and rides. |
| **1** | **Dining & Essentials Heavy** | Food & Dining (39.9%), Groceries (21.8%) | 51.9 tx | ₹546.60 | High frequency of restaurant visits, takeout, and grocery refills. |
| **2** | **Balanced Budgeter** | Bills (18.1%), Groceries (17.9%) | 36.8 tx | ₹797.49 | Evenly distributed spending across essentials with low variance. |
| **3** | **Fixed Obligations Heavy** | Bills & Utilities (45.5%), Groceries (18.0%) | 24.6 tx | ₹1,401.46 | Dominated by household utilities, recurring bills, and rent. |
| **4** | **Discretionary & Shopping Heavy** | Shopping (44.0%), Food & Dining (13.3%) | 37.8 tx | ₹1,295.73 | High allocation to retail apparel, electronics, and goods. |

---

## 4. Statistical Anomaly Detection Engine

Rather than claiming production fraud detection, SpendSense applies a statistically sound, category-specific Interquartile Range (IQR) fence:
$$\text{Threshold} = Q_3 + 1.5 \times \text{IQR} \quad \text{where} \quad \text{IQR} = Q_3 - Q_1$$

### Critical Safety Guardrails
1. **Cold-Start Sample Floor ($N < 5$):** If a user has fewer than 5 recorded transactions in a category, the anomaly detector suppresses alerts and returns `is_anomaly: false` with reason `"insufficient_history"` to avoid false positives.
2. **Zero-Variance Fallback:** For fixed expenses with identical amounts (e.g., streaming subscriptions where $Q_1 = Q_3$), the engine falls back to $\mu + 2.5\sigma$.
3. **Severity Grading:**
   * **Moderate Outlier:** $\text{Amount} > Q_3 + 1.5 \times \text{IQR}$
   * **High Outlier:** $\text{Amount} > Q_3 + 3.0 \times \text{IQR}$

---

## 5. Documented Assumptions & Educational Limitations

1. **Synthetic Data vs. Real-World Variance:** The evaluation metrics reflect performance on carefully generated synthetic transactions with simulated bank formatting. In uncontrolled production environments with arbitrary merchant prefixes or foreign currencies, Naive Bayes accuracy is expected to normalize between 85% and 92%.
2. **User-in-the-Loop Feedback:** Because machine learning suggestions are probabilistic, the application logs user corrections in `expense_predictions.accepted_category_id` to evaluate real-world concept drift over time.
3. **Educational Scope:** Outputs are presented as **personal financial analytics suggestions**, not certified accounting, credit underwriting, or fraud prevention advice.
