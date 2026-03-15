const mongoose = require('mongoose');

const ticketInventorySchema = new mongoose.Schema({
  ticketInfoId: { type: Number, required: true }, // Referencing TicketInfo.legacyId
  legacyTicketInfoId: { type: Number },
  totalQuantity: { type: Number, required: true },
  soldQuantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'ticketInventories'
});

ticketInventorySchema.pre('save', function() {
  this.availableQuantity = this.totalQuantity - this.soldQuantity - this.reservedQuantity;
});

module.exports = mongoose.model('TicketInventory', ticketInventorySchema);
