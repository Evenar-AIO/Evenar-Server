const Order = require('../models/orderModel');

exports.getUserOrders = async (userId, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);
  const query = { userId };

  const orders = await Order.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
  const total = await Order.countDocuments(query);
  
  return {
    orders,
    total,
    page: Number(page)
  };
};
