const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  reason: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
});

module.exports = mongoose.model('Refund', refundSchema);
