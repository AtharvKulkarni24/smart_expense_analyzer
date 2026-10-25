const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.setBudget);

module.exports = router;
