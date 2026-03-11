const TicketInventory = require('../models/ticketInventoryModel');
const TicketInfo = require('../models/ticketInfoModel');

exports.checkAvailability = async (ticketInfoId, quantity) => {
  const inventory = await TicketInventory.findOne({ ticketInfoId });
  if (!inventory) return false;

  return (inventory.totalQuantity - inventory.soldQuantity - inventory.reservedQuantity) >= quantity;
};

exports.reserveSeats = async (bookingId, tickets) => {
  for (const t of tickets) {
    const available = await this.checkAvailability(t.ticketInfoId, t.quantity);
    if (!available) {
      throw new Error(`Not enough inventory for ticket category ${t.ticketInfoId}`);
    }

    await TicketInventory.findOneAndUpdate(
      { ticketInfoId: t.ticketInfoId },
      { $inc: { reservedQuantity: t.quantity } },
      { new: true, runValidators: true }
    );
  }
  return true;
};

exports.releaseSeats = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      { ticketInfoId: t.ticketInfoId },
      { $inc: { reservedQuantity: -t.quantity } }
    );
  }
  return true;
};

exports.confirmBooking = async (tickets) => {
  for (const t of tickets) {
    await TicketInventory.findOneAndUpdate(
      { ticketInfoId: t.ticketInfoId },
      {
        $inc: {
          reservedQuantity: -t.quantity,
          soldQuantity: t.quantity
        }
      }
    );
  }
  return true;
};
