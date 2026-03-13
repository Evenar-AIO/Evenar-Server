const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/',  orderController.getUserOrders);
router.post('/', orderController.createOrder);

module.exports = router;
