const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        legacyId: { type: Number },
        orderNumber: { type: String, required: true },
        userId: { type: Number },
        totalQuantity: { type: Number, required: true },
        subtotalAmount: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
        orderStatus: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
        paymentMethodId: { type: Number },
        contactPhone: { type: String },
        contactEmail: { type: String },
        deliveryMethod: { type: String },
        notes: { type: String },
        transactionId: { type: String, default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
