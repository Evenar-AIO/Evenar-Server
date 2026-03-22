const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  // Use Mixed to support both ObjectId and legacy Number IDs
  eventId: { type: mongoose.Schema.Types.Mixed, required: true },
  ticketInfoId: { type: mongoose.Schema.Types.Mixed, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  seatIds: [{ type: String }]
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  items: [cartItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
