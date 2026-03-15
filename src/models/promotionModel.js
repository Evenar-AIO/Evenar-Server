const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  promotionName: { type: String, required: true },
  promotionCode: { type: String, required: true, unique: true },
  description: { type: String },
  promotionType: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  eventId: { type: mongoose.Schema.Types.Mixed }, // Can be ObjectId or legacy number
  discountPercentage: { type: Number },
  discountAmount: { type: Number },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number },
  maxUsageCount: { type: Number },
  currentUsageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);
