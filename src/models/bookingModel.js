const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  tickets: [{
    ticketInfoId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketInfo', required: true },
    quantity: { type: Number, required: true },
    price: Number
  }],
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], default: 'PENDING' },
  totalPrice: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
