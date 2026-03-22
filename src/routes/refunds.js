const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { validateRefundRequest } = require('../validators/refundValidator');

router.post('/request', validateRefundRequest, refundController.requestRefund);

module.exports = router;
