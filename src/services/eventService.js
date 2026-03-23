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
    status,
    ticketInfo
  } = eventData;

  if (!name || !startTime || !endTime) {
    throw new Error('Name, startTime, and endTime are required');
  }

  const event = new Event({
    ownerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
    name,
    description,
    startTime,
    endTime,
    physicalLocation,
    layout,
    imageURL,
    genreId: mongoose.Types.ObjectId.isValid(genreId) ? (typeof genreId === 'string' ? new mongoose.Types.ObjectId(genreId) : genreId) : undefined,
    totalTicketCount: totalTicketCount || 0,
    status: status || 'editing'
  });

  await event.save();

  // Create TicketInfo + TicketInventory for each ticket tier
  const createdTickets = [];
  if (Array.isArray(ticketInfo) && ticketInfo.length > 0) {
    for (const ticket of ticketInfo) {
      const ti = new TicketInfo({
        ticketName: ticket.type || ticket.ticketName || 'Standard',
        ticketDescription: ticket.description || '',
        category: ticket.type || ticket.category || 'General',
        price: Number(ticket.price) || 0,
        eventId: event._id,
        isActive: true
      });
      await ti.save();

      const inv = new TicketInventory({
        ticketInfoId: ti._id,
        totalQuantity: Number(ticket.quantity) || 0,
        availableQuantity: Number(ticket.quantity) || 0,
        soldQuantity: 0,
        reservedQuantity: 0
      });
      await inv.save();

      createdTickets.push({
        ...ti.toObject(),
        availableQuantity: inv.availableQuantity,
        totalQuantity: inv.totalQuantity
      });
    }
  }

  const result = event.toObject();
  result.ticketInfos = createdTickets;
  return result;
};

exports.getEvents = async () => {
  return await Event.find({ isDeleted: false });
};

exports.getEventById = async (id) => {
  const event = await Event.findById(id).lean();
  if (!event) throw new Error('Event not found');

  // Build query: only include legacy condition if the event has a legacyId
  const eventQuery = [{ eventId: event._id }];
  if (event.legacyId != null) {
    eventQuery.push({ legacyEventId: event.legacyId });
  }

  // Load ticket infos for this event (must be active)
  const ticketInfos = await TicketInfo.find({ $or: eventQuery, isActive: { $ne: false } }).lean();
  
  // Attach inventory for each ticket info
  const ticketInfosWithInventory = await Promise.all(ticketInfos.map(async (info) => {
    const invQuery = [{ ticketInfoId: info._id }];
    if (info.legacyId != null) {
      invQuery.push({ legacyTicketInfoId: info.legacyId });
    }
    const inventory = await TicketInventory.findOne({ $or: invQuery }).lean();
    return {
      ...info,
      availableQuantity: inventory ? inventory.availableQuantity : 0,
      totalQuantity: inventory ? inventory.totalQuantity : 0
    };
  }));

  event.ticketInfos = ticketInfosWithInventory;
  
  // Load event feedbacks
  const feedbackQuery = [{ eventId: event._id }];
  if (event.legacyId != null) {
    feedbackQuery.push({ legacyEventId: event.legacyId });
  }
  
  const feedbacks = await Feedback.find({
    $or: feedbackQuery,
    isApproved: true
  }).lean();

  // Attach User info to feedbacks
  const feedbacksWithUser = await Promise.all(feedbacks.map(async (fb) => {
    let user = null;
    if (fb.userId) {
      const userQuery = [{ _id: fb.userId }];
      if (fb.legacyUserId != null) userQuery.push({ legacyId: fb.legacyUserId });
      user = await User.findOne({ $or: userQuery }).lean();
    }
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
  if (!event) throw new Error("Event not found");

  const status = event.status?.toLowerCase() || 'editing';

  // Only 'editing' status allows full updates
  // 'live' allows only soft fields (description, imageURL)
  if (status === 'live') {
    const softFields = ['description', 'imageURL', 'image'];
    const keys = Object.keys(data);
    
    // Allow soft-only updates for live events
    const softData = {};
    for (const f of softFields) {
      if (data[f] !== undefined) softData[f] = data[f];
    }
    Object.assign(event, softData);
    return await event.save();
  }

  if (status !== 'editing' && status !== 'pending') {
    throw new Error(`Cannot update event in '${event.status}' status. Withdraw it first to make changes.`);
  }

  // Update main event data
  const { ticketInfo, ...restData } = data;
  Object.assign(event, restData);

  // Handle TicketInfo updates if present
  if (Array.isArray(ticketInfo)) {
    // 1. Get existing tickets for this event
    const existingTickets = await TicketInfo.find({ eventId: event._id });
    const existingTicketIds = existingTickets.map(t => t._id.toString());
    const incomingData = ticketInfo.filter(t => t != null);
    const incomingTicketIds = incomingData.filter(t => (t.id || t._id)).map(t => (t.id || t._id).toString());

    // 2. Prepare to track updated totals
    let updatedTotalCount = 0;

    // 3. Process each ticket in incoming list
    for (const t of incomingData) {
      const ticketId = (t.id || t._id);
      let ti;

      if (ticketId && existingTicketIds.includes(ticketId.toString())) {
        // Update existing ticket
        ti = await TicketInfo.findById(ticketId);
        if (ti) {
          ti.ticketName = t.type || t.ticketName || ti.ticketName;
          ti.price = Number(t.price) || ti.price;
          ti.category = t.type || t.category || ti.category;
          ti.ticketDescription = t.description || t.ticketDescription || ti.ticketDescription;
          ti.isActive = true;
          await ti.save();

          // Update inventory
          const inv = await TicketInventory.findOne({ ticketInfoId: ti._id });
          if (inv) {
            inv.totalQuantity = Number(t.quantity) || inv.totalQuantity;
            await inv.save();
          }
        }
      } else {
        // Create new ticket
        ti = new TicketInfo({
          ticketName: t.type || t.ticketName || 'Standard',
          ticketDescription: t.description || t.ticketDescription || '',
          category: t.type || t.category || 'General',
          price: Number(t.price) || 0,
          eventId: event._id,
          isActive: true
        });
        await ti.save();

        const inv = new TicketInventory({
          ticketInfoId: ti._id,
          totalQuantity: Number(t.quantity) || 0,
          availableQuantity: Number(t.quantity) || 0,
          soldQuantity: 0,
          reservedQuantity: 0
        });
        await inv.save();
      }
      updatedTotalCount += (Number(t.quantity) || 0);
    }

    // 4. Deactivate tickets not in incoming list
    for (const extantTi of existingTickets) {
      if (!incomingTicketIds.includes(extantTi._id.toString())) {
        extantTi.isActive = false;
        await extantTi.save();
      }
    }

    // Update total count on event
    event.totalTicketCount = updatedTotalCount;
  }

  return await event.save();
};

// Withdraw: draft -> editing (pull back from admin review)
exports.withdrawEvent = async (id, ownerId) => {
  const event = await Event.findById(id);
  if (!event) throw new Error("Event not found");

  if (event.status !== 'draft') {
    throw new Error(`Cannot withdraw. Event is '${event.status}', not 'draft'.`);
  }

  event.status = 'editing';
  return await event.save();
};

// Submit: editing -> draft (send for admin review)
exports.submitEvent = async (id, ownerId) => {
  const event = await Event.findById(id);
  if (!event) throw new Error("Event not found");

  if (event.status !== 'editing' && event.status !== 'pending') {
    throw new Error(`Cannot submit. Event is '${event.status}', not 'editing'.`);
  }

  // Basic validation before submitting
  if (!event.name || !event.startTime || !event.endTime || !event.physicalLocation) {
    throw new Error('Please fill in all required fields (name, dates, location) before submitting.');
  }

  event.status = 'draft';
  return await event.save();
};

exports.deleteEvent = async (id) => {
  const event = await Event.findById(id);
  if (!event) throw new Error("Event not found");

  event.status = "deleted";
  event.isDeleted = true;
  return await event.save();
};
