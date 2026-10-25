const prisma = require('../config/db');

async function getBudgets(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Fetch all categories
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });

    // Fetch user defined budgets for this month
    const userBudgets = await prisma.budget.findMany({
      where: { userId, month },
    });
    const budgetMap = new Map();
    userBudgets.forEach((b) => budgetMap.set(b.categoryId, Number(b.limitAmount)));

    // Fetch transactions in this month to compute actual spend per category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          startsWith: month,
        },
      },
    });

    const spendingMap = new Map();
    transactions.forEach((tx) => {
      spendingMap.set(tx.categoryId, (spendingMap.get(tx.categoryId) || 0) + Number(tx.amount));
    });

    let totalBudget = 0;
    let totalSpent = 0;

    const categoryBudgets = categories.map((cat) => {
      const limitAmount = budgetMap.get(cat.id) || 3000.00; // Default sensible budget if not set
      const actualSpent = spendingMap.get(cat.id) || 0;
      const remaining = Math.max(0, limitAmount - actualSpent);
      const util = limitAmount > 0 ? Number(((actualSpent / limitAmount) * 100).toFixed(1)) : 0;

      let status = 'safe';
      if (util >= 100) status = 'exceeded';
      else if (util >= 75) status = 'warning';

      totalBudget += limitAmount;
      totalSpent += actualSpent;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        limitAmount,
        actualSpent,
        remaining,
        utilizationPercentage: util,
        status,
      };
    });

    const overallUtilization = totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        month,
        totalBudget,
        totalSpent,
        overallUtilization,
        categories: categoryBudgets,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function setBudget(req, res, next) {
  try {
    const userId = req.user.id;
    const { categoryId, limitAmount, month } = req.body;

    if (!categoryId || limitAmount === undefined || !month) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'categoryId, limitAmount, and month are required' },
      });
    }

    const catId = parseInt(categoryId, 10);
    const limit = parseFloat(limitAmount);

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month: {
          userId,
          categoryId: catId,
          month,
        },
      },
      update: {
        limitAmount: limit,
      },
      create: {
        userId,
        categoryId: catId,
        month,
        limitAmount: limit,
      },
    });

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget limit saved successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBudgets,
  setBudget,
};
