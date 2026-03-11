const Event = require('../models/eventModel');

exports.createEvent = async (userId, eventData) => {
  const { title, description, date, location, blocks, ticketTypes, layout } = eventData;
  if ((!blocks || blocks.length === 0) && !layout) {
    throw new Error('At least one section or layout required');
  }

  const totalSeats = blocks ? blocks.reduce((sum, block) => sum + (block.seats?.length || 0), 0) : 0;

  const event = new Event({
    ownerId: userId,
    title,
    description,
    date,
    location,
    blocks,
    ticketTypes,
    layout,
    totalSeats,
    status: 'PENDING'
  });

  await event.save();
  return event;
};

exports.getEvents = async () => {
  return await Event.find();
};

exports.getEventById = async (id) => {
  const event = await Event.findById(id);
  if (!event) throw new Error('Event not found');
  return event;
};
