const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const inventoryManager = require('../utils/inventoryManager');

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    throw new Error('Invalid user ID format');
  }
};

/**
 * addToCart - Add ticket to cart with inventory validation
 * 
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} ticketInfoId - Ticket type ID
 * @param {number} quantity - Quantity to add
 */
exports.addToCart = async (userId, eventId, ticketInfoId, quantity) => {
  const qty = Number(quantity);
  const uid = toObjectId(userId);

  if (qty <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');

  let cart = await Cart.findOne({ userId: uid });

  // Calculate how many the user already has in cart for this ticket type
  let currentCartQty = 0;
  if (cart) {
    const existingItem = cart.items.find(
      (i) => i.ticketInfoId.toString() === ticketInfoId
    );
    if (existingItem) currentCartQty = existingItem.quantity;
  }

  const totalRequestedQty = currentCartQty + qty;

  // CHECK INVENTORY BEFORE ADDING
  const hasInventory = await inventoryManager.checkAvailability(ticketInfoId, totalRequestedQty);
  if (!hasInventory) {
    const inventory = await TicketInventory.findOne({ ticketInfoId });
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
      items: [{ eventId, ticketInfoId, quantity: qty, price: tInfo.price }],
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (i) => i.ticketInfoId.toString() === ticketInfoId
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({ eventId, ticketInfoId, quantity: qty, price: tInfo.price });
    }
    await cart.save();
  }

  const totalPrice = cart.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    // Hybrid lookup for event
    const event = await Event.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(item.eventId) ? item.eventId : null }, 
        { legacyId: !isNaN(Number(item.eventId)) ? Number(item.eventId) : -1 }
      ] 
    }).select('name imageURL');
    
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket',
      eventTitle: event ? event.name : 'Unknown Event',
      image: event ? event.imageURL : null,
    });
  }

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * addToCartWithoutInventoryCheck - Legacy method for backward compatibility
 * WARNING: This doesn't check inventory, use addToCart instead
 */
exports.addToCartWithoutInventoryCheck = async (userId, eventId, ticketInfoId, quantity) => {
  const qty = Number(quantity);
  const uid = toObjectId(userId);
  let cart = await Cart.findOne({ userId: uid });
  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');

  if (!cart) {
    cart = await Cart.create({
      userId: uid,
      items: [{ eventId, ticketInfoId, quantity: qty, price: tInfo.price }],
    });
  } else {
    const itemIndex = cart.items.findIndex((i) => i.ticketInfoId.toString() === ticketInfoId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({ eventId, ticketInfoId, quantity: qty, price: tInfo.price });
    }
    await cart.save();
  }

  const totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    // Hybrid lookup for event
    const event = await Event.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(item.eventId) ? item.eventId : null }, 
        { legacyId: !isNaN(Number(item.eventId)) ? Number(item.eventId) : -1 }
      ] 
    }).select('name imageURL');
    
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket',
      eventTitle: event ? event.name : 'Unknown Event',
      image: event ? event.imageURL : null,
    });
  }

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

  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    // Hybrid lookup for event
    const event = await Event.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(item.eventId) ? item.eventId : null }, 
        { legacyId: !isNaN(Number(item.eventId)) ? Number(item.eventId) : -1 }
      ] 
    }).select('name imageURL');
    
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket',
      eventTitle: event ? event.name : 'Unknown Event',
      image: event ? event.imageURL : null,
    });
  }

  return { cartId: cart._id, items: itemsWithNames, totalPrice };
};

/**
 * removeFromCart - Remove item from cart
 */
exports.removeFromCart = async (userId, ticketInfoId) => {
  const uid = toObjectId(userId);
  const cart = await Cart.findOne({ userId: uid });

  if (!cart) throw new Error('Cart not found');

  const itemIndex = cart.items.findIndex(
    (i) => i.ticketInfoId.toString() === ticketInfoId
  );

  if (itemIndex === -1) throw new Error('Item not found in cart');

  cart.items.splice(itemIndex, 1);
  await cart.save();

  const totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    // Hybrid lookup for event
    const event = await Event.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(item.eventId) ? item.eventId : null }, 
        { legacyId: !isNaN(Number(item.eventId)) ? Number(item.eventId) : -1 }
      ] 
    }).select('name imageURL');
    
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket',
      eventTitle: event ? event.name : 'Unknown Event',
      image: event ? event.imageURL : null,
    });
  }

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
      const info = await TicketInfo.findById(item.ticketInfoId);
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
