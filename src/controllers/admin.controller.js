const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const { Parser } = require('json2csv');
const { logAuditAction } = require('../utils/audit.util');
const { 
    paginationSchema, 
    idParamSchema, 
    processRefundSchema, 
    getTransactionsSchema, 
    getAuditLogsSchema,
    exportStatsSchema 
} = require('../validators/admin.validator');

const sendResponse = (res, statusCode, success, message, data = {}) => {
    res.status(statusCode).json({ success, message, data });
};

// 1. GET /admin/users
exports.getAllUsers = async (req, res) => {
    try {
        const { error, value } = paginationSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page, limit, search, isLocked } = value;
        const query = { isDeleted: false }; // Soft delete filter

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (isLocked !== undefined) {
            query.isLocked = isLocked;
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(query)
        ]);

        // HatPlan requires: data: [users], meta: { total, page, limit } 
        sendResponse(res, 200, true, 'Users retrieved successfully', users);
        // Warning: HatPlan mentions data format difference, let's inject meta into res.json manually to match exact structure if sendResponse is restrictive,
        // but sendResponse accepts just `data`. I'll override the behavior locally for strict match.
        // Wait, standard sendResponse adds `{ success: true, message, data: { ... } }`, let's just use raw res.json for meta
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// Wrapper override to strictly follow `{ success, data, meta }` plan
const sendFullResponse = (res, statusCode, success, message, data = null, meta = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    res.status(statusCode).json(response);
};

// Let's rewrite getAllUsers with the new sendFullResponse
exports.getAllUsers = async (req, res) => {
    try {
        const { error, value } = paginationSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page, limit, search, isLocked } = value;
        const query = { isDeleted: false }; 

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } }, // According to HatPlan it's username
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (isLocked !== undefined) {
            query.isLocked = isLocked;
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(query)
        ]);

        sendFullResponse(res, 200, true, 'Users retrieved successfully', users, { total, page, limit });
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 2. POST /admin/users/:id/lock
exports.lockUserAccount = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const user = await User.findByIdAndUpdate(
            value.id,
            { $set: { isLocked: true } },
            { new: true }
        );
        if (!user) return sendResponse(res, 404, false, 'User not found');
        
        await logAuditAction(req, 'LOCK', 'User', user._id, { isLocked: true });

        sendResponse(res, 200, true, 'User locked successfully', user);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 3. POST /admin/users/:id/unlock
exports.unlockUserAccount = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const user = await User.findByIdAndUpdate(
            value.id,
            { $set: { isLocked: false } },
            { new: true }
        );
        if (!user) return sendResponse(res, 404, false, 'User not found');

        await logAuditAction(req, 'UNLOCK', 'User', user._id, { isLocked: false });

        sendResponse(res, 200, true, 'User unlocked successfully', user);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 4. DELETE /admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        // Soft delete: set isDeleted = true (assume User schema has it or we just add it)
        const user = await User.findByIdAndUpdate(
            value.id,
            { $set: { isLocked: true, isDeleted: true, deletedAt: new Date() } },
            { new: true }
        );
        if (!user) return sendResponse(res, 404, false, 'User not found');

        await logAuditAction(req, 'DELETE', 'User', user._id, { isDeleted: true });

        sendResponse(res, 200, true, 'User soft-deleted successfully');
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 5. POST /admin/events/:id/approve
exports.approveEvent = async (req, res) => {
    try {
        // Validation check for ID
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        // Ensure Event exists and status is pending
        const existingEvent = await Event.findById(value.id);
        if (!existingEvent) return sendResponse(res, 404, false, 'Event not found');
        if (existingEvent.status !== 'pending') return sendResponse(res, 400, false, 'Only pending events can be approved');

        const event = await Event.findByIdAndUpdate(
            value.id,
            { $set: { status: 'approved' } },
            { new: true }
        );

        await logAuditAction(req, 'APPROVE', 'Event', event._id, { prevStatus: 'pending', newStatus: 'approved' });

        sendResponse(res, 200, true, 'Event approved successfully', event);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 6. POST /refunds/process
exports.processRefund = async (req, res) => {
    try {
        const { error, value } = processRefundSchema.validate(req.body);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { refundId, status } = value; // status: 'approved' or 'rejected'
        const refund = await Refund.findById(refundId);
        if (!refund) return sendResponse(res, 404, false, 'Refund not found');
        if (refund.status && refund.status !== 'pending') return sendResponse(res, 400, false, 'Only pending refunds can be processed');

        const updatedRefund = await Refund.findByIdAndUpdate(
            refundId,
            { $set: { status: status, processedAt: new Date(), refundStatus: status } },
            { new: true }
        );

        // Update Order if approved
        if (status === 'approved') {
            await Order.findOneAndUpdate({ legacyId: updatedRefund.orderId, _id: updatedRefund.orderID }, { $set: { status: 'cancelled', paymentStatus: 'refunded' } });
        }

        await logAuditAction(req, 'PROCESS_REFUND', 'Refund', updatedRefund._id, { decision: status });

        sendResponse(res, 200, true, 'Refund processed successfully', updatedRefund);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// GET /admin/refunds
exports.getAllRefunds = async (req, res) => {
    try {
        const refunds = await Refund.find().sort({ createdAt: -1 });
        sendResponse(res, 200, true, 'Refunds retrieved successfully', refunds);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 7. GET /admin/transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const { error, value } = getTransactionsSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page = 1, limit = 10, status, startDate, endDate } = value;
        const match = {};

        if (status) match.status = status; // Assuming Order has 'status' (pending/confirmed/cancelled)
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (page - 1) * limit;

        const items = await Order.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId', // Legacy ID
                    foreignField: 'legacyId',
                    as: 'userInfo'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customerID', // ObjectID
                    foreignField: '_id',
                    as: 'customerInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        const total = await Order.countDocuments(match);

        sendFullResponse(res, 200, true, 'Transactions retrieved successfully', items, { 
            total, filters: { status, dateRange: { startDate, endDate } }, page, limit 
        });
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 8. GET /admin/audit-logs
exports.getAuditLogs = async (req, res) => {
    try {
        const { error, value } = getAuditLogsSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page = 1, limit = 20, action, startDate, endDate, adminID } = value;
        const match = {};

        if (action) match.action = action;
        if (adminID) match.adminID = adminID;
        if (startDate && endDate) {
            match.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(match).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('adminID', 'username email'),
            AuditLog.countDocuments(match)
        ]);

        sendFullResponse(res, 200, true, 'Audit logs retrieved successfully', logs, { total, page, limit });
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 9. GET /admin/stats/export
exports.exportStatsReport = async (req, res) => {
    try {
        const { error, value } = exportStatsSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { format = 'csv', startDate, endDate } = value;

        const orderMatch = { paymentStatus: 'paid' };
        if (startDate && endDate) {
            orderMatch.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const [totalUsers, totalEvents, totalOrders, revenueStats] = await Promise.all([
            User.countDocuments(),
            Event.countDocuments({ status: { $ne: 'rejected' } }),
            Order.countDocuments(orderMatch),
            Order.aggregate([
                { $match: orderMatch },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ])
        ]);

        const stats = [{
            TotalUsers: totalUsers,
            TotalEvents: totalEvents,
            TotalOrders: totalOrders,
            TotalRevenueVND: revenueStats.length > 0 ? revenueStats[0].total : 0,
            ExportDate: new Date().toISOString()
        }];

        if (format === 'json') {
            return sendResponse(res, 200, true, 'Stats exported successfully', stats[0]);
        }

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(stats);

        res.header('Content-Type', 'text/csv');
        res.attachment(`evenar_stats_report_${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csv);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

// 10. GET /admin/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(); // HatPlan asked for line chart last 30 days
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalUsers,
            totalEvents,
            pendingEvents,
            approvedEvents,
            totalOrders,
            revenueStats,
            totalRefunds,
            chartData,
            topEvents
        ] = await Promise.all([
            User.countDocuments({ isLocked: false, isDeleted: { $ne: true } }), // Active users
            Event.countDocuments(),
            Event.countDocuments({ status: 'pending' }),
            Event.countDocuments({ status: 'approved' }),
            Order.countDocuments(),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Refund.countDocuments({ $or: [{ status: 'pending' }, { refundStatus: 'pending' }] }), // Supports both
            Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { '_id': 1 } }
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: '$eventID', revenue: { $sum: '$totalAmount' } } },
                { $sort: { revenue: -1 } },
                { $limit: 5 }
            ])
        ]);

        const totalUsersAll = await User.countDocuments(); // HatPlan specifies total users (all) vs active users

        const dashboardData = {
            totalUsers: totalUsersAll,
            activeUsers: totalUsers,
            totalEvents: approvedEvents,
            pendingApprovals: pendingEvents,
            totalRevenue: revenueStats.length > 0 ? revenueStats[0].total : 0,
            totalRefunds,
            topEvents,
            chartData: chartData.map(d => ({ date: d._id, revenue: d.revenue, orders: d.orders }))
        };

        sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', dashboardData);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};
