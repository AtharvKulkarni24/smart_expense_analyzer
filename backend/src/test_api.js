const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';

async function runTests() {
  console.log('🧪 Starting SpendSense Backend API Verification Tests...\n');
  let token = '';

  try {
    // 1. Health Check
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 1. GET /health:', health.data.status);

    // 2. Auth Login
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'atharv@example.com',
      password: 'password123',
    });
    token = login.data.data.token;
    console.log('✅ 2. POST /auth/login: Success, JWT Token acquired for', login.data.data.user.name);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 3. Category Suggestion (ML Heuristic / FastAPI client)
    const suggest = await axios.get(`${BASE_URL}/categories/suggest?q=Zomato Chicken Biryani`);
    console.log(`✅ 3. GET /categories/suggest?q=Zomato: Category -> "${suggest.data.data.categoryName}" (${Math.round(suggest.data.data.confidence * 100)}% confidence)`);

    // 4. Get Transactions
    const txList = await axios.get(`${BASE_URL}/transactions?limit=5`, authHeaders);
    console.log(`✅ 4. GET /transactions: Retrieved ${txList.data.data.transactions.length} rows (Total in DB: ${txList.data.data.pagination.totalRecords})`);

    // 5. Add Transaction with Auto-ML Categorization
    const newTx = await axios.post(`${BASE_URL}/transactions`, {
      description: 'Uber Ride to Tech Park',
      amount: 320.00,
      merchant: 'Uber',
      transactionDate: '2026-03-25',
    }, authHeaders);
    console.log(`✅ 5. POST /transactions: Recorded "${newTx.data.data.description}" -> Auto-categorized as "${newTx.data.data.category.name}"`);

    // 6. Budgets
    const budgets = await axios.get(`${BASE_URL}/budgets?month=2026-03`, authHeaders);
    console.log(`✅ 6. GET /budgets: Overall Utilization = ${budgets.data.data.overallUtilization}% (Spent: ₹${budgets.data.data.totalSpent} / Budget: ₹${budgets.data.data.totalBudget})`);

    // 7. Analytics Summary
    const summary = await axios.get(`${BASE_URL}/analytics/summary?month=2026-03`, authHeaders);
    console.log(`✅ 7. GET /analytics/summary: Total Spend = ₹${summary.data.data.totalExpenditure}, Categories with spend = ${summary.data.data.categoryBreakdown.length}`);

    // 8. K-Means Spending Persona
    const patterns = await axios.get(`${BASE_URL}/insights/spending-patterns?month=2026-03`, authHeaders);
    console.log(`✅ 8. GET /insights/spending-patterns: Persona = "${patterns.data.data.profileLabel}" (${patterns.data.data.algorithm})`);

    // 9. Statistical Anomaly Detection (IQR Outlier Fences)
    const anomalies = await axios.get(`${BASE_URL}/insights/unusual-expenses?month=2026-03`, authHeaders);
    const count = anomalies.data.data.flaggedTransactions?.length || 0;
    const firstBadge = anomalies.data.data.flaggedTransactions?.[0]?.badge || 'None';
    const firstDesc = anomalies.data.data.flaggedTransactions?.[0]?.description || 'None';
    console.log(`✅ 9. GET /insights/unusual-expenses?month=2026-03: Found ${count} statistical anomaly (Flagged: "${firstDesc}" - ${firstBadge})`);

    console.log('\n🎉 ALL 9 BACKEND ENDPOINT TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
