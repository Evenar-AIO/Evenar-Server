const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/payments', paymentController.processPayment);
router.post('/payments/callback', paymentController.handleCallback);

module.exports = router;
