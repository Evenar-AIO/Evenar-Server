const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.Mixed, required: true, ref: 'Order' },
        orderItemId: { type: mongoose.Schema.Types.Mixed },
        userId: { type: mongoose.Schema.Types.Mixed },
        adminId: { type: mongoose.Schema.Types.Mixed, default: null },
        refundAmount: { type: Number, required: true },
        refundReason: { type: String },
        rejectionReason: { type: String, default: null },
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

refundSchema.index({ orderId: 1 });

module.exports = mongoose.model('Refund', refundSchema, 'refunds');
