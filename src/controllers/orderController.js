const orderService = require('../services/orderService');

/**
 * POST /api/orders
 * Body: { eventId, tickets: [{ ticketInfoId, quantity }], promotionCode?, paymentMethod? }
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user && (req.user.sub || req.user._id || req.user.id);
    const { eventId, tickets, promotionCode, paymentMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ error: 'eventId and tickets are required' });
    }

    const result = await orderService.createOrder(userId, eventId, tickets, promotionCode, paymentMethod);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/orders?page=1&limit=10
 * Gets orders for the authenticated user
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user && (req.user.sub || req.user._id || req.user.id);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { page = 1, limit = 10 } = req.query;
    const result = await orderService.getUserOrders(userId, page, limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/orders/:id
 * Gets a single order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const result = await orderService.getOrderById(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
