const Refund = require('../models/refundModel');
const Order = require('../models/orderModel');

exports.requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const existingRefund = await Refund.findOne({ orderId });
    if (existingRefund) {
        return res.status(400).json({ error: 'Refund already requested for this order' });
    }
    
    const refund = await Refund.create({
      orderId,
      reason,
      amount: order.totalAmount,
      status: 'PENDING'
    });
    
    // Optionally update order status here
    order.status = 'REFUNDED'; // Or maybe an intermediate state like 'REFUND_PENDING'
    await order.save();
    
    res.status(201).json({
      refundId: refund._id,
      status: refund.status,
      amount: refund.amount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
