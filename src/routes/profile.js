const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth.middleware');

// @route   POST /api/profile/update
// @access  Private
router.post('/update', verifyToken, profileController.updateProfile);

module.exports = router;
