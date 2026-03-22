const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(verifyToken);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.delete('/', cartController.clearCart);
router.put('/:ticketInfoId', cartController.updateQuantity);
router.delete('/:ticketInfoId', cartController.removeFromCart);

module.exports = router;
