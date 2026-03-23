const mongoose = require("mongoose");

const supportItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.Mixed, ref: "User", required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: "other" },
    status: { type: String, enum: ["pending", "in_progress", "resolved", "rejected"], default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    adminResponse: { type: String },
    lastModified: { type: Date },
  },
  { timestamps: true, collection: 'supportItems' }
);

supportItemSchema.index({ userId: 1 });
supportItemSchema.index({ status: 1 });
supportItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SupportItem", supportItemSchema);
