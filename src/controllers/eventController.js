const eventService = require("../services/eventService");
const { getIO } = require("../../socket");
const Notification = require("../models/Notification");
const User = require("../models/User");

const getEvents = async (req, res) => {
  try {
    const events = await eventService.getEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id);
    if (!ownerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const events = await eventService.getEventsByOwner(ownerId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.json(event);
  } catch (err) {
    res
      .status(err.message === "Event not found" ? 404 : 500)
      .json({ message: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id || req.headers["x-user-id"]);
    const { date, location, image, ticketInfo, zones, genre } = req.body;

    if (!ownerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const event = await eventService.createEvent(ownerId, {
      ...req.body,
      startTime: req.body.startTime || date,
      endTime: req.body.endTime || date,
      physicalLocation: req.body.physicalLocation || location,
      imageURL: req.body.imageURL || image,
      genreId: req.body.genreId || (Number(genre) || undefined),
      layout: req.body.layout || zones,
      totalTicketCount: req.body.totalTicketCount || (Array.isArray(ticketInfo)
        ? ticketInfo.reduce((sum, t) => sum + Number(t.quantity || 0), 0)
        : 0)
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id || req.headers["x-user-id"]);
    if (!ownerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('--- Update Event Request ---');
    console.log('ID:', req.params.id);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { date, location, image, ticketInfo, zones, genre } = req.body;
    
    const payload = {
      ...req.body,
      startTime: req.body.startTime || date,
      endTime: req.body.endTime || date,
      physicalLocation: req.body.physicalLocation || location,
      imageURL: req.body.imageURL || image,
      genreId: req.body.genreId || (Number(genre) || undefined),
      layout: req.body.layout || zones,
      totalTicketCount: req.body.totalTicketCount || (Array.isArray(ticketInfo)
        ? ticketInfo.reduce((sum, t) => sum + Number(t.quantity || 0), 0)
        : undefined)
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const event = await eventService.updateEvent(req.params.id, payload);

    res.json(event);
  } catch (err) {
    console.error('Update Event Error:', err.message);
    res.status(400).json({ message: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id);
    if (!ownerId) return res.status(401).json({ message: 'Authentication required' });
    const event = await eventService.deleteEvent(req.params.id);
    res.json({ message: "Event deleted", event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const withdrawEvent = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id);
    if (!ownerId) return res.status(401).json({ message: 'Authentication required' });
    const event = await eventService.withdrawEvent(req.params.id, ownerId);
    res.json({ message: "Event withdrawn from review", event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const submitEvent = async (req, res) => {
  try {
    const ownerId = req.user && (req.user.sub || req.user._id || req.user.id);
    if (!ownerId) return res.status(401).json({ message: 'Authentication required' });
    
    const event = await eventService.submitEvent(req.params.id, ownerId);

    // Notify admins
    try {
        const admins = await User.find({ role: 'admin' });
        const io = getIO();
        
        if (io && admins.length > 0) {
            for (const admin of admins) {
                const adminId = admin._id.toString();
                const notifData = {
                    userId: admin._id,
                    title: 'Yêu cầu duyệt sự kiện mới',
                    body: `Sự kiện "${event.name}" vừa được gửi chờ duyệt.`,
                    type: 'system',
                    read: false,
                    targetId: event._id,
                    targetModel: 'Event'
                };
                const newNotif = await Notification.create(notifData);
                io.to(`user:${adminId}`).emit('notification', newNotif);
            }
        }
    } catch (notifErr) {
        console.error('Submit event notification error:', notifErr);
    }

    res.json({ message: "Event submitted for review", event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  getEvents,
  getMyEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  withdrawEvent,
  submitEvent,
};