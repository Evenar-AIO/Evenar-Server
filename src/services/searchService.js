const Event = require('../models/eventModel');

exports.searchEvents = async (searchParams) => {
  const { q, category, page = 1, limit = 10 } = searchParams;
  
  const query = {};
  if (q) query.name = { $regex: q, $options: 'i' };
  if (category) query.genreId = Number(category);
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const events = await Event.find(query).skip(skip).limit(Number(limit));
  const totalCount = await Event.countDocuments(query);
  
  return {
    events,
    totalCount,
    currentPage: Number(page),
    totalPages: Math.ceil(totalCount / Number(limit))
  };
};
