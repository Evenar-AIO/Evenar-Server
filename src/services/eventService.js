const { readStore, writeStore, generateId } = require('../utils/fileStore');

function normalizeTicketInventory(ticketInfo = []) {
  return ticketInfo.map((item) => ({
    type: item.type,
    total: item.quantity,
    available: item.quantity,
    sold: 0,
  }));
}

function listEvents(filters = {}, user = null) {
  const store = readStore();
  let events = [...store.events];

  if (filters.ownerOnly === 'true' && user) {
    events = events.filter((event) => event.ownerId === user.id);
  }

  if (filters.name) {
    const name = filters.name.toLowerCase();
    events = events.filter((event) => event.name.toLowerCase().includes(name));
  }

  if (filters.genre) {
    const genre = filters.genre.toLowerCase();
    events = events.filter((event) => event.genre.toLowerCase().includes(genre));
  }

  if (filters.status) {
    events = events.filter((event) => event.status === filters.status);
  }

  return events;
}

function createEvent(payload, user) {
  const store = readStore();
  const now = new Date().toISOString();
  const event = {
    id: generateId('evt'),
    ownerId: user.id,
    ...payload,
    ticketInventory: normalizeTicketInventory(payload.ticketInfo),
    createdAt: now,
    updatedAt: now,
  };

  store.events.push(event);
  writeStore(store);
  return event;
}

function updateEvent(eventId, payload, user) {
  const store = readStore();
  const eventIndex = store.events.findIndex((event) => event.id === eventId);

  if (eventIndex === -1) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existing = store.events[eventIndex];
  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'Admin';
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to update this event');
    error.status = 403;
    throw error;
  }

  const merged = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  if (payload.ticketInfo) {
    merged.ticketInventory = normalizeTicketInventory(payload.ticketInfo);
  }

  store.events[eventIndex] = merged;
  writeStore(store);
  return merged;
}

function deleteEvent(eventId, user) {
  const store = readStore();
  const eventIndex = store.events.findIndex((event) => event.id === eventId);

  if (eventIndex === -1) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }

  const existing = store.events[eventIndex];
  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'Admin';
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to delete this event');
    error.status = 403;
    throw error;
  }

  store.events[eventIndex] = {
    ...existing,
    status: 'deleted',
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.events[eventIndex];
}

function getEventById(eventId) {
  const store = readStore();
  const event = store.events.find((item) => item.id === eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.status = 404;
    throw error;
  }
  return event;
}

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
};
