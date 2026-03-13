const AuditLog = require('../models/AuditLog');


exports.logAuditAction = async (req, action, tableName, recordId, oldValues = null, newValues = null) => {
    try {
        const userId = req.user?.legacyId || 1;
        const userAgent = req.headers['user-agent'] || null;

        await AuditLog.create({
            tableName,
            recordId: Number(recordId),
            action,
            oldValues,
            newValues,
            userId,
            userAgent
        });
    } catch (error) {
        console.error('AuditLog Error:', error.message);
    }
};
