const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

feedbackSchema.index({ eventId: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
