const SupportItem = require("../models/SupportItem");
const SupportAttachment = require("../models/SupportAttachment");

/**
 * POST /support/submit - Gửi yêu cầu hỗ trợ (Customer / EventOwner)
 * Body: subject, description, category?, attachments?: [{ filename, url, originalName, mimeType, size }]
 */
async function submitSupport(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { subject, description, category, attachments } = req.body || {};

    if (!subject || !description) {
      return res.status(400).json({ error: "subject and description are required" });
    }

    const item = await SupportItem.create({
      userId,
      subject,
      description,
      category: category || "other",
    });

    if (attachments && attachments.length > 0) {
      const docs = attachments.map((a) => ({
        supportItemId: item._id,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType || "application/octet-stream",
        size: a.size,
        url: a.url,
      }));
      await SupportAttachment.insertMany(docs);
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /support/list - Danh sách ticket hỗ trợ (Customer / EventOwner xem của mình; Admin xem tất cả)
 */
async function getSupportList(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const role = req.user.role;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = parseInt(req.query.skip, 10) || 0;
    const status = req.query.status;

    const filter = role === "admin" ? {} : { userId };
    if (status) filter.status = status;

    const items = await SupportItem.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean();

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { submitSupport, getSupportList };
