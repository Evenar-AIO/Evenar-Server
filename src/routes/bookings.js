const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

/**
 * POST /api/bookings  — kept for FE backward-compatibility.
 * Internally delegates to orderController.createOrder.
 */
router.post('/', orderController.createOrder);

module.exports = router;
