const Booking = require('../models/bookingModel');
const Order = require('../models/orderModel');
const Event = require('../models/eventModel');
const TicketInfo = require('../models/ticketInfoModel');
const inventoryManager = require('../utils/inventoryManager');

exports.createBooking = async (userId, eventId, tickets) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  let totalPrice = 0;
  for (const t of tickets) {
    // tickets: [{ ticketInfoId, quantity }]
    const tInfo = await TicketInfo.findById(t.ticketInfoId);
    if (!tInfo) throw new Error('Invalid ticket category');

    t.price = tInfo.price;
    totalPrice += tInfo.price * (t.quantity || 1);
  }

  await inventoryManager.reserveSeats(null, tickets);

  const booking = await Booking.create({
    userId,
    eventId,
    tickets,
    status: 'PENDING',
    totalPrice
  });

  const order = await Order.create({
    userId,
    bookingId: booking._id,
    totalAmount: totalPrice,
    status: 'PENDING'
  });

  return {
    bookingId: booking._id,
    orderId: order._id,
    status: booking.status,
    totalPrice: booking.totalPrice
  };
};
