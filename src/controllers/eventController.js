const eventService = require('../services/eventService');

exports.createEvent = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const event = await eventService.createEvent(userId, req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await eventService.getEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.json(event);
  } catch (error) {
    res.status(error.message === 'Event not found' ? 404 : 500).json({ error: error.message });
  }
};
