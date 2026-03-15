const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
    {
        orderId: { type: Number, required: true },
        orderItemId: { type: Number },
        userId: { type: Number, required: true },
        adminId: { type: Number, default: null },
        refundAmount: { type: Number, required: true },
        refundReason: { type: String },
        refundStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        paymentMethodId: { type: Number },
        refundRequestDate: { type: Date, default: Date.now },
        refundProcessedDate: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Refund', refundSchema, 'refunds');
