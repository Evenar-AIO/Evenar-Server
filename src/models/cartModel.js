const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketInfoId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketInfo', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [cartItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
