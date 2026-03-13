const AuditLog = require('../models/AuditLog');

/**
 * Creates an AuditLog entry.
 * @param {Object} req - The Express request object (contains req.user).
 * @param {String} action - 'CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK', 'APPROVE', 'PROCESS_REFUND'
 * @param {String} targetType - 'User', 'Event', 'Refund', 'Order'
 * @param {String} targetID - The ID/legacyId of the affected entity.
 * @param {Object} changes - The changes made (optional).
 */
exports.logAuditAction = async (req, action, targetType, targetID, changes = {}) => {
    try {
        const adminID = req.user?.id || req.user?.legacyId || 'system';
        const userAgent = req.headers['user-agent'] || null;

        await AuditLog.create({
            adminID,
            action,
            targetType,
            targetID: String(targetID),
            changes,
            userAgent
        });
    } catch (error) {
        console.error('AuditLog Error:', error.message);
    }
};
