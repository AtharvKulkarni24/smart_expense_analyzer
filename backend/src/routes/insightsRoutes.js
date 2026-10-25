const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/spending-patterns', analyticsController.getSpendingPatterns);
router.get('/unusual-expenses', analyticsController.getUnusualExpenses);
router.post('/simulate-profile', analyticsController.simulateProfile);
router.get('/model-metrics', analyticsController.getModelMetrics);

module.exports = router;
