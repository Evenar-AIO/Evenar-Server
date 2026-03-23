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

        // User Acquisition calculation
        const uniqueBuyerIds = [...new Set(paidOrders.map(o => String(o.userId)))];
        const totalUniqueBuyers = uniqueBuyerIds.length;
        
        // Calculate returning customers (those with more than 1 paid order for this owner)
        const orderCounts = {};
        paidOrders.forEach(o => {
            const uid = String(o.userId);
            orderCounts[uid] = (orderCounts[uid] || 0) + 1;
        });
        const returningCustomers = Object.values(orderCounts).filter(count => count > 1).length;
        const newCustomers = totalUniqueBuyers - returningCustomers;

        console.log(`[OwnerStats] Stats - Revenue: ${totalRevenue}, Tickets: ${totalTicketsSold}, Active Events: ${activeEventsCount}, Buyers: ${totalUniqueBuyers}`);

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalTicketsSold,
                activeEventsCount,
                eventCount: events.length,
                acquisition: {
                    new: newCustomers,
                    returning: returningCustomers,
                    total: totalUniqueBuyers
                }
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

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const orders = await Order.find({
            eventId: { $in: eventIds },
            paymentStatus: 'paid',
            createdAt: { $gte: sixMonthsAgo }
        }).sort({ createdAt: 1 });

        // Aggregate by Month for the last 6 months
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthlyRevenue = {};
        
        // Pre-fill last 6 months with 0
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = months[d.getMonth()];
            monthlyRevenue[monthName] = 0;
        }

        orders.forEach(order => {
            const date = new Date(order.createdAt);
            const monthName = months[date.getMonth()];
            // Only aggregate if it belongs to the pre-filled last 6 months
            if (monthlyRevenue.hasOwnProperty(monthName)) {
                monthlyRevenue[monthName] += (order.totalAmount || 0);
            }
        });

        res.json({
            success: true,
            data: monthlyRevenue
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

        // Calculate Ticket Distribution
        const orderItems = await mongoose.model('OrderItem').find({
            eventId: { $in: eventIds }
        }).populate('ticketInfoId', 'ticketName');

        const distribution = {};
        orderItems.forEach(item => {
            if (item.ticketInfoId && item.ticketInfoId.ticketName) {
                const name = item.ticketInfoId.ticketName;
                distribution[name] = (distribution[name] || 0) + item.quantity;
            } else {
                distribution['Other'] = (distribution['Other'] || 0) + item.quantity;
            }
        });

        // Calculate Conversion Rate (Paid / Total Orders)
        const totalOrdersCount = await Order.countDocuments({ eventId: { $in: eventIds } });
        const paidOrdersCount = await Order.countDocuments({ eventId: { $in: eventIds }, paymentStatus: 'paid' });
        const conversionRate = totalOrdersCount > 0 ? (paidOrdersCount / totalOrdersCount) * 100 : 0;
        const performanceData = events.map(event => {
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
            data: {
                performance: performanceData,
                ticketDistribution: distribution,
                conversionRate: conversionRate.toFixed(1)
            }
        });
    } catch (error) {
        console.error('Owner Analytics Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu phân tích' });
    }
};
