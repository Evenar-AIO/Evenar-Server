const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        orderId: { type: Number, required: true },
        ticketInfoId: { type: Number },
        eventId: { type: Number, required: true },
        ticketId: { type: Number },
        unitPrice: { type: Number },
        quantity: { type: Number },
        totalPrice: { type: Number },
        assignedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('OrderItem', orderItemSchema, 'orderItems');
