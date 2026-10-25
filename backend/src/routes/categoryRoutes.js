const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const prisma = require('../config/db');

// Public or debounced category suggestion
router.get('/suggest', analyticsController.suggestCategory);

// Get list of fixed 10 categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
