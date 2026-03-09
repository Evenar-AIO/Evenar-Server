exports.processPayment = async (req, res) => {
  try {
    const { orderId, amount, method, paymentToken } = req.body;
    res.status(200).json({
      transactionId: 'mock-txn-id',
      status: 'SUCCESS',
      redirectUrl: 'http://localhost/mock-payment'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  res.status(200).json({ status: 'CALLBACK_OK' });
};
