const orderService = require('../services/orderService');

/**
 * POST /api/orders  (also mounted at POST /api/bookings for FE backward-compat)
 * Body: { eventId, tickets: [{ ticketInfoId, quantity }], promotionCode?, paymentMethod? }
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user._id) || '507f1f77bcf86cd799439011';
    const { eventId, tickets, promotionCode, paymentMethod } = req.body;

    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ error: 'eventId and tickets are required' });
    }

    const result = await orderService.createOrder(userId, eventId, tickets, promotionCode, paymentMethod);
    console.log('✅ Order created:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ createOrder error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/orders?page=1&limit=10
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id) || '507f1f77bcf86cd799439011';
    const { page = 1, limit = 10 } = req.query;

    const result = await orderService.getUserOrders(userId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
