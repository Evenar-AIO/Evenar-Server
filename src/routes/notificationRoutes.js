const express = require("express");
const { verifyToken, requireRoles } = require("../middleware/auth.middleware");
const { getNotifications, markRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(verifyToken);


router.get("/", getNotifications);
router.patch("/:id/read", markRead);

module.exports = router;
