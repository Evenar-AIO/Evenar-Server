const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        legacyId: { type: Number },
        orderNumber: { type: String, unique: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        // Ticket counts
        totalQuantity: { type: Number, default: 0 },
        // Pricing
        subtotalAmount: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        // Status
        paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending' },
        orderStatus: { type: String, enum: ['created', 'pending', 'confirmed', 'delivered', 'cancelled'], default: 'created' },
        // Payment
        paymentMethod: { type: String, enum: ['VNPAY', 'PAYOS'], default: 'PAYOS' },
        paymentMethodId: { type: Number },           // legacy compat
        transactionId: { type: String, default: null },
        // Promotion
        promotionCode: { type: String, default: null },
        // Contact info (legacy)
        contactPhone: { type: String },
        contactEmail: { type: String },
        deliveryMethod: { type: String },
        notes: { type: String }
    },
    { timestamps: true }
);

// Auto-generate orderNumber before validation
orderSchema.pre('validate', function (next) {
    if (!this.orderNumber) {
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.orderNumber = `ORD-${ts}-${rand}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema, 'orders');
