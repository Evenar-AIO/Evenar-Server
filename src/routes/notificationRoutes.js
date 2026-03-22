const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { getNotifications, markRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(verifyToken);


router.get("/", getNotifications);
router.patch("/:id/read", markRead);

module.exports = router;
