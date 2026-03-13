const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const OrderItem = require('../models/orderItemModel');
const Event = require('../models/eventModel');
const TicketInfo = require('../models/ticketInfoModel');
const inventoryManager = require('../utils/inventoryManager');
const promotionService = require('./promotionService');

/**
 * createOrder
 * Creates an Order + OrderItems in one atomic flow, reserves inventory.
 * Uses MongoDB transaction to ensure data consistency.
 *
 * @param {string} userId
 * @param {string} eventId
 * @param {Array<{ ticketInfoId, quantity }>} tickets
 * @param {string|null} promotionCode
 * @param {string} paymentMethod  - 'VNPAY' | 'PAYOS'
 * @returns {{ orderId, orderNumber, status, totalAmount }}
 */
exports.createOrder = async (userId, eventId, tickets, promotionCode = null, paymentMethod = 'VNPAY') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Validate event
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new Error('Event not found');
    }

    // 2. Resolve ticket prices & compute subtotal
    let subtotalAmount = 0;
    const resolvedTickets = [];

    for (const t of tickets) {
      const tInfo = await TicketInfo.findById(t.ticketInfoId).session(session);
      if (!tInfo) {
        throw new Error(`Invalid ticket type: ${t.ticketInfoId}`);
      }

      const qty = Number(t.quantity) || 1;
      const unitPrice = Number(tInfo.price);
      subtotalAmount += unitPrice * qty;

      resolvedTickets.push({
        ticketInfoId: tInfo._id,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
      });
    }

    // 3. Apply promotion code (optional)
    let discountAmount = 0;
    if (promotionCode) {
      try {
        // Use atomic validation + increment (this has its own race condition protection)
        const { promo, discount } = await promotionService.validateAndUsePromotion(
          promotionCode, 
          eventId, 
          subtotalAmount
        );
        discountAmount = discount;
      } catch (promoError) {
        // Invalid / expired promo — proceed without discount
        console.warn('Promotion validation failed:', promoError.message);
      }
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    // 4. Reserve inventory (with session for transaction safety)
    await inventoryManager.reserveSeatsWithSession(resolvedTickets, session);

    // 5. Create Order
    const [order] = await Order.create([{
      userId,
      eventId,
      promotionCode: promotionCode || null,
      discountAmount,
      subtotalAmount,
      totalAmount,
      paymentStatus: 'pending',
      orderStatus: 'created',
      paymentMethod,
    }], { session });

    // 6. Create OrderItems
    const orderItems = resolvedTickets.map(t => ({
      orderId: order._id,
      eventId,
      ticketInfoId: t.ticketInfoId,
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      totalPrice: t.totalPrice,
    }));
    await OrderItem.insertMany(orderItems, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
    };
  } catch (error) {
    // Abort transaction on any error
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * createOrderWithoutTransaction - Legacy method for backward compatibility
 * WARNING: Has race condition issues, use createOrder instead
 */
exports.createOrderWithoutTransaction = async (userId, eventId, tickets, promotionCode = null, paymentMethod = 'VNPAY') => {
  // 1. Validate event
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  // 2. Resolve ticket prices & compute subtotal
  let subtotalAmount = 0;
  const resolvedTickets = [];

  for (const t of tickets) {
    const tInfo = await TicketInfo.findById(t.ticketInfoId);
    if (!tInfo) throw new Error(`Invalid ticket type: ${t.ticketInfoId}`);

    const qty = Number(t.quantity) || 1;
    const unitPrice = Number(tInfo.price);
    subtotalAmount += unitPrice * qty;

    resolvedTickets.push({
      ticketInfoId: tInfo._id,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
    });
  }

  // 3. Apply promotion code (optional)
  let discountAmount = 0;
  if (promotionCode) {
    try {
      const { promo, discount } = await promotionService.validatePromotion(promotionCode, eventId, subtotalAmount);
      discountAmount = discount;
      await promotionService.incrementUsageCount(promo._id);
    } catch {
      // Invalid / expired promo — proceed without discount
    }
  }

  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  // 4. Reserve inventory (atomic version without transaction)
  await inventoryManager.reserveSeatsAtomic(resolvedTickets);

  // 5. Create Order
  const order = await Order.create({
    userId,
    eventId,
    promotionCode: promotionCode || null,
    discountAmount,
    subtotalAmount,
    totalAmount,
    paymentStatus: 'pending',
    orderStatus: 'created',
    paymentMethod,
  });

  // 6. Create OrderItems
  const orderItems = resolvedTickets.map(t => ({
    orderId: order._id,
    eventId,
    ticketInfoId: t.ticketInfoId,
    quantity: t.quantity,
    unitPrice: t.unitPrice,
    totalPrice: t.totalPrice,
  }));
  await OrderItem.insertMany(orderItems);

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
  };
};

/**
 * getUserOrders
 * Returns paginated orders for a user, with event info and order items populated.
 */
exports.getUserOrders = async (userId, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);

  const orders = await Order.find({ userId })
    .populate('eventId', 'name physicalLocation startTime imageURL')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments({ userId });

  // Attach order items to each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id })
        .populate('ticketInfoId', 'ticketName price');
      return { ...order.toObject(), items };
    })
  );

  return {
    orders: ordersWithItems,
    total,
    page: Number(page),
  };
};

/**
 * getOrderById — used internally by payment & refund services
 */
exports.getOrderById = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate('eventId', 'name physicalLocation startTime');
  if (!order) throw new Error('Order not found');

  const items = await OrderItem.find({ orderId: order._id })
    .populate('ticketInfoId', 'ticketName price');

  return { ...order.toObject(), items };
};

/**
 * getOrderByIdWithSession — used within transactions
 */
exports.getOrderByIdWithSession = async (orderId, session) => {
  const order = await Order.findById(orderId)
    .populate('eventId', 'name physicalLocation startTime')
    .session(session);
  if (!order) throw new Error('Order not found');

  const items = await OrderItem.find({ orderId: order._id })
    .populate('ticketInfoId', 'ticketName price')
    .session(session);

  return { ...order.toObject(), items };
};
