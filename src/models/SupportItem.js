const mongoose = require('mongoose');

const supportItemSchema = new mongoose.Schema(
    {
        legacyId: { type: Number },
        userId: { type: Number },
        fromEmail: { type: String, required: true },
        toEmail: { type: String },
        subject: { type: String, required: true },
        sendDate: { type: Date },
        sendTimestamp: { type: Date },
        content: { type: String },
        status: { type: String, enum: ['pending', 'resolved', 'in_progress'], default: 'pending' },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        category: { type: String },
        adminResponse: { type: String, default: null },
        assignedAdminId: { type: Number, default: null },
        eventId: { type: Number },
        orderId: { type: Number }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('SupportItem', supportItemSchema, 'supportItems');
