const Order = require('../models/orderModel');

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user._id);
    const { page = 1, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const query = { userId };

    const orders = await Order.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      orders,
      total,
      page: Number(page)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
