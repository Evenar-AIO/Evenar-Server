const mongoose = require('mongoose');

exports.searchEvents = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10, minPrice, maxPrice } = req.query;
    
    // Using native Mongoose connection for Event model (sinceVy is implementing it)
    const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));
    
    const query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (category) query.genreId = Number(category);
    // price filtering logic would go here if events had price ranges mapped out directly
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const events = await Event.find(query).skip(skip).limit(Number(limit));
    const totalCount = await Event.countDocuments(query);
    
    res.status(200).json({
      events,
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
