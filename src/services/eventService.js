const mongoose = require('mongoose');
const Event = require('../models/Event');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

exports.createEvent = async (userId, eventData) => {
  const {
    name,
    description,
    startTime,
    endTime,
    physicalLocation,
    layout,
    imageURL,
    genreId,
    totalTicketCount,
    status
  } = eventData;

  if (!name || !startTime || !endTime) {
    throw new Error('Name, startTime, and endTime are required');
  }

  const event = new Event({
    ownerId: Number(userId),
    name,
    description,
    startTime,
    endTime,
    physicalLocation,
    layout,
    imageURL,
    genreId,
    totalTicketCount: totalTicketCount || 0,
    status: status || 'pending'
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

  // Load ticket infos for this event using either _id or legacyId
  const ticketInfos = await TicketInfo.find({
    $or: [{ eventId: event._id }, { eventId: event.legacyId }]
  }).lean();
  
  // Attach inventory for each ticket info
  const ticketInfosWithInventory = await Promise.all(ticketInfos.map(async (info) => {
    const inventory = await TicketInventory.findOne({
      $or: [{ ticketInfoId: info._id }, { ticketInfoId: info.legacyId }]
    }).lean();
    return {
      ...info,
      availableQuantity: inventory ? inventory.availableQuantity : 0,
      totalQuantity: inventory ? inventory.totalQuantity : 0
    };
  }));

  event.ticketInfos = ticketInfosWithInventory;
  
  // Load event feedbacks
  const feedbacks = await Feedback.find({
    $or: [{ eventId: event._id }, { eventId: event.legacyId }],
    isApproved: true
  }).lean();

  // Attach User info to feedbacks
  const feedbacksWithUser = await Promise.all(feedbacks.map(async (fb) => {
    let userQuery = { legacyId: fb.userId };
    if (typeof fb.userId === 'string' && mongoose.Types.ObjectId.isValid(fb.userId)) {
        userQuery = { $or: [{ _id: fb.userId }, { legacyId: fb.userId }] };
    }
    const user = await User.findOne(userQuery).lean();
    return {
      ...fb,
      userName: user ? user.username : 'Anonymous User',
      userRole: user && user.role === 'customer' ? 'Verified Ticket Buyer' : 'Super Fan'
    };
  }));

  event.feedbacks = feedbacksWithUser;

  return event;
};
exports.updateEvent = async (id, data) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error("Event not found");
  }

  Object.assign(event, data);

  return await event.save();
};

exports.deleteEvent = async (id) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error("Event not found");
  }

  event.status = "deleted";
  event.isDeleted = true;

  return await event.save();
};
