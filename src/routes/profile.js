const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');

// @route   POST /api/profile/update
// @access  Private
router.post('/update', verifyToken, profileController.updateProfile);

// @route   POST /api/owner/profile/update
// @access  Private
router.post('/owner/profile/update', verifyToken, profileController.updateProfile);

module.exports = router;
