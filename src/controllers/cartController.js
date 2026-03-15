const cartService = require('../services/cartService');

exports.addToCart = async (req, res) => {
  try {
    const { eventId, ticketInfoId, quantity, userId: bodyUserId } = req.body;
    const userId = bodyUserId || (req.user && req.user._id);

    if (!userId) {
      return res.status(400).json({ error: 'userId is required in the request body' });
    }

    if (!eventId || !ticketInfoId || !quantity) {
      return res.status(400).json({ error: 'eventId, ticketInfoId, and quantity are required' });
    }

    const result = await cartService.addToCart(userId, eventId, ticketInfoId, quantity);
    res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('required')
      ? 400
      : 500;
    res.status(status).json({ error: error.message });
  }
};
