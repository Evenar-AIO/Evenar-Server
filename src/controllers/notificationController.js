const Notification = require("../models/Notification");

/**
 * GET /notifications - Danh sách thông báo (Customer / EventOwner / Admin)
 */
async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const unreadOnly = req.query.unread === "true";

    const filter = role === "admin" ? {} : { userId };
    if (unreadOnly) filter.read = false;

    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /notifications/:id/read - Đánh dấu đã đọc (optional, có thể thêm route sau)
 */
async function markRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotifications, markRead };
