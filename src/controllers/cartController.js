const cartService = require('../services/cartService');

exports.addToCart = async (req, res) => {
  try {
    const { eventId, ticketInfoId, quantity } = req.body;
    console.log('Add to cart request:', { eventId, ticketInfoId, quantity });

    // For development/mock purposes, if no authenticated user or userId in body, use a default test user
    const userId = req.body.userId || (req.user && req.user._id) || '507f1f77bcf86cd799439011';
    
    if (!userId) {
      console.warn('Add to cart failed: No userId');
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    const result = await cartService.addToCart(userId, eventId, ticketInfoId, quantity);
    console.log('Add to cart success:', result.cartId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: error.message });
  }
};
