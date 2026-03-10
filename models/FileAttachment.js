const mongoose = require("mongoose");

const fileAttachmentSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

fileAttachmentSchema.index({ messageId: 1 });

module.exports = mongoose.model("FileAttachment", fileAttachmentSchema);
