const Event = require('../models/Event');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Get Dashboard Stats for Event Owner
 */
exports.getStats = async (req, res) => {
    try {
        const ownerId = req.user.sub;
        
        // Find all events owned by this user
        const events = await Event.find({ 
            $or: [
                { ownerId: ownerId },
                { ownerId: Number(ownerId) }
            ],
            isDeleted: false 
        });

        const eventIds = events.map(e => e._id);
        const activeEventsCount = events.filter(e => e.status !== 'deleted').length;

        // Find all paid orders for these events
        const paidOrders = await Order.find({
            eventId: { $in: eventIds },
            paymentStatus: 'paid'
        });

        const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalTicketsSold = paidOrders.reduce((sum, order) => sum + order.totalQuantity, 0);

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
        const ownerId = req.user.sub;
        const events = await Event.find({ 
            $or: [{ ownerId: ownerId }, { ownerId: Number(ownerId) }],
            isDeleted: false 
        });
        const eventIds = events.map(e => e._id);

        const orders = await Order.find({
            eventId: { $in: eventIds },
            paymentStatus: 'paid'
        }).sort({ createdAt: 1 });

        // Simple aggregation by month/day
        const revenueByDate = {};
        orders.forEach(order => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            revenueByDate[date] = (revenueByDate[date] || 0) + order.totalAmount;
        });

        res.json({
            success: true,
            data: revenueByDate
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu doanh thu' });
    }
};

/**
 * Get Recent Buyers/Orders
 */
exports.getBuyers = async (req, res) => {
    try {
        const ownerId = req.user.sub;
        const events = await Event.find({ 
            $or: [{ ownerId: ownerId }, { ownerId: Number(ownerId) }],
            isDeleted: false 
        });
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
                amount: order.totalAmount,
                quantity: order.totalQuantity,
                date: order.createdAt,
                status: order.paymentStatus
            };
        }));

        res.json({
            success: true,
            data: buyers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người mua' });
    }
};

/**
 * Get Performance Analytics
 */
exports.getAnalytics = async (req, res) => {
    try {
        const ownerId = req.user.sub;
        const events = await Event.find({ 
            $or: [{ ownerId: ownerId }, { ownerId: Number(ownerId) }],
            isDeleted: false 
        });

        const performance = events.map(event => ({
            eventId: event._id,
            name: event.name,
            sold: event.soldTickets || 0,
            capacity: event.totalTicketCount || 0,
            percentage: event.totalTicketCount > 0 ? (event.soldTickets / event.totalTicketCount) * 100 : 0
        }));

        res.json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu phân tích' });
    }
};
