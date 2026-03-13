const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        tableName: { type: String, required: true },
        recordId: { type: Number },
        action: { 
            type: String, 
            required: true 
        },
        oldValues: { type: mongoose.Schema.Types.Mixed, default: null },
        newValues: { type: mongoose.Schema.Types.Mixed, default: null },
        changedColumns: { type: String, default: null },
        userId: { type: Number, required: true },
        userAgent: { type: String, default: null }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('AuditLog', auditLogSchema, 'auditLogs');
