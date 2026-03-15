const orderService = require('../services/orderService');

/**
 * POST /api/orders  (also mounted at POST /api/bookings for FE backward-compat)
 * Body: { userId, eventId, tickets: [{ ticketInfoId, quantity }], promotionCode?, paymentMethod? }
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user._id);
    const { eventId, tickets, promotionCode, paymentMethod } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required in the request body' });
    }

    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ error: 'eventId and tickets are required' });
    }

    const result = await orderService.createOrder(userId, eventId, tickets, promotionCode, paymentMethod);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/orders?userId=xxx&page=1&limit=10
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required as a query parameter' });
    }
    const { page = 1, limit = 10 } = req.query;
    const result = await orderService.getUserOrders(userId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
