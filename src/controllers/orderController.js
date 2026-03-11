const orderService = require('../services/orderService');

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id);
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    const result = await orderService.getUserOrders(userId, page, limit);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
