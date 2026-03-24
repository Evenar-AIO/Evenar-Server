const paymentService = require('../services/paymentService');

exports.processPayment = async (req, res) => {
  try {
    const result = await paymentService.processPayment(req.body);
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

exports.confirmPayment = async (req, res) => {
  try {
    const orderId = req.query.orderId || req.body.orderId;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    await paymentService.confirmPayment(orderId);
    
    // If it's a GET request from browser, show success page
    if (req.method === 'GET') {
      return res.send(`
        <html>
          <body style="background: #020617; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="background: #0F172A; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #22C55E;">
              <h1 style="color: #22C55E;">✓ Thanh toán thành công!</h1>
              <p>Cảm ơn bạn đã đặt vé. Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
              <button onclick="window.close()" style="background: #22C55E; color: #020617; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; margin-top: 20px;">Quay lại ứng dụng</button>
            </div>
          </body>
        </html>
      `);
    }

    res.status(200).json({ status: 'CONFIRMED' });
  } catch (error) {
    console.error('Confirm payment error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.cancelPayment = async (req, res) => {
  try {
    const orderId = req.query.orderId || req.body.orderId;
    if (req.method === 'GET') {
       return res.send(`
        <html>
          <body style="background: #020617; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="background: #0F172A; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #ef4444;">
              <h1 style="color: #ef4444;">✕ Thanh toán đã bị hủy</h1>
              <p>Đơn hàng của bạn chưa được thanh toán. Bạn có thể đóng cửa sổ này và thử lại.</p>
              <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; margin-top: 20px;">Quay lại ứng dụng</button>
            </div>
          </body>
        </html>
      `);
    }
    res.status(200).json({ status: 'CANCELLED' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
