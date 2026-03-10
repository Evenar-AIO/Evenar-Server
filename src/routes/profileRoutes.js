const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/me', authMiddleware, profileController.getMyProfile);
router.post('/update', authMiddleware, roleMiddleware('Customer', 'Admin', 'EventOwner'), profileController.updateProfile);
router.post('/owner/profile/update', authMiddleware, roleMiddleware('EventOwner', 'Admin'), profileController.updateOwnerProfile);

module.exports = router;
