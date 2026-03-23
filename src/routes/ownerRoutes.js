const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware to ensure the user is an event_owner or organizer
const verifyOwner = (req, res, next) => {
    const role = req.user.role;
    if (role === 'event_owner' || role === 'organizer' || role === 'admin' || role === 'EventOwner') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập vai trò chủ sự kiện' });
    }
};

router.use(verifyToken, verifyOwner);

router.get('/stats', ownerController.getStats);
router.get('/revenue', ownerController.getRevenueData);
router.get('/buyers', ownerController.getBuyers);
router.get('/analytics', ownerController.getAnalytics);

module.exports = router;
