const mongoose = require('mongoose');

/**
 * OrderItem — aligned with init-db.js schema
 * Each row = one ticket type line within an Order.
 */
const orderItemSchema = new mongoose.Schema({
  orderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  eventId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketInfoId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketInfo', required: true },
  quantity:     { type: Number, required: true },
  unitPrice:    { type: Number, required: true },
  totalPrice:   { type: Number, required: true },   // unitPrice * quantity
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);
