const Refund = require('../models/refundModel');
const Order = require('../models/orderModel');

exports.requestRefund = async (orderId, reason) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  
  const existingRefund = await Refund.findOne({ orderId });
  if (existingRefund) {
    throw new Error('Refund already requested for this order');
  }
  
  const refund = await Refund.create({
    orderId,
    reason,
    amount: order.totalAmount,
    status: 'PENDING'
  });
  
  order.status = 'REFUNDED';
  await order.save();
  
  return {
    refundId: refund._id,
    status: refund.status,
    amount: refund.amount
  };
};
