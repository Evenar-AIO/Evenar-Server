const cartService = require('../services/cartService');

exports.addToCart = async (req, res) => {
  try {
    const { eventId, ticketInfoId, quantity, seatIds } = req.body;
    const userId = req.user.sub || req.user.id || req.user._id;

    if (!eventId || !ticketInfoId || !quantity) {
      return res.status(400).json({ error: 'eventId, ticketInfoId, and quantity are required' });
    }

    const result = await cartService.addToCart(userId, eventId, ticketInfoId, quantity, seatIds);
    res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('Only')
      ? 400
      : 500;
    res.status(status).json({ error: error.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const result = await cartService.getCart(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { ticketInfoId } = req.params;
    const userId = req.user.sub || req.user.id || req.user._id;
    const result = await cartService.removeFromCart(userId, ticketInfoId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const result = await cartService.clearCart(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { ticketInfoId } = req.params;
    const { delta } = req.body;
    const userId = req.user.sub || req.user.id || req.user._id;

    if (delta === undefined || delta === 0) {
      return res.status(400).json({ error: 'delta is required and must be non-zero' });
    }

    if (delta > 0) {
      // Increase: reuse addToCart but we need to find the eventId from existing cart item
      const cart = await require('../services/cartService').getCart(userId);
      const existingItem = cart.items.find(i => i.ticketInfoId.toString() === ticketInfoId);
      const eventId = existingItem ? existingItem.eventId : null;
      if (!eventId) {
        return res.status(404).json({ error: 'Item not found in cart' });
      }
      const result = await cartService.addToCart(userId, eventId, ticketInfoId, delta);
      return res.status(200).json(result);
    } else {
      // Decrease: directly update quantity in the cart
      const mongoose = require('mongoose');
      const Cart = require('../models/cartModel');
      const uid = new mongoose.Types.ObjectId(String(userId));
      const cart = await Cart.findOne({ userId: uid });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      const itemIndex = cart.items.findIndex(i => i.ticketInfoId.toString() === ticketInfoId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found in cart' });
      }

      cart.items[itemIndex].quantity += delta; // delta is negative
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
      await cart.save();

      const result = await cartService.getCart(userId);
      return res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
