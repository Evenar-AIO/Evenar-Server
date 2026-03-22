const mongoose = require('mongoose');
const TicketInventory = require('../models/ticketInventoryModel');
const Event = require('../models/Event');

/**
 * Helpers expect an array of objects with { ticketInfoId, quantity }
 * — works for both raw ticket input and OrderItem documents.
 */

/**
 * checkAvailability - checks if there are enough tickets available
 * Returns: boolean
 */
const resolveTicketInventoryQuery = (ticketInfoId) => {
  const numericId = Number(ticketInfoId);
  if (Number.isFinite(numericId)) {
    return { $or: [{ ticketInfoId: numericId }, { legacyTicketInfoId: numericId }] };
  }
  return { $or: [{ ticketInfoId }, { legacyTicketInfoId: ticketInfoId }] };
};

exports.checkAvailability = async (ticketInfoId, quantity) => {
  try {
    const inv = await TicketInventory.findOne(resolveTicketInventoryQuery(ticketInfoId));
    // No inventory record → treat as unlimited (no cap defined)
    if (!inv) return true;
    return (inv.totalQuantity - inv.soldQuantity - inv.reservedQuantity) >= quantity;
  } catch (error) {
    if (error?.name === 'CastError') {
      return true;
    }
    throw error;
  }
};

/**
 * reserveSeats - OLD METHOD (kept for backward compatibility)
 * WARNING: This has TOCTOU race condition, use reserveSeatsAtomic instead
 */
exports.reserveSeats = async (tickets) => {
  for (const t of tickets) {
    const available = await exports.checkAvailability(t.ticketInfoId, t.quantity);
    if (!available) {
      throw new Error(`Not enough inventory for ticket type: ${t.ticketInfoId}`);
    }

    const existing = await TicketInventory.findOne(resolveTicketInventoryQuery(t.ticketInfoId));
    if (!existing) continue;

    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      { $inc: { reservedQuantity: t.quantity } },
      { new: true }
    );
  }
  return true;
};

/**
 * reserveSeatsAtomic - Atomic reservation using MongoDB atomic update
 * Uses $expr to check availability in the same query as update
 * Returns: true on success, throws Error if not enough inventory
 * 
 * This is the RECOMMENDED method for production use
 */
exports.reserveSeatsAtomic = async (tickets) => {
  const reservedTickets = [];
  
  try {
    for (const t of tickets) {
      const result = await TicketInventory.findOneAndUpdate(
        {
          ...resolveTicketInventoryQuery(t.ticketInfoId),
          $expr: {
            $gte: [
              { $subtract: ['$totalQuantity', { $add: ['$soldQuantity', '$reservedQuantity'] }] },
              t.quantity
            ]
          }
        },
        { $inc: { reservedQuantity: t.quantity } },
        { new: true }
      );
      
      if (!result) {
        // Not enough inventory - rollback already reserved tickets
        await exports.rollbackReserve(reservedTickets);
        throw new Error(`Not enough inventory for ticket type: ${t.ticketInfoId}`);
      }
      
      reservedTickets.push(t);
    }
    return true;
  } catch (error) {
    // Rollback on any error
    if (reservedTickets.length > 0) {
      await exports.rollbackReserve(reservedTickets);
    }
    throw error;
  }
};

/**
 * reserveSeatsWithSession - Atomic reservation using MongoDB transaction session
 * This is the SAFEST method as it provides full ACID guarantees
 * 
 * @param {Array} tickets - Array of { ticketInfoId, quantity }
 * @param {Object} session - MongoDB session from transaction
 */
exports.reserveSeatsWithSession = async (tickets, session) => {
  const reservedTickets = [];

  for (const t of tickets) {
    const result = await TicketInventory.findOneAndUpdate(
      {
        ...resolveTicketInventoryQuery(t.ticketInfoId),
        $expr: {
          $gte: [
            { $subtract: ['$totalQuantity', { $add: ['$soldQuantity', '$reservedQuantity'] }] },
            t.quantity
          ]
        }
      },
      { $inc: { reservedQuantity: t.quantity } },
      { session, new: true }
    );

    if (!result) {
      throw new Error(`Not enough inventory for ticket type: ${t.ticketInfoId}`);
    }

    reservedTickets.push(t);
  }
  return true;
};

/**
 * rollbackReserve - Rolls back previously reserved tickets
 * Used when reservation fails midway
 */
exports.rollbackReserve = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      { $inc: { reservedQuantity: -t.quantity } }
    );
  }
  return true;
};

/**
 * releaseSeats - called on refund or order cancellation.
 * Decrements reservedQuantity (or soldQuantity if already confirmed).
 */
exports.releaseSeats = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      { $inc: { reservedQuantity: -t.quantity } }
    );
  }
  return true;
};

/**
 * releaseSeatsWithSession - Release with transaction session
 */
exports.releaseSeatsWithSession = async (tickets, session) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      { $inc: { reservedQuantity: -t.quantity } },
      { session }
    );
  }
  return true;
};

/**
 * confirmOrder - called after successful payment.
 * Moves quantity from reserved → sold.
 */
exports.confirmOrder = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      {
        $inc: {
          reservedQuantity: -t.quantity,
          soldQuantity: t.quantity,
        },
      }
    );
  }
  return true;
};

/**
 * confirmOrderWithSession - Confirm with transaction session
 */
exports.confirmOrderWithSession = async (tickets, session) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      resolveTicketInventoryQuery(t.ticketInfoId),
      {
        $inc: {
          reservedQuantity: -t.quantity,
          soldQuantity: t.quantity,
        },
      },
      { session }
    );
  }
  return true;
};

const resolveEvent = async (eventId, session) => {
  const idStr = String(eventId);
  const isObjectId = mongoose.Types.ObjectId.isValid(idStr);
  const numericId = Number(eventId);
  const query = isObjectId
    ? { $or: [{ _id: eventId }, { legacyId: Number.isFinite(numericId) ? numericId : -1 }] }
    : { legacyId: Number.isFinite(numericId) ? numericId : -1 };
  const eventQuery = Event.findOne(query);
  return session ? await eventQuery.session(session) : await eventQuery;
};

const reserveSeatIdsForEvent = async (eventId, seatIds, status, session) => {
  if (!seatIds.length) return;
  const event = await resolveEvent(eventId, session);
  if (!event) throw new Error('Event not found');
  if (!Array.isArray(event.layout)) throw new Error('Event layout not available');

  const seatIdSet = new Set(seatIds);
  let hasAllSeats = true;
  const remaining = new Set(seatIds);

  const updatedLayout = event.layout.map(zone => {
    const seats = (zone.seats || []).map(seat => {
      if (seatIdSet.has(seat.id)) {
        remaining.delete(seat.id);
        if (status === 'reserved' && seat.status !== 'available') {
          hasAllSeats = false;
        }
        if (status === 'booked' && seat.status !== 'reserved') {
          hasAllSeats = false;
        }
        if (status === 'available' && seat.status !== 'reserved') {
          hasAllSeats = false;
        }
        return { ...seat, status };
      }
      return seat;
    });

    return { ...zone, seats };
  });

  if (!hasAllSeats || remaining.size > 0) {
    throw new Error('One or more seats are no longer available');
  }

  event.layout = updatedLayout;
  if (session) {
    await event.save({ session });
  } else {
    await event.save();
  }
};

exports.reserveSeatIdsWithSession = async (eventId, tickets, session) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'reserved', session);
};

exports.reserveSeatIds = async (eventId, tickets) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'reserved');
};

const validateSeatIdsReservedForEvent = async (eventId, seatIds, session) => {
  if (!seatIds.length) return;
  const event = await resolveEvent(eventId, session);
  if (!event) throw new Error('Event not found');
  if (!Array.isArray(event.layout)) throw new Error('Event layout not available');

  const seatIdSet = new Set(seatIds);
  let allReserved = true;
  const remaining = new Set(seatIds);

  event.layout.forEach(zone => {
    (zone.seats || []).forEach(seat => {
      if (seatIdSet.has(seat.id)) {
        remaining.delete(seat.id);
        if (seat.status !== 'reserved') {
          allReserved = false;
        }
      }
    });
  });

  if (!allReserved || remaining.size > 0) {
    throw new Error('One or more seats are not reserved');
  }
};

exports.validateSeatIdsReservedWithSession = async (eventId, tickets, session) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await validateSeatIdsReservedForEvent(eventId, seatIds, session);
};

exports.validateSeatIdsReserved = async (eventId, tickets) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await validateSeatIdsReservedForEvent(eventId, seatIds);
};

exports.confirmSeatIdsWithSession = async (eventId, tickets, session) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'booked', session);
};

exports.confirmSeatIds = async (eventId, tickets) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'booked');
};

exports.releaseSeatIdsWithSession = async (eventId, tickets, session) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'available', session);
};

exports.releaseSeatIds = async (eventId, tickets) => {
  const seatIds = tickets.flatMap(t => t.seatIds || []);
  await reserveSeatIdsForEvent(eventId, seatIds, 'available');
};
