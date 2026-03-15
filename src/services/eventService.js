const Event = require("../models/eventModel");
const Zone = require("../models/Zone");
const Seat = require("../models/Seat");
const TicketInfo = require("../models/ticketInfoModel");
const TicketInventory = require("../models/ticketInventoryModel");

const getEvents = async () => {
  return await Event.find().populate("owner", "name email");
};

const createEvent = async (data, ownerId) => {
  const { zones, ticketInfo, genre, ...eventData } = data;

  // Map fields from validator/frontend to eventModel
  const mappedEventData = {
    ...eventData,
    physicalLocation: data.location || eventData.physicalLocation,
    startTime: data.date || eventData.startTime,
    endTime: data.date || eventData.endTime, // Default to same as start for now
    imageURL: data.imageUrl || data.imageURL || eventData.imageURL,
    owner: ownerId,
    status: data.status || "pending"
  };

  const event = new Event(mappedEventData);

  if (genre) {
    // If genre is passed as string, we might need to find its ObjectId.
    // For now we'll just skip it or assume it's already an ObjectId/handled elsewhere.
    // But let's at least not crash.
  }

  await event.save();

  // Create zones and seats if provided
  const zoneMap = {};
  if (zones && Array.isArray(zones)) {
    for (const z of zones) {
      const newZone = new Zone({
        event: event._id,
        name: z.name,
        capacity: z.capacity
      });
      await newZone.save();
      zoneMap[z.name] = newZone._id;

      // Auto-generate seats for this zone
      const seatsToCreate = [];
      for (let i = 1; i <= z.capacity; i++) {
        seatsToCreate.push({
          zone: newZone._id,
          row: 'A', // Simplified for demo
          number: i
        });
      }
      if (seatsToCreate.length > 0) {
        await Seat.insertMany(seatsToCreate);
      }
    }
  }

  // Create ticket infos and inventory
  if (ticketInfo && Array.isArray(ticketInfo)) {
    for (const t of ticketInfo) {
      const newTicketInfo = new TicketInfo({
        eventId: event._id,
        ticketName: t.type || t.name,
        price: t.price,
        zone: zoneMap[t.type] || null 
      });
      await newTicketInfo.save();

      const newInventory = new TicketInventory({
        ticketInfoId: newTicketInfo._id,
        totalQuantity: t.quantity,
        availableQuantity: t.quantity
      });
      await newInventory.save();
    }
  }

  return event;
};

const updateEvent = async (id, data) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error("Event not found");
  }

  // Map fields from validator/frontend to eventModel
  const mappedData = {
    ...data,
    physicalLocation: data.location || data.physicalLocation,
    startTime: data.date || data.startTime,
    endTime: data.date || data.endTime,
    imageURL: data.imageUrl || data.imageURL || data.image
  };

  Object.assign(event, mappedData);

  return await event.save();
};

const deleteEvent = async (id) => {
  const event = await Event.findById(id);

  if (!event) {
    throw new Error("Event not found");
  }

  event.status = "deleted";

  return await event.save();
};

const getEventById = async (id) => {
  const event = await Event.findById(id).populate("owner", "name email");
  if (!event) {
    throw new Error("Event not found");
  }
  return event;
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
