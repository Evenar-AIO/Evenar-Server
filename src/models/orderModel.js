const mongoose = require('mongoose');

/**
 * Order — aligned with init-db.js schema
 * Replaces the old Booking + Order split.
 * One Order = one purchase transaction for one event.
 */
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },          // e.g. ORD-1741694000000
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  promotionCode: { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  subtotalAmount: { type: Number, required: true },        // before discount
  totalAmount: { type: Number, required: true },        // after discount
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  orderStatus: { type: String, enum: ['created', 'confirmed', 'cancelled', 'delivered', 'refunded'], default: 'created' },
  paymentMethod: { type: String, enum: ['VNPAY', 'PAYOS'], default: 'VNPAY' },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate orderNumber before saving (if not set)
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);






