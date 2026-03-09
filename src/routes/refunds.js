const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');

router.post('/refunds/request', refundController.requestRefund);

module.exports = router;
