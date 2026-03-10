const mongoose = require("mongoose");

const supportItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["technical", "billing", "event", "other"], default: "other" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

supportItemSchema.index({ userId: 1 });
supportItemSchema.index({ status: 1 });
supportItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SupportItem", supportItemSchema);
