const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const eventController = require('../controllers/eventController');

const router = express.Router();

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.post('/', authMiddleware, roleMiddleware('EventOwner', 'Admin'), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware('EventOwner', 'Admin'), eventController.updateEvent);
router.delete('/:id', authMiddleware, roleMiddleware('EventOwner', 'Admin'), eventController.deleteEvent);

module.exports = router;
