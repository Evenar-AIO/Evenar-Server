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
    const { delta, quantity } = req.body;
    const userId = req.user.sub || req.user.id || req.user._id;

    if (delta === undefined && quantity === undefined) {
      return res.status(400).json({ error: 'delta or quantity is required' });
    }

    const cart = await cartService.getCart(userId);
    const existingItem = cart.items.find(i => i.ticketInfoId.toString() === ticketInfoId);
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    let finalDelta = delta;
    if (quantity !== undefined) {
      finalDelta = Number(quantity) - existingItem.quantity;
    }

    if (finalDelta === 0) {
      return res.status(200).json(cart);
    }

    if (finalDelta > 0) {
      const result = await cartService.addToCart(userId, existingItem.eventId, ticketInfoId, finalDelta);
      return res.status(200).json(result);
    } else {
      // Decrease: directly update quantity in the cart
      const mongoose = require('mongoose');
      const Cart = require('../models/cartModel');
      const uid = new mongoose.Types.ObjectId(String(userId));
      const cartDoc = await Cart.findOne({ userId: uid });
      
      const itemIndex = cartDoc.items.findIndex(i => i.ticketInfoId.toString() === ticketInfoId);
      cartDoc.items[itemIndex].quantity += finalDelta; 
      
      if (cartDoc.items[itemIndex].quantity <= 0) {
        cartDoc.items.splice(itemIndex, 1);
      }
      
      await cartDoc.save();
      const result = await cartService.getCart(userId);
      return res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
