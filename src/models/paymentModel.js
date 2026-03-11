const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderCode: { type: Number, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['VNPAY', 'PAYOS'], required: true },
  transactionId: { type: String },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
