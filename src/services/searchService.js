const Event = require('../models/eventModel');

exports.searchEvents = async (searchParams) => {
  const { q, category, page = 1, limit = 10 } = searchParams;
  
  const query = {};
  if (q && q.trim()) query.name = { $regex: q.trim(), $options: 'i' };
  
  if (category && category !== 'undefined' && category !== 'null') {
    const genreNum = Number(category);
    if (!isNaN(genreNum)) query.genreId = genreNum;
  }
  
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
