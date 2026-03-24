const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Refund = require('../models/Refund');
const AuditLog = require('../models/AuditLog');
const OrderItem = require('../models/OrderItem');
const SupportItem = require('../models/SupportItem');
const Notification = require('../models/Notification');
const { getIO } = require('../../socket');
const OrganizerRequest = require('../models/OrganizerRequest');
const TicketInfo = require('../models/ticketInfoModel');
const TicketInventory = require('../models/ticketInventoryModel');
const { Parser } = require('json2csv');
const { logAuditAction } = require('../utils/auditUtil');
const { 
    paginationSchema, 
    idParamSchema, 
    processRefundSchema, 
    getTransactionsSchema, 
    getAuditLogsSchema,
} = require('../validators/adminValidator');

const sendResponse = (res, statusCode, success, message, data = {}) => {
    res.status(statusCode).json({ success, message, data });
};

const sendFullResponse = (res, statusCode, success, message, data = null, meta = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    res.status(statusCode).json(response);
};

// Helper for safe lookups supporting both ObjectId and legacy numerical IDs
const safeFindOne = async (Model, idValue) => {
    if (!idValue) return null;
    
    // 1. Try ObjectId first
    if (typeof idValue === 'string' && idValue.length === 24 && mongoose.Types.ObjectId.isValid(idValue)) {
        const item = await Model.findById(idValue);
        if (item) return item;
    }
    
    // 2. Try legacy numerical ID
    const numId = Number(idValue);
    if (!isNaN(numId)) {
        const item = await Model.findOne({ legacyId: numId });
        if (item) return item;
    }
    
    return null;
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
        
        const formatted = growth.map((g) => ({
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

        const user = await User.findOneAndUpdate(
            mongoose.Types.ObjectId.isValid(value.id) ? { _id: value.id } : { legacyId: Number(value.id) },
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

        const user = await User.findOneAndUpdate(
            mongoose.Types.ObjectId.isValid(value.id) ? { _id: value.id } : { legacyId: Number(value.id) },
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

        const user = await User.findOneAndUpdate(
            mongoose.Types.ObjectId.isValid(value.id) ? { _id: value.id } : { legacyId: Number(value.id) },
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

        const query = mongoose.Types.ObjectId.isValid(value.id) ? { _id: value.id } : { legacyId: Number(value.id) };
        const existingEvent = await Event.findOne(query);
        if (!existingEvent) return sendResponse(res, 404, false, 'Event not found');
        
        const event = await Event.findOneAndUpdate(
            query,
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

        const event = await safeFindOne(Event, value.id);
        if (!event) return sendResponse(res, 404, false, 'Event not found');

        // Fetch associated tickets and inventory (mirroring eventService logic)
        const TicketInfo = mongoose.model('TicketInfo');
        const TicketInventory = mongoose.model('TicketInventory');
        
        const tickets = await TicketInfo.find({ eventId: event._id }).lean();
        const ticketsWithInventory = await Promise.all(tickets.map(async (t) => {
            const inv = await TicketInventory.findOne({ ticketInfoId: t._id }).lean();
            return {
                ...t,
                quantity: inv ? inv.totalQuantity : 0,
                available: inv ? inv.availableQuantity : 0,
                type: t.ticketName
            };
        }));

        const owner = await safeFindOne(User, event.ownerId);
        
        const eventData = event.toObject();
        eventData.organizerName = owner ? (owner.fullName || owner.username) : 'Unknown Organizer';
        eventData.ticketInfo = ticketsWithInventory;

        sendResponse(res, 200, true, 'Event details retrieved', eventData);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.getAllSupportItems = async (req, res) => {
    try {
        const items = await SupportItem.aggregate([
            {
                $lookup: {
                    from: 'users',
                    let: { uid: '$userId' },
                    pipeline: [
                        { $match: { $expr: { $or: [
                            { $eq: ['$_id', '$$uid'] },
                            { $eq: ['$legacyId', '$$uid'] }
                        ] } } }
                    ],
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'supportAttachments',
                    localField: '_id',
                    foreignField: 'supportItemId',
                    as: 'attachments'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        sendResponse(res, 200, true, 'Support items retrieved successfully', items);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.updateSupportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;
        
        if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
            return sendResponse(res, 400, false, 'Invalid status format');
        }

        const updatedItem = await SupportItem.findByIdAndUpdate(
            id,
            { 
                status, 
                adminResponse,
                lastModified: new Date()
            },
            { new: true }
        );

        if (!updatedItem) return sendResponse(res, 404, false, 'Support item not found');

        // Send real-time notification to user
        try {
            const io = getIO();
            if (io) {
                const userId = updatedItem.userId.toString();
                const statusText = status === 'resolved' ? 'Đã giải quyết' : 
                                 status === 'in_progress' ? 'Đang xử lý' : 
                                 status === 'rejected' ? 'Từ chối' : 'Cập nhật';
                
                const notifData = {
                    userId: updatedItem.userId,
                    title: `Cập nhật yêu cầu hỗ trợ #${updatedItem._id.toString().slice(-6).toUpperCase()}`,
                    body: `Yêu cầu: "${updatedItem.subject}" đã được chuyển sang trạng thái: ${statusText}.`,
                    type: 'support',
                    read: false,
                    targetId: updatedItem._id,
                    targetModel: 'SupportItem'
                };

                // Create persistent notification in DB
                const newNotif = await Notification.create(notifData);
                
                // Emit via WebSocket
                io.to(`user:${userId}`).emit('notification', newNotif);
                console.log(`Notification sent to user ${userId} via socket`);
            }
        } catch (socketErr) {
            console.error('Socket notification error:', socketErr);
            // Non-blocking error, we still return successful update response
        }

        await logAuditAction(req, 'UPDATE', 'SupportItems', updatedItem.legacyId || updatedItem._id, {}, { status, adminResponse });
        sendResponse(res, 200, true, 'Support item updated successfully', updatedItem);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.processRefund = async (req, res) => {
    try {
        const { error, value } = processRefundSchema.validate(req.body);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const { refundId, status } = value; 
        const query = mongoose.Types.ObjectId.isValid(refundId) ? { _id: refundId } : { legacyId: Number(refundId) };
        const refund = await Refund.findOne(query);
        if (!refund) return sendResponse(res, 404, false, 'Refund not found');

        const updatedRefund = await Refund.findOneAndUpdate(
            query,
            { $set: { refundStatus: status, refundProcessedDate: new Date() } },
            { new: true }
        );

        if (status === 'approved') {
            if (mongoose.Types.ObjectId.isValid(updatedRefund.orderId)) {
                await Order.findOneAndUpdate(
                    { _id: updatedRefund.orderId },
                    { $set: { paymentStatus: 'refunded', orderStatus: 'cancelled' } }
                );
            } else if (!isNaN(Number(updatedRefund.orderId))) {
                await Order.findOneAndUpdate(
                    { legacyId: Number(updatedRefund.orderId) },
                    { $set: { paymentStatus: 'refunded', orderStatus: 'cancelled' } }
                );
            }
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
                    let: { uid: '$userId' },
                    pipeline: [
                        { $match: { $expr: { $or: [
                            { $eq: ['$_id', '$$uid'] },
                            { $eq: ['$legacyId', '$$uid'] }
                        ] } } }
                    ],
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'orders',
                    let: { oid: '$orderId' },
                    pipeline: [
                        { $match: { $expr: { $or: [
                            { $eq: ['$_id', '$$oid'] },
                            { $eq: ['$legacyId', '$$oid'] }
                        ] } } }
                    ],
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

        const refund = await safeFindOne(Refund, value.id);
        if (!refund) return sendResponse(res, 404, false, 'Refund request not found');

        const user = await safeFindOne(User, refund.userId);
        const order = await safeFindOne(Order, refund.orderId);

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
        const skip = (page - 1) * limit;

        const match = {};
        if (status) match.paymentStatus = status;
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'users',
                    let: { uid: '$userId' },
                    pipeline: [
                        { $match: { $expr: { $or: [
                            { $eq: ['$_id', '$$uid'] },
                            { $eq: ['$legacyId', '$$uid'] }
                        ] } } }
                    ],
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'events',
                    let: { eid: '$eventId' },
                    pipeline: [
                        { $match: { $expr: { $or: [
                            { $eq: ['$_id', '$$eid'] },
                            { $eq: ['$legacyId', '$$eid'] }
                        ] } } }
                    ],
                    as: 'eventInfo'
                }
            },
            { $unwind: { path: '$eventInfo', preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } }
        ];

        // Only apply skip/limit if explicitly requested to favor 'show all' behavior for Admin
        if (req.query.page && req.query.limit) {
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: Number(limit) });
        }

        const items = await Order.aggregate(pipeline);
        
        const total = await Order.countDocuments(match);

        sendFullResponse(res, 200, true, 'Orders retrieved successfully', items, { 
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
        if (adminID) {
            match.userId = mongoose.Types.ObjectId.isValid(adminID) 
                ? new mongoose.Types.ObjectId(adminID) 
                : (!isNaN(Number(adminID)) ? Number(adminID) : adminID);
        }
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
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const [
            totalUsers,
            totalActiveUsers,
            usersThisMonth,
            usersLastMonth,
            approvedEvents,
            pendingEvents,
            revenueStats,
            revenueLastMonthStats,
            totalRefunds,
            topEventsRaw,
            pendingEventsList,
            topOrganizersRaw,
            totalOrganizerRequests,
            revenueTrends
        ] = await Promise.all([
            User.countDocuments({ isDeleted: { $ne: true } }),
            User.countDocuments({ isLocked: { $ne: true }, isDeleted: { $ne: true } }),
            User.countDocuments({ createdAt: { $gte: startOfThisMonth }, isDeleted: false }),
            User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, isDeleted: false }),
            Event.countDocuments({ isApproved: true }),
            Event.countDocuments({ isApproved: false }),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Refund.countDocuments({ refundStatus: 'pending' }),
            OrderItem.aggregate([
                { $group: { _id: '$eventId', revenue: { $sum: '$totalPrice' } } },
                {
                    $lookup: {
                        from: 'events',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'eventInfo'
                    }
                },
                { $unwind: { path: '$eventInfo', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        revenue: 1,
                        name: { $ifNull: ['$eventInfo.name', { $concat: ['Event #', { $toString: '$_id' }] }] }
                    }
                },
                { $sort: { revenue: -1 } },
                { $limit: 5 }
            ]),
            Event.find({ isApproved: false }).sort({ createdAt: -1 }).limit(5),
            Event.aggregate([
                { $match: { isApproved: true, isDeleted: false } },
                {
                   $lookup: {
                      from: 'orders',
                      localField: '_id',
                      foreignField: 'eventId',
                      as: 'orderDocs'
                   }
                },
                {
                   $addFields: {
                      realSold: {
                         $sum: {
                            $map: {
                               input: {
                                  $filter: {
                                     input: '$orderDocs',
                                     as: 'o',
                                     cond: { $eq: ['$$o.paymentStatus', 'paid'] }
                                  }
                               },
                               as: 'po',
                               in: '$$po.totalQuantity'
                            }
                         }
                      }
                   }
                },
                { 
                   $group: { 
                      _id: '$ownerId', 
                      totalEvents: { $sum: 1 }, 
                      ticketsSold: { $sum: '$realSold' } 
                   } 
                },
                { $sort: { ticketsSold: -1, totalEvents: -1 } },
                { $limit: 5 }
            ]),
            OrganizerRequest.countDocuments({ status: 'pending' }),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        revenue: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 30 }
            ])
        ]);

        // Calculate growth percentages
        const userGrowth = usersLastMonth === 0 ? 100 : Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100);
        const revenueLastMonth = revenueLastMonthStats.length > 0 ? revenueLastMonthStats[0].total : 0;
        const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;
        const revenueGrowth = revenueLastMonth === 0 ? 100 : Math.round(((totalRevenue - revenueLastMonth) / revenueLastMonth) * 100);

        // Fetch small trend data for each top event (last 7 days)
        const topEvents = await Promise.all(topEventsRaw.map(async (event) => {
            const trend = await Order.aggregate([
                { 
                    $match: { 
                        eventId: event._id, 
                        paymentStatus: 'paid',
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    } 
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: "$totalQuantity" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Normalize to 7 days
            const trendData = trend.map(t => t.count);
            while (trendData.length < 7) trendData.unshift(0);

            return {
                ...event,
                trend: trendData
            };
        }));

        const leaderboard = await Promise.all(topOrganizersRaw.map(async (organizer) => {
            const user = await safeFindOne(User, organizer._id);
            return {
                _id: user ? (user.fullName || user.username) : `Organizer #${organizer._id}`,
                totalEvents: organizer.totalEvents,
                ticketsSold: organizer.ticketsSold
            };
        }));

        const dashboardData = {
            totalUsers,
            activeUsers: totalActiveUsers,
            userGrowth: (userGrowth >= 0 ? '+' : '') + userGrowth + '%',
            totalEvents: approvedEvents,
            pendingApprovals: pendingEvents,
            totalRevenue,
            revenueGrowth: (revenueGrowth >= 0 ? '+' : '') + revenueGrowth + '%',
            totalRefunds,
            topEvents,
            pendingEventsList,
            leaderboard,
            pendingOrganizerRequests: totalOrganizerRequests,
            revenueTrends
        };

        sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', dashboardData);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};
exports.updateEvent = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const event = await Event.findById(value.id);
        if (!event) return sendResponse(res, 404, false, 'Event not found');

        const { ticketInfo, ...restData } = req.body;
        
        // Update core event fields
        Object.assign(event, restData);
        const updatedEvent = await event.save();

        // Sync TicketInfo if provided (mirroring eventService logic)
        if (Array.isArray(ticketInfo)) {
            const TicketInfo = mongoose.model('TicketInfo');
            const TicketInventory = mongoose.model('TicketInventory');

            for (const t of ticketInfo) {
                const ticketId = t._id || t.id;
                const price = Number(t.price);
                const qty = Number(t.quantity);

                if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
                    await TicketInfo.findByIdAndUpdate(ticketId, {
                        ticketName: t.type || t.ticketName,
                        price: price,
                        isActive: true
                    });
                    await TicketInventory.findOneAndUpdate(
                        { ticketInfoId: ticketId },
                        { totalQuantity: qty, availableQuantity: qty }
                    );
                } else {
                    const ti = await TicketInfo.create({
                        ticketName: t.type || t.ticketName || 'Standard',
                        price: price,
                        eventId: event._id,
                        isActive: true
                    });
                    await TicketInventory.create({
                        ticketInfoId: ti._id,
                        totalQuantity: qty,
                        availableQuantity: qty,
                        eventId: event._id
                    });
                }
            }
        }

        await logAuditAction(req, 'UPDATE', 'Events', updatedEvent.legacyId || 0, {}, updatedEvent);
        sendResponse(res, 200, true, 'Event updated successfully', updatedEvent);
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { error, value } = idParamSchema.validate(req.params);
        if (error) return sendResponse(res, 400, false, error.details[0].message);

        const query = mongoose.Types.ObjectId.isValid(value.id) ? { _id: value.id } : { legacyId: Number(value.id) };
        const event = await Event.findOneAndUpdate(
            query,
            { $set: { isDeleted: true, status: 'deleted', deletedAt: new Date() } },
            { new: true }
        );
        if (!event) return sendResponse(res, 404, false, 'Event not found');

        await logAuditAction(req, 'DELETE', 'Events', event.legacyId || event._id, event, { isDeleted: true });

        sendResponse(res, 200, true, 'Event soft-deleted successfully');
    } catch (error) {
        sendResponse(res, 500, false, error.message);
    }
};
