const express = require("express");
const { getCurrentUser, requireRoles } = require("../middleware/auth");
const { getNotifications, markRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(getCurrentUser);
router.use(requireRoles("customer", "eventowner", "admin"));

router.get("/", getNotifications);
router.patch("/:id/read", markRead);

module.exports = router;
