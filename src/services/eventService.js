const Event = require("../models/Event");

const Zone = require("../models/Zone");
const Seat = require("../models/Seat");
const TicketInfo = require("../models/TicketInfo");
const TicketInventory = require("../models/TicketInventory");

const getEvents = async () => {
  return await Event.find().populate("owner", "name email");
};

const createEvent = async (data, ownerId) => {
  const { zones, ticketInfo, genre, ...eventData } = data;

  const event = new Event({
    ...eventData,
    owner: ownerId,
    status: data.status || "pending"
  });

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
        event: event._id,
        name: t.type,
        price: t.price,
        zone: zoneMap[t.type] || null // Linked if ticket type matches zone name
      });
      await newTicketInfo.save();

      const newInventory = new TicketInventory({
        ticketInfo: newTicketInfo._id,
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

  Object.assign(event, data);

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

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
};
