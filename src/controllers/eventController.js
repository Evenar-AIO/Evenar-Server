const { createEventSchema, updateEventSchema } = require('../validators/eventValidator');
const eventService = require('../services/eventService');

async function getEvents(req, res, next) {
  try {
    const events = eventService.listEvents(req.query, req.user || null);
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    return next(err);
  }
}

async function getEventById(req, res, next) {
  try {
    const event = eventService.getEventById(req.params.id);
    return res.status(200).json({ success: true, data: event });
  } catch (err) {
    return next(err);
  }
}

async function createEvent(req, res, next) {
  try {
    const { error, value } = createEventSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((x) => x.message).join(', ') });
    }

    const event = eventService.createEvent(value, req.user);
    return res.status(201).json({ success: true, data: event, message: 'Event created successfully' });
  } catch (err) {
    return next(err);
  }
}

async function updateEvent(req, res, next) {
  try {
    const { error, value } = updateEventSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: error.details.map((x) => x.message).join(', ') });
    }

    const event = eventService.updateEvent(req.params.id, value, req.user);
    return res.status(200).json({ success: true, data: event, message: 'Event updated successfully' });
  } catch (err) {
    return next(err);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const event = eventService.deleteEvent(req.params.id, req.user);
    return res.status(200).json({ success: true, data: event, message: 'Event deleted successfully (soft delete)' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
