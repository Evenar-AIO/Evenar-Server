const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const Event = require('../models/Event');
const inventoryManager = require('../utils/inventoryManager');

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    throw new Error('Invalid user ID format');
  }
};

const resolveTicketInfo = async (ticketInfoId) => {
  const numericId = Number(ticketInfoId);
  const query = [];

  if (mongoose.Types.ObjectId.isValid(String(ticketInfoId))) {
    query.push({ _id: ticketInfoId });
  }

  if (Number.isFinite(numericId)) {
    query.push({ legacyId: numericId });
  }

  return TicketInfo.findOne({ $or: query.length ? query : [{ _id: ticketInfoId }] });
};

const normalizeTicketInfoId = (ticketInfoId, ticketInfo) => {
  if (ticketInfo && ticketInfo.legacyId !== undefined && ticketInfo.legacyId !== null) {
    return ticketInfo.legacyId;
  }
  return ticketInfoId;
};

const idsMatch = (left, right) => String(left) === String(right);

const buildItemsWithNames = async (items) => {
  return Promise.all(items.map(async (item) => {
    const info = await resolveTicketInfo(item.ticketInfoId);
    const event = await Event.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(item.eventId) ? item.eventId : null },
        { legacyId: !isNaN(Number(item.eventId)) ? Number(item.eventId) : -1 }
      ]
    }).select('name imageURL');

    return {
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      seatIds: item.seatIds || [],
      name: info ? info.ticketName : 'Unknown Ticket',
      eventTitle: event ? event.name : 'Unknown Event',
      image: event ? event.imageURL : null,
    };
  }));
};

/**
 * addToCart - Add ticket to cart with inventory validation
 * 
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} ticketInfoId - Ticket type ID
 * @param {number} quantity - Quantity to add
 * @param {string[]} seatIds - Seat IDs for seated events
 */
exports.addToCart = async (userId, eventId, ticketInfoId, quantity, seatIds = []) => {
  const qty = Number(quantity);
  const uid = toObjectId(userId);

  if (qty <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const tInfo = await resolveTicketInfo(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  const normalizedTicketInfoId = normalizeTicketInfoId(ticketInfoId, tInfo);

  const seats = Array.isArray(seatIds) ? seatIds : [];

  let cart = await Cart.findOne({ userId: uid });

  // Calculate how many the user already has in cart for this ticket type
  let currentCartQty = 0;
  if (cart) {
    const existingItem = cart.items.find(
      (i) => idsMatch(i.ticketInfoId, normalizedTicketInfoId)
    );
    if (existingItem) {
      currentCartQty = existingItem.quantity;
      if (seats.length > 0) {
        const existingSeatIds = new Set(existingItem.seatIds || []);
        const hasOverlap = seats.some(id => existingSeatIds.has(id));
        if (hasOverlap) {
          throw new Error('One or more seats are already in your cart');
        }
      }
    }
  }

  if (seats.length > 0 && seats.length !== qty) {
    throw new Error('seatIds length must match quantity');
  }

  if (seats.length > 0) {
    await inventoryManager.reserveSeatIds(eventId, [{ seatIds: seats }]);
  }

  const totalRequestedQty = currentCartQty + qty;

  // CHECK INVENTORY BEFORE ADDING
  const hasInventory = await inventoryManager.checkAvailability(normalizedTicketInfoId, totalRequestedQty);
  if (!hasInventory) {
    const numericId = Number(normalizedTicketInfoId);
    const inventory = await TicketInventory.findOne({
      $or: [
        { ticketInfoId: Number.isFinite(numericId) ? numericId : normalizedTicketInfoId },
        { legacyTicketInfoId: Number.isFinite(numericId) ? numericId : normalizedTicketInfoId }
      ]
    });
    if (inventory) {
      const availableQty =
        inventory.totalQuantity - inventory.soldQuantity - inventory.reservedQuantity;
      const canAdd = Math.max(0, availableQty - currentCartQty);
      throw new Error(
        `Only ${canAdd} more ticket(s) available. You already have ${currentCartQty} in your cart.`
      );
    }
    throw new Error('Not enough tickets available.');
  }

  if (!cart) {
    cart = await Cart.create({
      userId: uid,
      items: [{ eventId, ticketInfoId: normalizedTicketInfoId, quantity: qty, price: tInfo.price, seatIds: seats }],
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (i) => idsMatch(i.ticketInfoId, normalizedTicketInfoId)
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
      if (seats.length > 0) {
        const existingSeatIds = new Set(cart.items[itemIndex].seatIds || []);
        const hasOverlap = seats.some(id => existingSeatIds.has(id));
        if (hasOverlap) {
          throw new Error('One or more seats are already in your cart');
        }
        cart.items[itemIndex].seatIds = Array.from(new Set([...(cart.items[itemIndex].seatIds || []), ...seats]));
      }
    } else {
      cart.items.push({ eventId, ticketInfoId: normalizedTicketInfoId, quantity: qty, price: tInfo.price, seatIds: seats });
    }
    await cart.save();
  }

  const totalPrice = cart.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const itemsWithNames = await buildItemsWithNames(cart.items);

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * addToCartWithoutInventoryCheck - Legacy method for backward compatibility
 * WARNING: This doesn't check inventory, use addToCart instead
 */
exports.addToCartWithoutInventoryCheck = async (userId, eventId, ticketInfoId, quantity, seatIds = []) => {
  const qty = Number(quantity);
  const uid = toObjectId(userId);
  let cart = await Cart.findOne({ userId: uid });
  const tInfo = await resolveTicketInfo(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  const normalizedTicketInfoId = normalizeTicketInfoId(ticketInfoId, tInfo);
  const seats = Array.isArray(seatIds) ? seatIds : [];

  if (seats.length > 0 && seats.length !== qty) {
    throw new Error('seatIds length must match quantity');
  }

  if (seats.length > 0) {
    await inventoryManager.reserveSeatIds(eventId, [{ seatIds: seats }]);
  }

  if (!cart) {
    cart = await Cart.create({
      userId: uid,
      items: [{ eventId, ticketInfoId: normalizedTicketInfoId, quantity: qty, price: tInfo.price, seatIds: seats }],
    });
  } else {
    const itemIndex = cart.items.findIndex((i) => idsMatch(i.ticketInfoId, normalizedTicketInfoId));
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
      if (seats.length > 0) {
        const existingSeatIds = new Set(cart.items[itemIndex].seatIds || []);
        const hasOverlap = seats.some(id => existingSeatIds.has(id));
        if (hasOverlap) {
          throw new Error('One or more seats are already in your cart');
        }
        cart.items[itemIndex].seatIds = Array.from(new Set([...(cart.items[itemIndex].seatIds || []), ...seats]));
      }
    } else {
      cart.items.push({ eventId, ticketInfoId: normalizedTicketInfoId, quantity: qty, price: tInfo.price, seatIds: seats });
    }
    await cart.save();
  }

  const totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const itemsWithNames = await buildItemsWithNames(cart.items);

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * getCart - Get user's cart
 */
exports.getCart = async (userId) => {
  const uid = toObjectId(userId);
  const cart = await Cart.findOne({ userId: uid });

  if (!cart) {
    return { cartId: null, items: [], totalPrice: 0 };
  }

  const totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const itemsWithNames = await buildItemsWithNames(cart.items);

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * removeFromCart - Remove item from cart
 */
exports.removeFromCart = async (userId, ticketInfoId) => {
  const uid = toObjectId(userId);
  const cart = await Cart.findOne({ userId: uid });

  if (!cart) throw new Error('Cart not found');

  await Promise.all(
    cart.items.map(item => inventoryManager.releaseSeatIds(item.eventId, [item]))
  );

  const itemIndex = cart.items.findIndex(
    (i) => idsMatch(i.ticketInfoId, ticketInfoId)
  );

  if (itemIndex === -1) throw new Error('Item not found in cart');

  await inventoryManager.releaseSeatIds(cart.items[itemIndex].eventId, [cart.items[itemIndex]]);
  cart.items.splice(itemIndex, 1);
  await cart.save();

  const totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const itemsWithNames = await buildItemsWithNames(cart.items);

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * clearCart - Clear user's cart
 */
exports.clearCart = async (userId) => {
  const uid = toObjectId(userId);
  await Cart.deleteOne({ userId: uid });
  return { cartId: null, items: [], totalPrice: 0 };
};

/**
 * validateCartInventory - Check if all items in cart are still available
 * Returns: { valid: boolean, issues: Array }
 */
exports.validateCartInventory = async (userId) => {
  const uid = toObjectId(userId);
  const cart = await Cart.findOne({ userId: uid });

  if (!cart) return { valid: true, issues: [] };

  const issues = [];

  for (const item of cart.items) {
    const hasInventory = await inventoryManager.checkAvailability(
      item.ticketInfoId,
      item.quantity
    );

    if (!hasInventory) {
      const info = await resolveTicketInfo(item.ticketInfoId);
      issues.push({
        ticketInfoId: item.ticketInfoId,
        ticketName: info ? info.ticketName : 'Unknown',
        requestedQuantity: item.quantity,
        message: `Not enough inventory for ${info?.ticketName || 'ticket'}`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
};
