const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePayment } = require('../validators/paymentValidator');

router.post('/', validatePayment, paymentController.processPayment);
router.post('/callback', paymentController.handleCallback);

module.exports = router;
