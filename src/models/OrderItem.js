const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.Mixed, required: true, ref: 'Order' },
        eventId: { type: mongoose.Schema.Types.Mixed, required: true, ref: 'Event' },
        ticketInfoId: { type: mongoose.Schema.Types.Mixed, ref: 'TicketInfo' },
        ticketId: { type: mongoose.Schema.Types.Mixed },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        seatIds: [{ type: String }],
        assignedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

orderItemSchema.index({ orderId: 1 });

module.exports = mongoose.model('OrderItem', orderItemSchema, 'orderItems');
