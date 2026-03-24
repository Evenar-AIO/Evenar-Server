const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePayment } = require('../validators/paymentValidator');

router.post('/', validatePayment, paymentController.processPayment);
router.post('/callback', paymentController.handleCallback);
router.all('/confirm', paymentController.confirmPayment);
router.all('/cancel', paymentController.cancelPayment);

module.exports = router;
