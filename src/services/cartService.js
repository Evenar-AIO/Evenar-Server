const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const TicketInfo = require('../models/ticketInfoModel');
const inventoryManager = require('../utils/inventoryManager');

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
  
  if (qty <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  
  let cart = await Cart.findOne({ userId });
  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  
  // Check if adding more would exceed available inventory
  // First, calculate current quantity in cart for this ticket type
  let currentCartQty = 0;
  if (cart) {
    const existingItem = cart.items.find(
      i => i.ticketInfoId.toString() === ticketInfoId
    );
    if (existingItem) {
      currentCartQty = existingItem.quantity;
    }
  }
  
  // Total quantity user would have after adding
  const totalRequestedQty = currentCartQty + qty;
  
  // CHECK INVENTORY BEFORE ADDING
  const hasInventory = await inventoryManager.checkAvailability(ticketInfoId, totalRequestedQty);
  if (!hasInventory) {
    const available = tInfo.quantity || 0; // If TicketInfo has quantity field
    // Try to get from inventory model
    const inv = await inventoryManager.checkAvailability(ticketInfoId, 1);
    if (!inv) {
      throw new Error('Ticket type not available');
    }
    
    // Get available quantity
    const TicketInventory = require('../models/ticketInventoryModel');
    const inventory = await TicketInventory.findOne({ ticketInfoId });
    if (inventory) {
      const availableQty = inventory.totalQuantity - inventory.soldQuantity - inventory.reservedQuantity;
      const canAdd = availableQty - currentCartQty;
      throw new Error(`Only ${canAdd} tickets available. You already have ${currentCartQty} in cart.`);
    }
    
    throw new Error(`Not enough tickets available. You already have ${currentCartQty} in cart.`);
  }
  
  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ eventId, ticketInfoId, quantity: qty, price: tInfo.price }]
    });
  } else {
    const itemIndex = cart.items.findIndex(i => i.ticketInfoId.toString() === ticketInfoId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({ eventId, ticketInfoId, quantity: qty, price: tInfo.price });
    }
    await cart.save();
  }
  
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  // Create a populated items list for the frontend to show names
  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket'
    });
  }

  return {
    cartId: cart._id,
    items: itemsWithNames,
    totalPrice
  };
};

/**
 * addToCartWithoutInventoryCheck - Legacy method for backward compatibility
 * WARNING: This doesn't check inventory, use addToCart instead
 */
exports.addToCartWithoutInventoryCheck = async (userId, eventId, ticketInfoId, quantity) => {
  const qty = Number(quantity);
  let cart = await Cart.findOne({ userId });
  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  
  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ eventId, ticketInfoId, quantity: qty, price: tInfo.price }]
    });
  } else {
    const itemIndex = cart.items.findIndex(i => i.ticketInfoId.toString() === ticketInfoId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({ eventId, ticketInfoId, quantity: qty, price: tInfo.price });
    }
    await cart.save();
  }
  
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket'
    });
  }

  return {
    cartId: cart._id,
    items: itemsWithNames,
    totalPrice
  };
};

/**
 * getCart - Get user's cart
 */
exports.getCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  
  if (!cart) {
    return {
      cartId: null,
      items: [],
      totalPrice: 0
    };
  }
  
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket'
    });
  }

  return {
    cartId: cart._id,
    items: itemsWithNames,
    totalPrice
  };
};

/**
 * removeFromCart - Remove item from cart
 */
exports.removeFromCart = async (userId, ticketInfoId) => {
  const cart = await Cart.findOne({ userId });
  
  if (!cart) {
    throw new Error('Cart not found');
  }
  
  const itemIndex = cart.items.findIndex(
    i => i.ticketInfoId.toString() === ticketInfoId
  );
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }
  
  cart.items.splice(itemIndex, 1);
  await cart.save();
  
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  const itemsWithNames = [];
  for (const item of cart.items) {
    const info = await TicketInfo.findById(item.ticketInfoId);
    itemsWithNames.push({
      eventId: item.eventId,
      ticketInfoId: item.ticketInfoId,
      quantity: item.quantity,
      price: item.price,
      name: info ? info.ticketName : 'Unknown Ticket'
    });
  }

  return {
    cartId: cart._id,
    items: itemsWithNames,
    totalPrice
  };
};

/**
 * clearCart - Clear user's cart
 */
exports.clearCart = async (userId) => {
  await Cart.deleteOne({ userId });
  return {
    cartId: null,
    items: [],
    totalPrice: 0
  };
};

/**
 * validateCartInventory - Check if all items in cart are still available
 * Returns: { valid: boolean, issues: Array }
 */
exports.validateCartInventory = async (userId) => {
  const cart = await Cart.findOne({ userId });
  
  if (!cart) {
    return { valid: true, issues: [] };
  }
  
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
        message: `Not enough inventory for ${info?.ticketName || 'ticket'}`
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};
