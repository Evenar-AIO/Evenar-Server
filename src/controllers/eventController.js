const eventService = require("../services/eventService");

const getEvents = async (req, res) => {
  try {
    const events = await eventService.getEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];

    const event = await eventService.createEvent(req.body, ownerId);

    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);

    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await eventService.deleteEvent(req.params.id);

    res.json({ message: "Event deleted", event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
};

// const eventService = require('../services/eventService');

// exports.createEvent = async (req, res) => {
//   try {
//     const userId = req.user?.id || req.body.userId;
//     const event = await eventService.createEvent(userId, req.body);
//     res.status(201).json(event);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.getEvents = async (req, res) => {
//   try {
//     const events = await eventService.getEvents();
//     res.json(events);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getEventById = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.json(event);
  } catch (error) {
    res.status(error.message === 'Event not found' ? 404 : 500).json({ error: error.message });
  }
};
