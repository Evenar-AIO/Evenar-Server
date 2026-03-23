const express = require('express');
const {
    getAllUsers,
    getUserRoleStats,
    getUserGrowthStats,
    lockUserAccount,
    unlockUserAccount,
    deleteUser,
    approveEvent,
    processRefund,
    getAllTransactions,
    getAuditLogs,
    exportStatsReport,
    getDashboardStats,
    getAllRefunds,
    getRefundStats,
    getRefundById,
    getAllEvents,
    getAllSupportItems,
    getEventById,
    getDailyRevenue,
    updateEvent,
    deleteEvent,
    updateSupportStatus
} = require('../controllers/adminController');
const { getAllRequests, processRequest } = require('../controllers/organizerController');

const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get('/users', getAllUsers);
router.get('/users/stats/roles', getUserRoleStats);
router.get('/users/stats/growth', getUserGrowthStats);

router.post('/users/:id/lock', lockUserAccount);

router.post('/users/:id/unlock', unlockUserAccount);

router.delete('/users/:id', deleteUser);

router.get('/events', getAllEvents);
router.get('/events/:id', getEventById);
router.post('/events/:id/approve', approveEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

router.get('/refunds', getAllRefunds);
router.get('/refunds/stats', getRefundStats);
router.get('/refunds/:id', getRefundById);
router.post('/refunds/process', processRefund);
router.get('/support', getAllSupportItems);
router.put('/support/:id', updateSupportStatus);
router.get('/revenue-daily', getDailyRevenue);

router.get('/transactions', getAllTransactions);

router.get('/audit-logs', getAuditLogs);

router.get('/stats/export', exportStatsReport);

router.get('/dashboard', getDashboardStats);

// Organizer Requests
router.get('/organizer-requests', getAllRequests);
router.post('/organizer-requests/:requestId/process', processRequest);

module.exports = router;
