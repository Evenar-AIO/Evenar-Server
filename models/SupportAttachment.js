const mongoose = require("mongoose");

const supportAttachmentSchema = new mongoose.Schema(
  {
    supportItemId: { type: mongoose.Schema.Types.ObjectId, ref: "SupportItem", required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

supportAttachmentSchema.index({ supportItemId: 1 });

module.exports = mongoose.model("SupportAttachment", supportAttachmentSchema);
