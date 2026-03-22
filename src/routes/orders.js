const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateCreateOrder } = require('../validators/orderValidator');

router.get('/', verifyToken, orderController.getUserOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.post('/', verifyToken, validateCreateOrder, orderController.createOrder);

module.exports = router;
