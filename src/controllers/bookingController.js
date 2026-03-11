const bookingService = require('../services/bookingService');

exports.createBooking = async (req, res) => {
  try {
    const userId = req.body.userId || (req.user && req.user._id);
    const { eventId, tickets } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }
    
    const result = await bookingService.createBooking(userId, eventId, tickets);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
