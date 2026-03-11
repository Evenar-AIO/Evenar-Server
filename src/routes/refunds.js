const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');

router.post('/request', refundController.requestRefund);

module.exports = router;
