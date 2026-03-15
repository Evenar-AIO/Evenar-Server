const mongoose = require('mongoose');
const {
    getAllUsers,
    lockUserAccount,
    unlockUserAccount,
    deleteUser,
    approveEvent,
    processRefund,
    getAllTransactions,
    getAuditLogs,
    exportStatsReport,
    getDashboardStats
} = require('../../src/controllers/admin.controller');

const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const Order = require('../../src/models/Order');
const Refund = require('../../src/models/Refund');
const AuditLog = require('../../src/models/AuditLog');
const { logAuditAction } = require('../../src/utils/audit.util');
const { Parser } = require('json2csv');

jest.mock('../../src/models/User');
jest.mock('../../src/models/Event');
jest.mock('../../src/models/Order');
jest.mock('../../src/models/Refund');
jest.mock('../../src/models/AuditLog');
jest.mock('../../src/utils/audit.util', () => ({
    logAuditAction: jest.fn()
}));
jest.mock('json2csv', () => {
    return {
        Parser: jest.fn().mockImplementation(() => {
            return {
                parse: jest.fn().mockReturnValue('mock,csv,content')
            };
        })
    };
});

describe('Admin Controller', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            query: {},
            params: {},
            body: {},
            user: { id: 'admin1', legacyId: 1 }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            header: jest.fn(),
            attachment: jest.fn(),
            send: jest.fn()
        };

        jest.clearAllMocks();
    });

    describe('getAllUsers', () => {
        it('should return a list of users successfully', async () => {
            mockReq.query = { page: 1, limit: 10 };
            
            const mockUsers = [{ username: 'test1' }, { username: 'test2' }];
            User.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockUsers)
            });
            User.countDocuments.mockResolvedValue(2);

            await getAllUsers(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Users retrieved successfully',
                data: mockUsers,
                meta: { total: 2, page: 1, limit: 10 }
            });
        });

        it('should return 400 on validation error', async () => {
            mockReq.query = { page: 0 };
            
            await getAllUsers(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('lockUserAccount', () => {
        it('should lock a user and log activity', async () => {
            mockReq.params = { id: 'user_id' };
            
            const mockUser = { _id: 'user_id', isLocked: true };
            User.findByIdAndUpdate.mockResolvedValue(mockUser);

            await lockUserAccount(mockReq, mockRes);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user_id', { $set: { isLocked: true } }, { new: true });
            expect(logAuditAction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if user not found', async () => {
            mockReq.params = { id: 'unknown_id' };
            User.findByIdAndUpdate.mockResolvedValue(null);

            await lockUserAccount(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'User not found', data: {} });
        });
        
        it('should return 400 on validation error', async () => {
            mockReq.params = { id: undefined };
            
            await lockUserAccount(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    describe('unlockUserAccount', () => {
        it('should unlock a user and log activity', async () => {
            mockReq.params = { id: 'user_id' };
            
            const mockUser = { _id: 'user_id', isLocked: false };
            User.findByIdAndUpdate.mockResolvedValue(mockUser);

            await unlockUserAccount(mockReq, mockRes);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user_id', { $set: { isLocked: false } }, { new: true });
            expect(logAuditAction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('deleteUser', () => {
        it('should soft-delete a user and log activity', async () => {
            mockReq.params = { id: 'user_id' };
            
            const mockUser = { _id: 'user_id', isDeleted: true };
            User.findByIdAndUpdate.mockResolvedValue(mockUser);

            await deleteUser(mockReq, mockRes);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user_id', expect.any(Object), { new: true });
            expect(logAuditAction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('approveEvent', () => {
        it('should approve a pending event', async () => {
            mockReq.params = { id: 'event_id' };
            
            const mockPendingEvent = { _id: 'event_id', status: 'pending' };
            const mockApprovedEvent = { _id: 'event_id', status: 'approved' };
            
            Event.findById.mockResolvedValue(mockPendingEvent);
            Event.findByIdAndUpdate.mockResolvedValue(mockApprovedEvent);

            await approveEvent(mockReq, mockRes);

            expect(Event.findById).toHaveBeenCalledWith('event_id');
            expect(Event.findByIdAndUpdate).toHaveBeenCalledWith('event_id', { $set: { status: 'approved' } }, { new: true });
            expect(logAuditAction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if event is not pending', async () => {
            mockReq.params = { id: 'event_id' };
            Event.findById.mockResolvedValue({ _id: 'event_id', status: 'approved' });

            await approveEvent(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        
        it('should return 404 if event is not found', async () => {
            mockReq.params = { id: 'event_id' };
            Event.findById.mockResolvedValue(null);

            await approveEvent(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('processRefund', () => {
        it('should process a refund properly (approve)', async () => {
            mockReq.body = { refundId: 'refund_id', status: 'approved' };
            
            const mockRefund = { _id: 'refund_id', status: 'pending', orderId: 1, orderID: 'order_123' };
            const updatedRefund = { _id: 'refund_id', status: 'approved', orderId: 1, orderID: 'order_123' };
            
            Refund.findById.mockResolvedValue(mockRefund);
            Refund.findByIdAndUpdate.mockResolvedValue(updatedRefund);
            Order.findOneAndUpdate.mockResolvedValue({});

            await processRefund(mockReq, mockRes);

            expect(Refund.findByIdAndUpdate).toHaveBeenCalledWith('refund_id', expect.any(Object), { new: true });
            expect(Order.findOneAndUpdate).toHaveBeenCalled();
            expect(logAuditAction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if refund is already processed', async () => {
            mockReq.body = { refundId: 'refund_id', status: 'approved' };
            Refund.findById.mockResolvedValue({ _id: 'refund_id', status: 'approved' });

            await processRefund(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        
        it('should return 404 if refund is not found', async () => {
            mockReq.body = { refundId: 'refund_id', status: 'approved' };
            Refund.findById.mockResolvedValue(null);

            await processRefund(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getAllTransactions', () => {
        it('should return paginated transactions', async () => {
            Order.aggregate.mockResolvedValue([{ id: 'order_1' }]);
            Order.countDocuments.mockResolvedValue(1);

            await getAllTransactions(mockReq, mockRes);

            expect(Order.aggregate).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: [{ id: 'order_1' }],
                meta: expect.anything()
            }));
        });
    });

    describe('getAuditLogs', () => {
        it('should return paginated audit logs', async () => {
            AuditLog.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue([{ id: 'log_1' }])
            });
            AuditLog.countDocuments.mockResolvedValue(1);

            await getAuditLogs(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('exportStatsReport', () => {
        it('should return csv by default', async () => {
            User.countDocuments.mockResolvedValue(10);
            Event.countDocuments.mockResolvedValue(5);
            Order.countDocuments.mockResolvedValue(20);
            Order.aggregate.mockResolvedValue([{ total: 1000 }]);

            await exportStatsReport(mockReq, mockRes);

            expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockRes.send).toHaveBeenCalledWith('mock,csv,content');
        });

        it('should return json if format is json', async () => {
            mockReq.query = { format: 'json' };
            User.countDocuments.mockResolvedValue(10);
            Event.countDocuments.mockResolvedValue(5);
            Order.countDocuments.mockResolvedValue(20);
            Order.aggregate.mockResolvedValue([{ total: 1000 }]);

            await exportStatsReport(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    TotalUsers: 10,
                    TotalEvents: 5,
                    TotalOrders: 20,
                    TotalRevenueVND: 1000
                })
            }));
        });
    });

    describe('getDashboardStats', () => {
        it('should aggregate dashboard stats correctly', async () => {
            User.countDocuments.mockResolvedValue(100);
            Event.countDocuments.mockResolvedValue(10);
            Order.countDocuments.mockResolvedValue(50);
            Refund.countDocuments.mockResolvedValue(5);
            Order.aggregate.mockResolvedValue([{ _id: 'date', revenue: 500, total: 1000, orders: 10 }]);

            await getDashboardStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    activeUsers: 100,
                    totalEvents: 10,
                    pendingApprovals: 10,
                    totalRevenue: 1000,
                    totalRefunds: 5
                })
            }));
        });
    });
});
