const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const OrderItem = require('../models/OrderItem');
const SupportItem = require('../models/SupportItem');
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

const sendFullResponse = (res, statusCode, success, message, data = null, meta = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    res.status(statusCode).json(response);
};

exports.getAllUsers = async (req, res) => {
    try {
        const { error, value } = paginationSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page, limit, search, isLocked } = value;
        const query = { isDeleted: { $ne: true } }; 

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
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

exports.getUserRoleStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        const formatted = stats.map(s => ({
            name: s._id,
            value: s.count
        }));
        sendResponse(res, 200, true, 'User role stats retrieved', formatted);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getUserGrowthStats = async (req, res) => {
    try {
        const growth = await User.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    newUsers: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const formatted = growth.map((g, index) => ({
            month: g._id,
            newUsers: g.newUsers,
            returningUsers: Math.floor(Math.random() * 5)
        }));

        sendResponse(res, 200, true, 'User growth stats retrieved', formatted);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

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
        
        await logAuditAction(req, 'LOCK', 'Users', user.legacyId, { isLocked: false }, { isLocked: true });

        sendResponse(res, 200, true, 'User locked successfully', user);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

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

        await logAuditAction(req, 'UNLOCK', 'Users', user.legacyId, { isLocked: true }, { isLocked: false });

        sendResponse(res, 200, true, 'User unlocked successfully', user);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const user = await User.findByIdAndUpdate(
            value.id,
            { $set: { isLocked: true, isDeleted: true, deletedAt: new Date() } },
            { new: true }
        );
        if (!user) return sendResponse(res, 404, false, 'User not found');

        await logAuditAction(req, 'DELETE', 'Users', user.legacyId, { isDeleted: false }, { isDeleted: true });

        sendResponse(res, 200, true, 'User soft-deleted successfully');
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.approveEvent = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const existingEvent = await Event.findById(value.id);
        if (!existingEvent) return sendResponse(res, 404, false, 'Event not found');
        
        const event = await Event.findByIdAndUpdate(
            value.id,
            { $set: { isApproved: true, status: 'active' } },
            { new: true }
        );

        await logAuditAction(req, 'APPROVE', 'Events', event.legacyId, { isApproved: false }, { isApproved: true });

        sendResponse(res, 200, true, 'Event approved successfully', event);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
        sendResponse(res, 200, true, 'Events retrieved successfully', events);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getEventById = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const event = await Event.findById(value.id);
        if (!event) return sendResponse(res, 404, false, 'Event not found');

        const owner = await User.findOne({ legacyId: event.ownerId });
        
        const eventData = event.toObject();
        eventData.organizerName = owner ? owner.username : 'Unknown Organizer';

        sendResponse(res, 200, true, 'Event details retrieved', eventData);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAllSupportItems = async (req, res) => {
    try {
        const items = await SupportItem.find().sort({ createdAt: -1 });
        sendResponse(res, 200, true, 'Support items retrieved successfully', items);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.processRefund = async (req, res) => {
    try {
        const { error, value } = processRefundSchema.validate(req.body);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { refundId, status } = value; 
        const refund = await Refund.findById(refundId);
        if (!refund) return sendResponse(res, 404, false, 'Refund not found');

        const updatedRefund = await Refund.findByIdAndUpdate(
            refundId,
            { $set: { refundStatus: status, refundProcessedDate: new Date() } },
            { new: true }
        );

        if (status === 'approved') {
            await Order.findOneAndUpdate({ legacyId: updatedRefund.orderId }, { $set: { paymentStatus: 'refunded', orderStatus: 'cancelled' } });
        }

        await logAuditAction(req, 'UPDATE', 'Refunds', updatedRefund.legacyId || 0, { status: 'pending' }, { status });

        sendResponse(res, 200, true, 'Refund processed successfully', updatedRefund);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAllRefunds = async (req, res) => {
    try {
        const refunds = await Refund.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: 'legacyId',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: 'legacyId',
                    as: 'orderInfo'
                }
            },
            { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } }
        ]);
        sendResponse(res, 200, true, 'Refunds retrieved successfully', refunds);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getRefundStats = async (req, res) => {
    try {
        const stats = await Refund.aggregate([
            { $group: { _id: "$refundStatus", count: { $sum: 1 } } }
        ]);
        
        const result = {
            pending: 0,
            approved: 0,
            rejected: 0
        };
        
        stats.forEach(s => {
            if (s._id) result[s._id] = s.count;
        });
        
        sendResponse(res, 200, true, 'Refund stats retrieved', result);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getRefundById = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const refund = await Refund.findById(value.id);
        if (!refund) return sendResponse(res, 404, false, 'Refund request not found');

        const user = await User.findOne({ legacyId: refund.userId });
        const order = await Order.findOne({ legacyId: refund.orderId });

        const data = refund.toObject();
        data.userInfo = user;
        data.orderInfo = order;

        sendResponse(res, 200, true, 'Refund detail retrieved', data);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const { error, value } = getTransactionsSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page = 1, limit = 10, status, startDate, endDate } = value;
        const match = {};

        if (status) match.paymentStatus = status;
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (page - 1) * limit;

        const items = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: 'legacyId',
                    as: 'orderInfo'
                }
            },
            { $unwind: '$orderInfo' },
            { $match: status ? { 'orderInfo.paymentStatus': status } : {} },
            {
                $lookup: {
                    from: 'users',
                    localField: 'orderInfo.userId',
                    foreignField: 'legacyId',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'events',
                    localField: 'eventId',
                    foreignField: 'legacyId',
                    as: 'eventInfo'
                }
            },
            { $unwind: { path: '$eventInfo', preserveNullAndEmptyArrays: true } },
            { $sort: { 'orderInfo.createdAt': -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);
        
        const total = await OrderItem.countDocuments();

        sendFullResponse(res, 200, true, 'Transactions retrieved successfully', items, { 
            total, page, limit 
        });
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getDailyRevenue = async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
        ]);
        sendResponse(res, 200, true, 'Daily revenue retrieved', stats);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { error, value } = getAuditLogsSchema.validate(req.query);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { page = 1, limit = 20, action, startDate, endDate, adminID } = value;
        const match = {};

        if (action) match.action = action;
        if (adminID) match.userId = Number(adminID);
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(match)
        ]);

        sendFullResponse(res, 200, true, 'Audit logs retrieved successfully', logs, { total, page, limit });
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.exportStatsReport = async (req, res) => {
    try {
        const [totalUsers, totalEvents, totalOrders, revenueStats] = await Promise.all([
            User.countDocuments(),
            Event.countDocuments({ isApproved: true }),
            Order.countDocuments({ paymentStatus: 'paid' }),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
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

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(stats);

        res.header('Content-Type', 'text/csv');
        res.attachment(`evenar_stats_report_${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csv);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalActiveUsers,
            approvedEvents,
            pendingEvents,
            revenueStats,
            totalRefunds,
            topEventsRaw,
            pendingEventsList
        ] = await Promise.all([
            User.countDocuments({ isDeleted: { $ne: true } }),
            User.countDocuments({ isLocked: { $ne: true }, isDeleted: { $ne: true } }),
            Event.countDocuments({ isApproved: true }),
            Event.countDocuments({ isApproved: false }),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Refund.countDocuments({ refundStatus: 'pending' }),
            OrderItem.aggregate([
                { $group: { _id: '$eventId', revenue: { $sum: '$totalPrice' } } },
                { $sort: { revenue: -1 } },
                { $limit: 5 }
            ]),
            Event.find({ isApproved: false }).sort({ createdAt: -1 }).limit(5)
        ]);

        const topEvents = await Promise.all(topEventsRaw.map(async (item) => {
            const event = await Event.findOne({ legacyId: item._id });
            return {
                _id: event ? event.name : `Event #${item._id}`,
                name: event ? event.name : `Event #${item._id}`,
                revenue: item.revenue
            };
        }));

        const topOrganizers = await Event.aggregate([
            { $match: { isApproved: true } },
            { $group: { _id: '$ownerId', totalEvents: { $sum: 1 }, ticketsSold: { $sum: '$soldTickets' } } },
            { $sort: { ticketsSold: -1 } },
            { $limit: 5 }
        ]);

        const dashboardData = {
            totalUsers,
            activeUsers: totalActiveUsers,
            totalEvents: approvedEvents,
            pendingApprovals: pendingEvents,
            totalRevenue: revenueStats.length > 0 ? revenueStats[0].total : 0,
            totalRefunds,
            topEvents,
            pendingEventsList,
            leaderboard: topOrganizers
        };

        sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', dashboardData);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};
exports.updateEvent = async (req, res) => {
    try {
        const { error: idError, value: idValue } = idParamSchema.validate(req.params);
        if (idError) return sendResponse(res, 400, false, idError.details[0].message);

        const updates = req.body;
        
        delete updates._id;
        delete updates.legacyId;

        const event = await Event.findByIdAndUpdate(
            idValue.id,
            { $set: updates },
            { new: true }
        );

        if (!event) return sendResponse(res, 404, false, 'Event not found');

        await logAuditAction(req, 'UPDATE', 'Events', event.legacyId || event._id, {}, updates);

        sendResponse(res, 200, true, 'Event updated successfully', event);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const event = await Event.findByIdAndDelete(value.id);
        if (!event) return sendResponse(res, 404, false, 'Event not found');

        await logAuditAction(req, 'DELETE', 'Events', event.legacyId || event._id, event, null);

        sendResponse(res, 200, true, 'Event deleted successfully');
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};
