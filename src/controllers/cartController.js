const cartService = require('../services/cartService');

exports.addToCart = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user._id);
    const { eventId, ticketTypeId, quantity } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    const result = await cartService.addToCart(userId, eventId, ticketTypeId, quantity);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
