const Order = require('../models/orderModel');
const Payment = require('../models/paymentModel');
const Booking = require('../models/bookingModel');
const paymentGateway = require('../utils/paymentGateway');
const inventoryManager = require('../utils/inventoryManager');

exports.processPayment = async (orderId, method) => {
  const order = await Order.findById(orderId).populate('bookingId');
  if (!order) {
    throw new Error('Order not found');
  }

  if (method === 'PAYOS') {
    const orderCode = Math.floor(Date.now() / 1000); 
    const domain = process.env.DOMAIN || 'http://localhost:3000';
    
    const orderData = {
      orderCode,
      amount: order.totalAmount,
      description: `Thanh toan don hang ${orderId}`,
      returnUrl: `${domain}/orders?status=success`,
      cancelUrl: `${domain}/orders?status=cancelled`,
    };

    const payosResponse = await paymentGateway.createPaymentLink(orderData);

    await Payment.create({
      orderId: order._id,
      orderCode,
      amount: order.totalAmount,
      method: 'PAYOS',
      transactionId: payosResponse.paymentLinkId,
      status: 'PENDING'
    });

    return {
      transactionId: payosResponse.paymentLinkId,
      status: 'PENDING',
      redirectUrl: payosResponse.checkoutUrl
    };
  }

  // Default mock response for other methods (VNPay, etc.)
  return {
    transactionId: 'mock-txn-id',
    status: 'SUCCESS',
    redirectUrl: 'http://localhost:3000/orders'
  };
};

exports.handleCallback = async (reqBody) => {
  const { code, data } = reqBody;
  console.log('Payment callback received:', reqBody);

  if (code === '00' && data) {
    const { orderCode, status } = data;
    const payment = await Payment.findOne({ orderCode });
    if (!payment) throw new Error('OrderCode not found');

    if (status === 'PAID' && payment.status !== 'SUCCESS') {
      payment.status = 'SUCCESS';
      await payment.save();

      const order = await Order.findById(payment.orderId).populate('bookingId');
      if (order) {
        order.status = 'PAID';
        await order.save();

        const booking = await Booking.findById(order.bookingId);
        if (booking && booking.status !== 'CONFIRMED') {
          booking.status = 'CONFIRMED';
          await booking.save();

          // 5. Finalize inventory: Confirm sold status
          await inventoryManager.confirmBooking(booking.eventId, booking.tickets);
        }
      }
    }
    return { status: 'CALLBACK_OK' };
  }
  return { status: 'PENDING_OR_FAILED' };
};
