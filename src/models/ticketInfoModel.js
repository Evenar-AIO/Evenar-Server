const mongoose = require('mongoose');

const ticketInfoSchema = new mongoose.Schema({
  ticketName: { type: String, required: true },
  ticketDescription: String,
  category: String,
  price: { type: Number, required: true },
  salesStartTime: Date,
  salesEndTime: Date,
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  legacyEventId: Number,
  maxQuantityPerOrder: Number,
  isActive: { type: Boolean, default: true },
  legacyId: { type: Number, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('TicketInfo', ticketInfoSchema);
