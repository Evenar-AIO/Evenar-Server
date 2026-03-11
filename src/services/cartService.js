const Cart = require('../models/cartModel');
const TicketInfo = require('../models/ticketInfoModel');

exports.addToCart = async (userId, eventId, ticketInfoId, quantity) => {
  let cart = await Cart.findOne({ userId });
  const tInfo = await TicketInfo.findById(ticketInfoId);
  if (!tInfo) throw new Error('Invalid ticket category');
  
  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [{ eventId, ticketInfoId, quantity, price: tInfo.price }]
    });
  } else {
    const itemIndex = cart.items.findIndex(i => i.ticketInfoId.toString() === ticketInfoId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ eventId, ticketInfoId, quantity, price: tInfo.price });
    }
    await cart.save();
  }
  
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  
  return {
    cartId: cart._id,
    items: cart.items,
    totalPrice
  };
};
