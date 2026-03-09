const Booking = require('../models/bookingModel');

exports.createBooking = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user._id);
    const { eventId, tickets } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }
    
    // Mock calculate total price, should query DB for true ticket prices
    const totalPrice = tickets.reduce((sum, t) => sum + ((t.quantity || 1) * 100), 0);
    
    const booking = await Booking.create({
      userId,
      eventId,
      tickets,
      status: 'PENDING',
      totalPrice
    });
    
    res.status(201).json({
      bookingId: booking._id,
      status: booking.status,
      totalPrice: booking.totalPrice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
