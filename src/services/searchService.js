const Event = require('../models/Event');

exports.searchEvents = async (searchParams) => {
  const { q, category, page = 1, limit = 10 } = searchParams;
  
  const match = { isDeleted: false, isApproved: true }; // Only show approved and non-deleted events
  if (q && q.trim()) {
    const term = q.trim();
    match.$or = [
      { name: { $regex: term, $options: 'i' } },
      { physicalLocation: { $regex: term, $options: 'i' } }
    ];
  }
  
  if (category && category !== 'undefined' && category !== 'null') {
    const genreNum = Number(category);
    if (!isNaN(genreNum)) match.genreId = genreNum;
  }
  
  const skip = (Number(page) - 1) * Number(limit);
  
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'ticketInfos',
        localField: '_id',
        foreignField: 'eventId',
        as: 'ticketInfos'
      }
    },
    { $sort: { startTime: 1 } },
    { $skip: skip },
    { $limit: Number(limit) }
  ];
  
  const [events, totalCount] = await Promise.all([
    Event.aggregate(pipeline),
    Event.countDocuments(match)
  ]);
  
  return {
    events,
    totalCount,
    currentPage: Number(page),
    totalPages: Math.ceil(totalCount / Number(limit))
  };
};
