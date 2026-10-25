const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.addTransaction);
router.patch('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);
router.post('/import', transactionController.importCsv);

module.exports = router;
