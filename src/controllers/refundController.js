const refundService = require('../services/refundService');

exports.requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const result = await refundService.requestRefund(orderId, reason);
    res.status(201).json(result);
  } catch (error) {
    const status = (error.message === 'Order not found') ? 404 : 
                   (error.message === 'Refund already requested for this order') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};
