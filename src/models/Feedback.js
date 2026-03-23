const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  legacyUserId: { type: Number },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false
  },
  legacyEventId: { type: Number },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  legacyOrderId: { type: Number },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    required: false
  },
  comment: {
    type: String,
    default: ""
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  adminResponse: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'feedbacks'
});

feedbackSchema.index({ eventId: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
