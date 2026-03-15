const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true
  },
  eventId: {
    type: Number,
    required: true
  },
  orderId: {
    type: Number,
    required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    required: true
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

module.exports = mongoose.model('Feedback', feedbackSchema);
