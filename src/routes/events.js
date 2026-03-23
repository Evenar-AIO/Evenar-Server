const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateCreateEventPayload, validateUpdateEventPayload } = require('../validators/eventPayloadValidator');

router.post('/', verifyToken, validateCreateEventPayload, eventController.createEvent);

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);

router.put("/:id/withdraw", verifyToken, eventController.withdrawEvent);
router.put("/:id/submit", verifyToken, eventController.submitEvent);
router.put("/:id", verifyToken, validateUpdateEventPayload, eventController.updateEvent);

router.delete("/:id", verifyToken, eventController.deleteEvent);
module.exports = router;
