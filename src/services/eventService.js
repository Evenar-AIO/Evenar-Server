const mongoose = require('mongoose');
const Event = require('../models/Event');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const User = require('../models/User');

/**
 * getEvents
 * Returns all non-deleted events, sorted by creation date.
 */
exports.getEvents = async () => {
    return await Event.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

/**
 * getEventById
 * Returns a single event by ID or legacyId, with ticket info populated.
 */
exports.getEventById = async (id) => {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { legacyId: Number(id) };
    const event = await Event.findOne(query).populate('genreId').lean();
    if (!event) throw new Error("Event not found");

    // Fetch associated tickets
    const tickets = await TicketInfo.find({ eventId: event._id }).lean();
    
    // Get ticket inventories for each ticket
    const ticketsWithInventory = await Promise.all(tickets.map(async (t) => {
        const inv = await TicketInventory.findOne({ ticketInfoId: t._id }).lean();
        return {
            ...t,
            quantity: inv ? inv.totalQuantity : 0,
            available: inv ? inv.availableQuantity : 0,
            type: t.ticketName // Mapping for frontend consistency
        };
    }));

    return { ...event, ticketInfo: ticketsWithInventory };
};

/**
 * createEvent
 * Creates a new event and its initial ticket tiers.
 */
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
    ticketInfo,
    venueMap,
    hasSeatingChart,
    zones
  } = eventData;

  const finalLayout = layout || zones;

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
    layout: finalLayout,
    imageURL,
    venueMap,
    hasSeatingChart: hasSeatingChart || (Array.isArray(finalLayout) && finalLayout.length > 0),
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
        eventId: event._id
      });
      await inv.save();
      createdTickets.push({ ticketInfo: ti, inventory: inv });
    }
  }

  return { event, tickets: createdTickets };
};

/**
 * updateEvent
 * Updates an existing event. Handles soft updates for live events and full updates for others.
 */
exports.updateEvent = async (id, data) => {
    const event = await Event.findById(id);
    if (!event) throw new Error("Event not found");

    const currentStatus = (event.status || 'editing').toLowerCase();

    // Partial update for LIVE events
    if (currentStatus === 'live') {
        const allowedFields = ['description', 'imageURL', 'organizerName', 'ageLimit', 'dressCode'];
        const updateData = {};
        allowedFields.forEach(f => {
            if (data[f] !== undefined) updateData[f] = data[f];
        });
        
        Object.assign(event, updateData);
        return await event.save();
    }

    // Full update for non-live events
    const { ticketInfo, zones, layout, ...restData } = data;
    const finalLayout = layout || zones;
    
    // Update core fields
    Object.assign(event, restData);
    if (finalLayout !== undefined) {
        event.layout = finalLayout;
        event.hasSeatingChart = Array.isArray(finalLayout) && finalLayout.length > 0;
    }

    await event.save();

    // Sync TicketInfo if provided
    if (Array.isArray(ticketInfo)) {
        // Simple logic: delete old, create new (or identify by name to preserve IDs if needed)
        // For now, let's keep it simple as per existing patterns
        for (const t of ticketInfo) {
            const ticketId = t._id || t.id;
            const price = Number(t.price);
            const qty = Number(t.quantity);

            if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
                // Update existing
                await TicketInfo.findByIdAndUpdate(ticketId, {
                    ticketName: t.type || t.ticketName,
                    price: price,
                    isActive: true
                });
                await TicketInventory.findOneAndUpdate(
                    { ticketInfoId: ticketId },
                    { totalQuantity: qty, availableQuantity: qty }
                );
            } else {
                // Create new
                const ti = await TicketInfo.create({
                    ticketName: t.type || t.ticketName || 'Standard',
                    price: price,
                    eventId: event._id,
                    isActive: true
                });
                await TicketInventory.create({
                    ticketInfoId: ti._id,
                    totalQuantity: qty,
                    availableQuantity: qty,
                    eventId: event._id
                });
            }
        }
    }

    return event;
};

/**
 * deleteEvent
 * Marks an event as deleted.
 */
exports.deleteEvent = async (id) => {
    return await Event.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
};

/**
 * withdrawEvent
 * Moves an event from 'pending' or 'draft' back to 'editing'.
 */
exports.withdrawEvent = async (id, ownerId) => {
    const event = await Event.findById(id);
    if (!event) throw new Error("Event not found");
    event.status = 'editing';
    return await event.save();
};

/**
 * submitEvent
 * Moves an event from 'editing' to 'pending' for admin approval.
 */
exports.submitEvent = async (id, ownerId) => {
    const event = await Event.findById(id);
    if (!event) throw new Error("Event not found");
    event.status = 'pending';
    return await event.save();
};
