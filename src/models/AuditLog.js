const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        adminID: { type: String, required: true },
        action: { 
            type: String, 
            required: true, 
            enum: ['CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK', 'APPROVE', 'PROCESS_REFUND'] 
        },
        targetType: { 
            type: String, 
            required: true, 
            enum: ['User', 'Event', 'Refund', 'Order'] 
        },
        targetID: { type: String, required: true },
        changes: { type: mongoose.Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, default: Date.now },
        userAgent: { type: String, default: null }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
