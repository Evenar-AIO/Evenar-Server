const mongoose = require('mongoose');

const ticketInventorySchema = new mongoose.Schema({
  ticketInfoId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketInfo', required: true },
  legacyTicketInfoId: { type: Number },
  totalQuantity: { type: Number, required: true },
  soldQuantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

ticketInventorySchema.pre('save', function() {
  this.availableQuantity = this.totalQuantity - this.soldQuantity - this.reservedQuantity;
});

module.exports = mongoose.model('TicketInventory', ticketInventorySchema);
