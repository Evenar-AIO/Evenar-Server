const AuditLog = require('../models/AuditLog');

exports.logAuditAction = async (req, action, tableName, recordId, oldValues = null, newValues = null) => {
    try {
        // Support both legacyId (Number) and new _id (ObjectId)
        const userId = req.user?.legacyId || req.user?._id || req.user?.id || 1;
        const userAgent = req.headers['user-agent'] || null;

        await AuditLog.create({
            tableName,
            recordId: recordId, // Remove Number() cast to allow strings/ObjectIds
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
