const prisma = require('../config/db');
const { predictCategory, getSpendingProfile } = require('../services/mlService');

// Category Palette for visualization
const CATEGORY_COLORS = {
  1: '#f97316', // Food & Dining
  2: '#10b981', // Groceries
  3: '#06b6d4', // Transport
  4: '#ec4899', // Shopping
  5: '#8b5cf6', // Bills & Utilities
  6: '#f43f5e', // Entertainment
  7: '#14b8a6', // Healthcare
  8: '#3b82f6', // Education
  9: '#eab308', // Travel
  10: '#64748b', // Other
};

async function getSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          transactionDate: {
            startsWith: month,
          },
        },
        orderBy: { transactionDate: 'asc' },
      }),
      prisma.category.findMany(),
    ]);

    const totalExpenditure = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const transactionCount = transactions.length;
    const averageTransactionAmount = transactionCount > 0 ? Number((totalExpenditure / transactionCount).toFixed(2)) : 0;

    // Daily Spending Trend
    const dailyMap = {};
    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      dailyMap[tx.transactionDate] = (dailyMap[tx.transactionDate] || 0) + amt;
    });

    const dailySpendingTrend = Object.keys(dailyMap).sort().map((date) => ({
      date,
      displayDate: date.slice(5),
      amount: Number(dailyMap[date].toFixed(2)),
    }));

    // Category Breakdown
    const catTotalMap = {};
    categories.forEach((c) => { catTotalMap[c.id] = 0; });
    transactions.forEach((tx) => {
      catTotalMap[tx.categoryId] = (catTotalMap[tx.categoryId] || 0) + Number(tx.amount);
    });

    const categoryBreakdown = categories
      .map((c) => {
        const amount = catTotalMap[c.id] || 0;
        const percentage = totalExpenditure > 0 ? Number(((amount / totalExpenditure) * 100).toFixed(1)) : 0;
        return {
          categoryId: c.id,
          name: c.name,
          amount: Number(amount.toFixed(2)),
          percentage,
          color: CATEGORY_COLORS[c.id] || '#64748b',
        };
      })
      .filter((c) => c.amount > 0);

    res.status(200).json({
      success: true,
      data: {
        month,
        totalExpenditure: Number(totalExpenditure.toFixed(2)),
        transactionCount,
        averageTransactionAmount,
        dailySpendingTrend,
        categoryBreakdown,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getSpendingPatterns(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          startsWith: month,
        },
      },
    });

    const categories = await prisma.category.findMany();
    const totalExpenditure = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Compute proportions vector
    const proportions = {};
    categories.forEach((c) => { proportions[c.name] = 0; });

    if (totalExpenditure > 0) {
      transactions.forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId);
        if (cat) {
          proportions[cat.name] = (proportions[cat.name] || 0) + Number(tx.amount) / totalExpenditure;
        }
      });
    }

    const profilePayload = {
      period_month: month,
      total_expenditure: totalExpenditure,
      monthly_transaction_count: transactions.length,
      average_transaction_amount: transactions.length > 0 ? totalExpenditure / transactions.length : 0,
      proportions,
    };

    const clusterResult = await getSpendingProfile(month, profilePayload);

    // Persist or update spending profile record in database
    await prisma.spendingProfile.upsert({
      where: {
        userId_periodMonth: {
          userId,
          periodMonth: month,
        },
      },
      update: {
        clusterId: clusterResult.cluster_id,
        profileLabel: clusterResult.profile_label,
        summary: clusterResult.summary,
        modelVersion: clusterResult.model_version,
      },
      create: {
        userId,
        periodMonth: month,
        clusterId: clusterResult.cluster_id,
        profileLabel: clusterResult.profile_label,
        summary: clusterResult.summary,
        modelVersion: clusterResult.model_version,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      data: {
        clusterId: clusterResult.cluster_id,
        profileLabel: clusterResult.profile_label,
        summary: clusterResult.summary,
        topContributingCategories: clusterResult.top_contributing_categories?.map((c) => ({
          ...c,
          color: CATEGORY_COLORS[categories.find((cat) => cat.name === c.name)?.id] || '#6366f1',
        })),
        algorithm: clusterResult.algorithm || 'K-Means (k=5 Centroid Match)',
        modelVersion: clusterResult.model_version,
        recommendation: clusterResult.recommendation,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Statistical Outlier Detection using Tukey's Fences (Q3 + 1.5 * IQR)
 */
async function getUnusualExpenses(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Fetch transactions for the selected month
    const monthTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          startsWith: month,
        },
      },
      include: { category: true },
    });

    // Fetch user historical transactions to build category baselines
    const historicalTransactions = await prisma.transaction.findMany({
      where: { userId },
    });

    // Group historical amounts by category
    const catAmounts = {};
    historicalTransactions.forEach((tx) => {
      if (!catAmounts[tx.categoryId]) catAmounts[tx.categoryId] = [];
      catAmounts[tx.categoryId].push(Number(tx.amount));
    });

    // Compute robust statistical thresholds (IQR / Sample std deviation) for each category
    const thresholds = {};
    for (const [catId, amounts] of Object.entries(catAmounts)) {
      if (amounts.length >= 2) {
        amounts.sort((a, b) => a - b);
        const n = amounts.length;
        const avg = amounts.reduce((s, a) => s + a, 0) / n;
        
        // Sample standard deviation
        const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);

        // Percentiles
        const q1 = amounts[Math.max(0, Math.floor(n * 0.25))];
        // If n < 4, use second highest or median for Q3 to prevent the outlier from setting Q3
        const q3 = n < 4 ? amounts[1] : amounts[Math.floor(n * 0.75)];
        const iqr = Math.max(stdDev, q3 - q1);

        // Dynamic fence
        const threshold = Number(Math.max(avg + 1.75 * stdDev, q3 + 1.5 * iqr).toFixed(2));

        thresholds[catId] = {
          avg: Number(avg.toFixed(2)),
          threshold,
        };
      }
    }

    const flaggedTransactions = [];
    monthTransactions.forEach((tx) => {
      const stats = thresholds[tx.categoryId];
      const txAmt = Number(tx.amount);
      if (stats && txAmt > stats.threshold) {
        const ratio = Number((txAmt / (stats.avg || 1)).toFixed(1));
        flaggedTransactions.push({
          transactionId: tx.id,
          date: tx.transactionDate,
          description: tx.description,
          merchant: tx.merchant,
          amount: txAmt,
          category: tx.category.name,
          categoryAverage: stats.avg,
          threshold: stats.threshold,
          ratio,
          badge: `${ratio}x higher than typical ${tx.category.name} spend`,
          reason: `Amount ₹${txAmt.toLocaleString()} exceeds IQR statistical fence (Q3 + 1.5 * IQR = ₹${stats.threshold.toLocaleString()}) for your ${tx.category.name} history.`,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        method: "Tukey's IQR Fences (Q3 + 1.5 * IQR)",
        flaggedTransactions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function suggestCategory(req, res, next) {
  try {
    const query = req.query.q || '';
    const prediction = await predictCategory(query);

    res.status(200).json({
      success: true,
      data: {
        categoryId: prediction.category_id,
        categoryName: prediction.predicted_category,
        confidence: prediction.confidence,
        isMlSuggested: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getSpendingPatterns,
  getUnusualExpenses,
  suggestCategory,
};
