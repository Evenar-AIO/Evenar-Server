const mongoose = require('mongoose');

const ticketInfoSchema = new mongoose.Schema({
  ticketName: { type: String, required: true },
  ticketDescription: String,
  category: String,
  price: { type: Number, required: true },
  salesStartTime: Date,
  salesEndTime: Date,
  eventId: { type: Number }, // Seed data uses legacy numeric ID
  legacyEventId: Number,
  maxQuantityPerOrder: Number,
  isActive: { type: Boolean, default: true },
  legacyId: { type: Number, unique: true }
}, { 
  timestamps: true,
  collection: 'ticketInfos'
});

module.exports = mongoose.model('TicketInfo', ticketInfoSchema);
