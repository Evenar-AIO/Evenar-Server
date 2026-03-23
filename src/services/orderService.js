const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Event = require('../models/Event');
const TicketInfo = require('../models/ticketInfoModel');
const inventoryManager = require('../utils/inventoryManager');
const promotionService = require('./promotionService');

const attachTicketInfo = async (items) => {
  return Promise.all(items.map(async (item) => {
    const numericId = Number(item.ticketInfoId);
    const query = [];
    if (mongoose.Types.ObjectId.isValid(String(item.ticketInfoId))) {
      query.push({ _id: item.ticketInfoId });
    }
    if (Number.isFinite(numericId)) {
      query.push({ legacyId: numericId });
    }
    const ticket = await TicketInfo.findOne({ $or: query.length ? query : [{ _id: item.ticketInfoId }] })
      .select('ticketName price');

    return {
      ...item.toObject(),
      ticketInfo: ticket
    };
  }));
};

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
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (error) {
    if (String(error?.message || '').includes('replica set')) {
      return exports.createOrderWithoutTransaction(userId, eventId, tickets, promotionCode, paymentMethod);
    }
    throw error;
  }

  try {
    // 1. Validate event
    const numericEventId = Number(eventId);
    const eventQuery = [];
    if (mongoose.Types.ObjectId.isValid(String(eventId))) {
      eventQuery.push({ _id: eventId });
    }
    if (Number.isFinite(numericEventId)) {
      eventQuery.push({ legacyId: numericEventId });
    }

    const event = await Event.findOne({ $or: eventQuery.length ? eventQuery : [{ _id: eventId }] }).session(session);
    if (!event) {
      throw new Error('Event not found');
    }

    // 2. Resolve ticket prices & compute subtotal
    let subtotalAmount = 0;
    const resolvedTickets = [];

    for (const t of tickets) {
      const ticketInfoId = t.ticketInfoId;
      const numericTicketId = Number(ticketInfoId);
      const ticketQuery = [];
      if (mongoose.Types.ObjectId.isValid(String(ticketInfoId))) {
        ticketQuery.push({ _id: ticketInfoId });
      }
      if (Number.isFinite(numericTicketId)) {
        ticketQuery.push({ legacyId: numericTicketId });
      }

      const tInfo = await TicketInfo.findOne({ $or: ticketQuery.length ? ticketQuery : [{ _id: ticketInfoId }] }).session(session);
      if (!tInfo) {
        throw new Error(`Invalid ticket type: ${ticketInfoId}`);
      }

      const qty = Number(t.quantity) || 1;
      const seatIds = Array.isArray(t.seatIds) ? t.seatIds : [];
      if (seatIds.length > 0 && seatIds.length !== qty) {
        throw new Error('seatIds length must match quantity');
      }

      const unitPrice = Number(tInfo.price);
      subtotalAmount += unitPrice * qty;

      resolvedTickets.push({
        ticketInfoId: tInfo._id,
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
        seatIds,
      });
    }

    // 3. Apply promotion code (optional)
    let discountAmount = 0;
    if (promotionCode) {
      try {
        // Use atomic validation + increment 
        const { discount } = await promotionService.validateAndUsePromotion(
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
    const totalQuantity = resolvedTickets.reduce((sum, t) => sum + t.quantity, 0);

    // 4. Reserve inventory (with session for transaction safety)
    await inventoryManager.reserveSeatsWithSession(resolvedTickets, session);
    if (event.hasSeatingChart) {
      await inventoryManager.reserveSeatIdsWithSession(event._id, resolvedTickets, session);
      await inventoryManager.validateSeatIdsReservedWithSession(event._id, resolvedTickets, session);
    }

    // 5. Create Order
    const resolvedEventId = event._id || eventId;

    const [order] = await Order.create([{
      userId,
      eventId: resolvedEventId,
      promotionCode: promotionCode || null,
      discountAmount,
      subtotalAmount,
      totalAmount,
      totalQuantity,
      paymentStatus: 'pending',
      orderStatus: 'created',
      paymentMethod,
    }], { session });

    // 6. Create OrderItems
    const orderItems = resolvedTickets.map(t => ({
      orderId: order._id,
      eventId: resolvedEventId,
      ticketInfoId: t.ticketInfoId,
      quantity: t.quantity,
      unitPrice: t.unitPrice,
      totalPrice: t.totalPrice,
      seatIds: t.seatIds || [],
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
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    if (String(error?.message || '').includes('replica set')) {
      return exports.createOrderWithoutTransaction(userId, eventId, tickets, promotionCode, paymentMethod);
    }
    throw error;
  }
};

/**
 * createOrderWithoutTransaction - Legacy method for backward compatibility
 * WARNING: Has race condition issues, use createOrder instead
 */
exports.createOrderWithoutTransaction = async (userId, eventId, tickets, promotionCode = null, paymentMethod = 'VNPAY') => {
  // 1. Validate event
  const numericEventId = Number(eventId);
  const eventQuery = [];
  if (mongoose.Types.ObjectId.isValid(String(eventId))) {
    eventQuery.push({ _id: eventId });
  }
  if (Number.isFinite(numericEventId)) {
    eventQuery.push({ legacyId: numericEventId });
  }

  const event = await Event.findOne({ $or: eventQuery.length ? eventQuery : [{ _id: eventId }] });
  if (!event) throw new Error('Event not found');

  // 2. Resolve ticket prices & compute subtotal
  let subtotalAmount = 0;
  const resolvedTickets = [];

  for (const t of tickets) {
    const numericTicketId = Number(t.ticketInfoId);
    const ticketQuery = [];
    if (mongoose.Types.ObjectId.isValid(String(t.ticketInfoId))) {
      ticketQuery.push({ _id: t.ticketInfoId });
    }
    if (Number.isFinite(numericTicketId)) {
      ticketQuery.push({ legacyId: numericTicketId });
    }

    const tInfo = await TicketInfo.findOne({ $or: ticketQuery.length ? ticketQuery : [{ _id: t.ticketInfoId }] });
    if (!tInfo) throw new Error(`Invalid ticket type: ${t.ticketInfoId}`);

    const qty = Number(t.quantity) || 1;
    const seatIds = Array.isArray(t.seatIds) ? t.seatIds : [];
    if (seatIds.length > 0 && seatIds.length !== qty) {
      throw new Error('seatIds length must match quantity');
    }

    const unitPrice = Number(tInfo.price);
    subtotalAmount += unitPrice * qty;

    resolvedTickets.push({
      ticketInfoId: tInfo._id,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      seatIds,
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
  const totalQuantity = resolvedTickets.reduce((sum, t) => sum + t.quantity, 0);

  // 4. Reserve inventory (atomic version without transaction)
  await inventoryManager.reserveSeatsAtomic(resolvedTickets);
  if (event.hasSeatingChart) {
    await inventoryManager.reserveSeatIds(event._id, resolvedTickets);
    await inventoryManager.validateSeatIdsReserved(event._id, resolvedTickets);
  }

  const resolvedEventId = event._id || eventId;

  // 5. Create Order
  const order = await Order.create({
    userId,
    eventId: resolvedEventId,
    promotionCode: promotionCode || null,
    discountAmount,
    subtotalAmount,
    totalAmount,
    totalQuantity,
    paymentStatus: 'pending',
    orderStatus: 'created',
    paymentMethod,
  });

  // 6. Create OrderItems
  const orderItems = resolvedTickets.map(t => ({
    orderId: order._id,
    eventId: resolvedEventId,
    ticketInfoId: t.ticketInfoId,
    quantity: t.quantity,
    unitPrice: t.unitPrice,
    totalPrice: t.totalPrice,
    seatIds: t.seatIds || [],
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

  // Support both ObjectId and legacy Number userId
  const userFilter = mongoose.Types.ObjectId.isValid(userId)
    ? { $or: [{ userId: userId }, { userId: new mongoose.Types.ObjectId(userId) }] }
    : { userId };

  const orders = await Order.find(userFilter)
    .populate('eventId', 'name physicalLocation startTime imageURL')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(userFilter);

  // Attach order items to each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id });
      const itemsWithTickets = await attachTicketInfo(items);
      return { ...order.toObject(), items: itemsWithTickets };
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

  const items = await OrderItem.find({ orderId: order._id });
  const itemsWithTickets = await attachTicketInfo(items);

  return { ...order.toObject(), items: itemsWithTickets };
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
    .session(session);
  const itemsWithTickets = await attachTicketInfo(items);

  return { ...order.toObject(), items: itemsWithTickets };
};
