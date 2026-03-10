const express = require("express");
const { getCurrentUser, requireRoles } = require("../middleware/auth");
const { createFeedback, getFeedbackByEvent } = require("../controllers/feedbackController");

const router = express.Router();

router.get("/:eventId", getFeedbackByEvent);

router.post("/", getCurrentUser, requireRoles("customer", "eventowner"), createFeedback);

module.exports = router;
