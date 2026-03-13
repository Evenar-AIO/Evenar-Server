const express = require('express');
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
    getDashboardStats,
    getAllRefunds
} = require('../controllers/admin.controller');

// Need to import auth middlewares (assumed structure)
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect ALL admin routes with authentication and admin authorization middlewares
router.use(verifyToken, verifyAdmin);

// 1. Get all users
router.get('/users', getAllUsers);

// 2. Lock user account
router.post('/users/:id/lock', lockUserAccount);

// 3. Unlock user account
router.post('/users/:id/unlock', unlockUserAccount);

// 4. Delete user
router.delete('/users/:id', deleteUser);

// 5. Approve event
router.post('/events/:id/approve', approveEvent);

// 6. Process refund
// Assuming the router is mounted at /admin, so this becomes /admin/refunds/process
router.post('/refunds/process', processRefund);
router.get('/refunds', getAllRefunds);

// 7. View all transactions
router.get('/transactions', getAllTransactions);

// 8. View audit logs
router.get('/audit-logs', getAuditLogs);

// 9. Export statistics report
router.get('/stats/export', exportStatsReport);

// 10. Admin dashboard statistics
router.get('/dashboard', getDashboardStats);

module.exports = router;
