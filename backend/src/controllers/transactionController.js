const prisma = require('../config/db');
const { predictCategory, predictCategoryFallback } = require('../services/mlService');

async function getTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      categoryId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy = 'transactionDate',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma where clause with strict tenancy
    const where = {
      userId,
    };

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { description: { contains: q } },
        { merchant: { contains: q } },
      ];
    }

    const [totalRecords, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: order.toLowerCase() === 'asc' ? 'asc' : 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          prediction: { select: { predictedCategoryId: true, modelVersion: true, acceptedCategoryId: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalRecords,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function addTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { amount, description, merchant, transactionDate, categoryId, source = 'manual' } = req.body;

    if (!description || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Description and amount are required' },
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than 0' },
      });
    }

    let finalCategoryId = categoryId ? parseInt(categoryId, 10) : null;
    let mlResult = null;

    // If category not specified by user, call ML prediction service
    if (!finalCategoryId) {
      mlResult = await predictCategory(description, merchant, parsedAmount);
      finalCategoryId = mlResult.category_id || 10;
    }

    const dateStr = transactionDate || new Date().toISOString().split('T')[0];

    // Create transaction in database
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parsedAmount,
        currency: 'INR',
        description,
        merchant: merchant || null,
        categoryId: finalCategoryId,
        transactionDate: dateStr,
        source,
      },
      include: {
        category: true,
      },
    });

    // Record prediction audit trail if predicted
    if (mlResult) {
      await prisma.expensePrediction.create({
        data: {
          transactionId: transaction.id,
          predictedCategoryId: mlResult.category_id,
          modelVersion: mlResult.model_version || 'mnb-v1.0.0',
          scoresJson: mlResult.scores || {},
          acceptedCategoryId: finalCategoryId,
        },
      }).catch(() => {}); // non-blocking
    }

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction recorded successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, description, merchant, transactionDate, categoryId } = req.body;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { prediction: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found or unauthorized' },
      });
    }

    const data = {};
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (description !== undefined) data.description = description;
    if (merchant !== undefined) data.merchant = merchant;
    if (transactionDate !== undefined) data.transactionDate = transactionDate;
    
    if (categoryId !== undefined) {
      const newCatId = parseInt(categoryId, 10);
      data.categoryId = newCatId;

      // Track active learning user correction
      if (existing.prediction) {
        await prisma.expensePrediction.update({
          where: { transactionId: id },
          data: { acceptedCategoryId: newCatId },
        }).catch(() => {});
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data,
      include: { category: true },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Transaction updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found or unauthorized' },
      });
    }

    await prisma.transaction.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function importCsv(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = req.body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Array of transaction rows is required' },
      });
    }

    let importedCount = 0;
    let rejectedCount = 0;
    const rejectedRows = [];

    const categories = await prisma.category.findMany();
    const catMap = new Map();
    categories.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const amount = parseFloat(row.Amount || row.amount);
      const desc = (row.Description || row.description || '').trim();
      const date = row.Date || row.date || new Date().toISOString().split('T')[0];
      const merchant = row.Merchant || row.merchant || null;

      if (!desc || isNaN(amount) || amount <= 0) {
        rejectedCount++;
        rejectedRows.push({ row: i + 1, reason: 'Invalid description or non-positive amount' });
        continue;
      }

      let categoryId = parseInt(row.CategoryId || row.category_id, 10);
      if (!categoryId) {
        const catName = (row.Category || row.category || '').toLowerCase();
        if (catMap.has(catName)) {
          categoryId = catMap.get(catName);
        } else {
          // ML Categorization via microservice
          const pred = await predictCategory(desc, merchant, amount);
          categoryId = pred.category_id || 10;
        }
      }

      await prisma.transaction.create({
        data: {
          userId,
          amount,
          currency: 'INR',
          description: desc,
          merchant,
          categoryId,
          transactionDate: date,
          source: 'csv',
        },
      });
      importedCount++;
    }

    res.status(200).json({
      success: true,
      data: {
        totalProcessed: rows.length,
        importedCount,
        rejectedCount,
        rejectedRows,
      },
      message: `CSV import completed: ${importedCount} imported, ${rejectedCount} rejected`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  importCsv,
};
