const express = require("express");
const { verifyToken, requireRoles } = require("../middleware/auth.middleware");
const { createFeedback, getFeedbackByEvent } = require("../controllers/feedbackController");

const router = express.Router();

router.get("/:eventId", getFeedbackByEvent);

router.post("/", verifyToken, createFeedback);

module.exports = router;
