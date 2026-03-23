const mongoose = require('mongoose');
const Event = require('../models/Event');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Get Dashboard Stats for Event Owner
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.sub;
        console.log(`[OwnerStats] Fetching stats for user: ${userId}`);
        
        // Find all events owned by this user
        const query = {
            $or: [
                { ownerId: userId },
                { ownerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId }
            ],
            isDeleted: false 
        };
        
        // Remove legacy numeric ID check for ownerId path as it causes cast errors on ObjectId fields
        // if (!isNaN(Number(userId))) {
        //     query.$or.push({ ownerId: Number(userId) });
        // }

        const events = await Event.find(query);
        console.log(`[OwnerStats] Found ${events.length} events for owner ${userId}`);

        const eventIds = events.map(e => e._id);
        const activeEventsCount = events.filter(e => e.status !== 'deleted' && e.status !== 'expired').length;

        // Find all paid orders for these events
        const paidOrders = await Order.find({
            eventId: { $in: eventIds },
            paymentStatus: 'paid'
        });

        const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const totalTicketsSold = paidOrders.reduce((sum, order) => sum + (order.totalQuantity || 0), 0);

        console.log(`[OwnerStats] Stats - Revenue: ${totalRevenue}, Tickets: ${totalTicketsSold}, Active Events: ${activeEventsCount}`);

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalTicketsSold,
                activeEventsCount,
                eventCount: events.length
            }
        });
    } catch (error) {
        console.error('Owner Stats Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê' });
    }
};

/**
 * Get Revenue Data for Charts
 */
exports.getRevenueData = async (req, res) => {
    try {
        const userId = req.user.sub;
        const query = {
            $or: [
                { ownerId: userId },
                { ownerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId }
            ],
        };

        const events = await Event.find(query);
        const eventIds = events.map(e => e._id);

        const orders = await Order.find({
            eventId: { $in: eventIds },
            paymentStatus: 'paid'
        }).sort({ createdAt: 1 });

        // Simple aggregation by month/day
        const revenueByDate = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            revenueByDate[date] = (revenueByDate[date] || 0) + (order.totalAmount || 0);
        });

        res.json({
            success: true,
            data: revenueByDate
        });
    } catch (error) {
        console.error('Owner Revenue Data Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu doanh thu' });
    }
};

/**
 * Get Recent Buyers/Orders
 */
exports.getBuyers = async (req, res) => {
    try {
        const userId = req.user.sub;
        const query = {
            $or: [
                { ownerId: userId },
                { ownerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId }
            ],
            isDeleted: false 
        };

        const events = await Event.find(query);
        const eventIds = events.map(e => e._id);

        const orders = await Order.find({
            eventId: { $in: eventIds }
        })
        .populate('eventId', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

        // Map internal user info if available (simplified for now)
        const buyers = await Promise.all(orders.map(async order => {
            const customer = await User.findById(order.userId).select('username email avatar');
            return {
                orderId: order._id,
                orderNumber: order.orderNumber,
                customerName: customer ? customer.username : 'Khách vãng lai',
                customerEmail: customer ? customer.email : order.contactEmail,
                customerAvatar: customer ? customer.avatar : null,
                eventName: order.eventId ? order.eventId.name : 'Sự kiện đã xóa',
                amount: order.totalAmount || 0,
                quantity: order.totalQuantity || 0,
                date: order.createdAt,
                status: order.paymentStatus
            };
        }));

        res.json({
            success: true,
            data: buyers
        });
    } catch (error) {
        console.error('Owner Buyers Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người mua' });
    }
};

/**
 * Get Performance Analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        const userId = req.user.sub;
        const query = {
            $or: [
                { ownerId: userId },
                { ownerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId }
            ],
            isDeleted: false 
        };

        const events = await Event.find(query);
        const eventIds = events.map(e => e._id);

        // Instead of relying on possibly stale soldTickets in Event model,
        // we can aggregate from paid orders for more accuracy.
        const orderGroups = await Order.aggregate([
            { $match: { eventId: { $in: eventIds }, paymentStatus: 'paid' } },
            { $group: { _id: '$eventId', totalSold: { $sum: '$totalQuantity' } } }
        ]);

        const soldMap = {};
        orderGroups.forEach(og => {
            soldMap[String(og._id)] = og.totalSold;
        });

        const performance = events.map(event => {
            const actualSold = soldMap[String(event._id)] || (event.soldTickets || 0);
            return {
                eventId: event._id,
                name: event.name,
                sold: actualSold,
                capacity: event.totalTicketCount || 0,
                percentage: event.totalTicketCount > 0 ? (actualSold / event.totalTicketCount) * 100 : 0
            };
        });

        res.json({
            success: true,
            data: performance
        });
    } catch (error) {
        console.error('Owner Analytics Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu phân tích' });
    }
};
