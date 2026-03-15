const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        tableName: { type: String, required: true },
        // Use Mixed to support both ObjectId and legacy Number IDs
        recordId: { type: mongoose.Schema.Types.Mixed },
        action: { 
            type: String, 
            required: true 
        },
        oldValues: { type: mongoose.Schema.Types.Mixed, default: null },
        newValues: { type: mongoose.Schema.Types.Mixed, default: null },
        changedColumns: { type: String, default: null },
        userId: { type: mongoose.Schema.Types.Mixed, required: true },
        userAgent: { type: String, default: null }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('AuditLog', auditLogSchema, 'auditLogs');
