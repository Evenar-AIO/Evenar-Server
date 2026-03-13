const TicketInventory = require('../models/ticketInventoryModel');

/**
 * Helpers expect an array of objects with { ticketInfoId, quantity }
 * — works for both raw ticket input and OrderItem documents.
 */

/**
 * checkAvailability - checks if there are enough tickets available
 * Returns: boolean
 */
exports.checkAvailability = async (ticketInfoId, quantity) => {
  const inv = await TicketInventory.findOne({ ticketInfoId });
  if (!inv) return false;
  return (inv.totalQuantity - inv.soldQuantity - inv.reservedQuantity) >= quantity;
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
    await TicketInventory.findOneAndUpdate(
      { ticketInfoId: t.ticketInfoId },
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
          ticketInfoId: t.ticketInfoId,
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
  
  try {
    for (const t of tickets) {
      const result = await TicketInventory.findOneAndUpdate(
        {
          ticketInfoId: t.ticketInfoId,
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
  } catch (error) {
    throw error;
  }
};

/**
 * rollbackReserve - Rolls back previously reserved tickets
 * Used when reservation fails midway
 */
exports.rollbackReserve = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      { ticketInfoId: t.ticketInfoId },
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
      { ticketInfoId: t.ticketInfoId },
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
      { ticketInfoId: t.ticketInfoId },
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
      { ticketInfoId: t.ticketInfoId },
      {
        $inc: {
          reservedQuantity: -t.quantity,
          soldQuantity:      t.quantity,
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
      { ticketInfoId: t.ticketInfoId },
      {
        $inc: {
          reservedQuantity: -t.quantity,
          soldQuantity:      t.quantity,
        },
      },
      { session }
    );
  }
  return true;
};
