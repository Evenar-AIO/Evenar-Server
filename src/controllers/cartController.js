const Cart = require('../models/cartModel');

exports.addToCart = async (req, res) => {
  try {
    // userId should be extracted from req.user set by auth middleware, but we use req.body/req.user
    const userId = req.body.userId || (req.user && req.user._id);
    const { eventId, ticketTypeId, quantity } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ eventId, ticketTypeId, quantity, price: 100 }] // MOCK PRICE 100 (in a real scenario, fetch ticket price from DB)
      });
    } else {
      const itemIndex = cart.items.findIndex(i => i.eventId.toString() === eventId && i.ticketTypeId === ticketTypeId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ eventId, ticketTypeId, quantity, price: 100 });
      }
      await cart.save();
    }
    
    const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    res.status(200).json({
      cartId: cart._id,
      items: cart.items,
      totalPrice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
