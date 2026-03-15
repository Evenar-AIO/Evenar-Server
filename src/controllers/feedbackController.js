const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

/**
 * POST /feedback - Tạo phản hồi (Customer)
 * Body: eventId, rating (1-5), comment?
 */
async function createFeedback(req, res) {
  try {
    const userId = req.user.id;
    const { eventId, rating, comment } = req.body || {};

    if (!eventId || rating == null) {
      return res.status(400).json({ error: "eventId and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be between 1 and 5" });
    }

    const existing = await Feedback.findOne({ eventId, userId });
    if (existing) {
      return res.status(400).json({ error: "You have already submitted feedback for this event" });
    }

    const feedback = await Feedback.create({
      eventId,
      userId,
      rating: Number(rating),
      comment: comment || "",
    });

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /feedback/:eventId - Danh sách feedback của event (Guest / Customer / EventOwner)
 */
async function getFeedbackByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = parseInt(req.query.skip, 10) || 0;

    const items = await Feedback.find({ eventId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean();

    const eventMatch = mongoose.Types.ObjectId.isValid(eventId) 
      ? { $match: { $or: [{ eventId: new mongoose.Types.ObjectId(eventId) }, { eventId: eventId }] } }
      : { $match: { eventId: !isNaN(Number(eventId)) ? Number(eventId) : eventId } };

    const stats = await Feedback.aggregate([
      eventMatch,
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]).catch(() => []);

    res.json({
      items,
      stats: stats[0] ? { average: stats[0].average, count: stats[0].count } : { average: 0, count: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createFeedback, getFeedbackByEvent };
