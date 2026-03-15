const Event = require('../models/eventModel');
const TicketInfo = require('../models/ticketInfoModel');

exports.createEvent = async (userId, eventData) => {
  const { name, description, startTime, endTime, physicalLocation, layout, imageURL, genreId } = eventData;
  
  if (!name || !startTime || !endTime) {
    throw new Error('Name, startTime, and endTime are required');
  }

  const event = new Event({
    ownerId: userId,
    name,
    description,
    startTime,
    endTime,
    physicalLocation,
    layout, // Though not in model schema explicitly as typed, but could be 'Object'
    imageURL,
    genreId,
    status: 'active'
  });

  await event.save();
  return event;
};

exports.getEvents = async () => {
  return await Event.find({ isDeleted: false });
};

exports.getEventById = async (id) => {
  const event = await Event.findById(id).lean();
  if (!event) throw new Error('Event not found');

  // Load ticket infos for this event
  const ticketInfos = await TicketInfo.find({ eventId: event._id }).lean();
  event.ticketInfos = ticketInfos;
  
  return event;
};
