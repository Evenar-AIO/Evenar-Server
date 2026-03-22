const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * POST /api/bookings  — kept for FE backward-compatibility.
 * Internally delegates to orderController.createOrder.
 */
router.post('/', verifyToken, orderController.createOrder);

module.exports = router;
