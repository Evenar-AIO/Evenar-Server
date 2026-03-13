const mongoose = require('mongoose');
const Refund = require('../models/refundModel');
const Order = require('../models/orderModel');
const OrderItem = require('../models/orderItemModel');
const inventoryManager = require('../utils/inventoryManager');
const promotionService = require('../services/promotionService');

/**
 * requestRefund
 * Creates a Refund record and marks the Order as refunded.
 * Also releases reserved/sold inventory back.
 * Uses MongoDB transaction for data consistency.
 * 
 * @param {string} orderId - Order ID
 * @param {string} reason - Reason for refund
 * @returns {Object} Refund result
 */
exports.requestRefund = async (orderId, reason) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check: đã refunded chưa?
    if (order.paymentStatus === 'refunded') {
      throw new Error('Order has already been refunded');
    }

    // Check: đã paid chưa? (chỉ refund order đã paid)
    if (order.paymentStatus !== 'paid') {
      throw new Error('Cannot refund an unpaid order');
    }

    // Check: order đã confirm chưa?
    if (order.orderStatus !== 'confirmed') {
      throw new Error('Only confirmed orders can be refunded');
    }

    // Check if refund already requested
    const existingRefund = await Refund.findOne({ orderId }).session(session);
    if (existingRefund) {
      throw new Error('Refund already requested for this order');
    }

    // Create the refund record
    const [refund] = await Refund.create([{
      orderId,
      reason,
      amount: order.totalAmount,
      status: 'PENDING',
    }], { session });

    // Mark order statuses
    order.paymentStatus = 'refunded';
    order.orderStatus = 'refunded';
    await order.save({ session });

    // Release inventory so seats are available again
    const items = await OrderItem.find({ orderId: order._id }).session(session);
    if (items && items.length > 0) {
      await inventoryManager.releaseSeatsWithSession(items, session);
    }

    // Rollback promotion usage if applicable
    if (order.promotionCode) {
      try {
        const Promotion = require('../models/promotionModel');
        const promo = await Promotion.findOne({ promotionCode: order.promotionCode }).session(session);
        if (promo) {
          await promotionService.rollbackPromotionUsage(promo._id);
        }
      } catch (promoError) {
        // Log but don't fail the refund
        console.warn('Failed to rollback promotion usage:', promoError.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      refundId: refund._id,
      status: refund.status,
      amount: refund.amount,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * requestRefundWithoutTransaction - Legacy method for backward compatibility
 * WARNING: Has race condition issues, use requestRefund instead
 */
exports.requestRefundWithoutTransaction = async (orderId, reason) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const existingRefund = await Refund.findOne({ orderId });
  if (existingRefund) throw new Error('Refund already requested for this order');

  if (order.paymentStatus !== 'paid') {
    throw new Error('Cannot refund an unpaid order');
  }

  // Create the refund record
  const refund = await Refund.create({
    orderId,
    reason,
    amount: order.totalAmount,
    status: 'PENDING',
  });

  // Mark order statuses
  order.paymentStatus = 'refunded';
  order.orderStatus = 'refunded';
  await order.save();

  // Release inventory so seats are available again
  const items = await OrderItem.find({ orderId: order._id });
  if (items.length) {
    await inventoryManager.releaseSeats(items);
  }

  return {
    refundId: refund._id,
    status: refund.status,
    amount: refund.amount,
  };
};

/**
 * getRefundById - Get refund by ID
 */
exports.getRefundById = async (refundId) => {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error('Refund not found');
  return refund;
};

/**
 * getRefundByOrderId - Get refund by order ID
 */
exports.getRefundByOrderId = async (orderId) => {
  const refund = await Refund.findOne({ orderId });
  if (!refund) throw new Error('Refund not found');
  return refund;
};

/**
 * getUserRefunds - Get all refunds for a user
 */
exports.getUserRefunds = async (userId, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);

  // Get orders that have refunds
  const orders = await Order.find({ 
    userId, 
    paymentStatus: 'refunded' 
  })
    .populate('eventId', 'name physicalLocation startTime')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const refunds = await Promise.all(
    orders.map(async (order) => {
      const refund = await Refund.findOne({ orderId: order._id });
      return {
        order: order,
        refund: refund
      };
    })
  );

  const total = await Order.countDocuments({ 
    userId, 
    paymentStatus: 'refunded' 
  });

  return {
    refunds,
    total,
    page: Number(page),
  };
};

/**
 * approveRefund - Admin approves a refund request
 */
exports.approveRefund = async (refundId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const refund = await Refund.findById(refundId).session(session);
    if (!refund) throw new Error('Refund not found');

    if (refund.status !== 'PENDING') {
      throw new Error('Refund is not pending');
    }

    refund.status = 'APPROVED';
    await refund.save({ session });

    await session.commitTransaction();
    session.endSession();

    return {
      refundId: refund._id,
      status: refund.status,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * rejectRefund - Admin rejects a refund request
 */
exports.rejectRefund = async (refundId, rejectionReason) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const refund = await Refund.findById(refundId).session(session);
    if (!refund) throw new Error('Refund not found');

    if (refund.status !== 'PENDING') {
      throw new Error('Refund is not pending');
    }

    refund.status = 'REJECTED';
    refund.rejectionReason = rejectionReason;
    await refund.save({ session });

    // Restore order status
    const order = await Order.findById(refund.orderId).session(session);
    if (order) {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return {
      refundId: refund._id,
      status: refund.status,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
