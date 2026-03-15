const cartService = require('../services/cartService');

exports.addToCart = async (req, res) => {
  try {
    const { eventId, ticketInfoId, quantity } = req.body;
    const userId = req.user.sub || req.user.id || req.user._id;

    if (!eventId || !ticketInfoId || !quantity) {
      return res.status(400).json({ error: 'eventId, ticketInfoId, and quantity are required' });
    }

    const result = await cartService.addToCart(userId, eventId, ticketInfoId, quantity);
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

    if (delta === undefined) {
      return res.status(400).json({ error: 'delta is required' });
    }

    const result = await cartService.addToCart(userId, null, ticketInfoId, delta);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
