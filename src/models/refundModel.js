const mongoose = require('mongoose');

/**
 * Refund — aligned with init-db.js schema
 */
const refundSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  reason:  { type: String, required: true },
  amount:  { type: Number, required: true },
  status:  { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);
