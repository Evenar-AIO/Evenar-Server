const paymentService = require('../services/paymentService');

exports.processPayment = async (req, res) => {
  try {
    const { orderId, method } = req.body;
    
    const result = await paymentService.processPayment(orderId, method);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Payment Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  try {
    const result = await paymentService.handleCallback(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Callback error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
