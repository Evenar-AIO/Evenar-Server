const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Payment = require('../models/paymentModel');
const OrderItem = require('../models/orderItemModel');
const paymentGateway = require('../utils/paymentGateway');
const inventoryManager = require('../utils/inventoryManager');

/**
 * processPayment
 * Kicks off payment for an existing Order.
 * For PAYOS: creates a real payment link via the gateway.
 * For VNPAY / others: returns a mock redirect URL.
 */
exports.processPayment = async (orderId, method) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (order.paymentStatus === 'paid') {
    throw new Error('Order has already been paid');
  }

  if (order.paymentStatus === 'refunded') {
    throw new Error('Order has been refunded');
  }

  if (method === 'PAYOS') {
    const orderCode = Math.floor(Date.now() / 1000);
    const domain = process.env.DOMAIN || 'http://localhost:3000';

    const payosData = {
      orderCode,
      amount: order.totalAmount,
      description: `Thanh toan ${order.orderNumber}`,
      returnUrl: `${domain}/orders?status=success`,
      cancelUrl: `${domain}/orders?status=cancelled`,
    };

    const payosResponse = await paymentGateway.createPaymentLink(payosData);

    await Payment.create({
      orderId: order._id,
      orderCode,
      amount: order.totalAmount,
      method: 'PAYOS',
      transactionId: payosResponse.paymentLinkId,
      status: 'PENDING',
    });

    return {
      transactionId: payosResponse.paymentLinkId,
      status: 'PENDING',
      redirectUrl: payosResponse.checkoutUrl,
    };
  }

  // Mock VNPAY — confirm immediately for dev purposes
  return {
    transactionId: `mock-txn-${Date.now()}`,
    status: 'SUCCESS',
    redirectUrl: 'http://localhost:3000/orders',
  };
};

/**
 * handleCallback — called by PAYOS webhook
 * Marks the order as paid and confirms inventory.
 * Uses transaction to prevent race conditions from double-confirmation.
 */
exports.handleCallback = async (reqBody) => {
  const { code, data } = reqBody;
  console.log('Payment callback received:', reqBody);

  if (code === '00' && data) {
    const { orderCode, status } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findOne({ orderCode }).session(session);
      if (!payment) {
        throw new Error('Payment record not found for orderCode: ' + orderCode);
      }

      // Check if already confirmed - idempotent check
      if (payment.status === 'SUCCESS') {
        await session.commitTransaction();
        session.endSession();
        return { status: 'ALREADY_CONFIRMED' };
      }

      if (status === 'PAID') {
        // Update payment status within transaction
        payment.status = 'SUCCESS';
        await payment.save({ session });

        // Find and update order within transaction
        const order = await Order.findById(payment.orderId).session(session);
        
        if (!order) {
          throw new Error('Order not found for payment');
        }

        // Double-check order hasn't been paid already
        if (order.paymentStatus === 'paid') {
          await session.commitTransaction();
          session.endSession();
          return { status: 'ALREADY_CONFIRMED' };
        }

        // Update order status
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save({ session });

        // Confirm inventory: move reserved → sold within transaction
        const items = await OrderItem.find({ orderId: order._id }).session(session);
        if (items && items.length > 0) {
          await inventoryManager.confirmOrderWithSession(items, session);
        }
      }

      await session.commitTransaction();
      session.endSession();
      return { status: 'CALLBACK_OK' };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  return { status: 'PENDING_OR_FAILED' };
};

/**
 * handleCallbackWithoutTransaction - Legacy method for backward compatibility
 * WARNING: Has race condition issues, use handleCallback instead
 */
exports.handleCallbackWithoutTransaction = async (reqBody) => {
  const { code, data } = reqBody;
  console.log('Payment callback received:', reqBody);

  if (code === '00' && data) {
    const { orderCode, status } = data;

    const payment = await Payment.findOne({ orderCode });
    if (!payment) throw new Error('Payment record not found for orderCode: ' + orderCode);

    // Idempotent check
    if (payment.status === 'SUCCESS') {
      return { status: 'ALREADY_CONFIRMED' };
    }

    if (status === 'PAID' && payment.status !== 'SUCCESS') {
      payment.status = 'SUCCESS';
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        // Double-check
        if (order.paymentStatus === 'paid') {
          return { status: 'ALREADY_CONFIRMED' };
        }
        
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        await order.save();

        // Confirm inventory (atomic version)
        const items = await OrderItem.find({ orderId: order._id });
        await inventoryManager.confirmOrder(items);
      }
    }

    return { status: 'CALLBACK_OK' };
  }

  return { status: 'PENDING_OR_FAILED' };
};

/**
 * cancelOrder - Cancels an order and releases inventory
 * Called when payment is cancelled or times out
 */
exports.cancelOrder = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    // Can only cancel pending orders
    if (order.paymentStatus !== 'pending') {
      throw new Error('Can only cancel pending orders');
    }

    // Update order status
    order.paymentStatus = 'cancelled';
    order.orderStatus = 'cancelled';
    await order.save({ session });

    // Release inventory
    const items = await OrderItem.find({ orderId: order._id }).session(session);
    if (items && items.length > 0) {
      await inventoryManager.releaseSeatsWithSession(items, session);
    }

    await session.commitTransaction();
    session.endSession();

    return { status: 'CANCELLED' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
