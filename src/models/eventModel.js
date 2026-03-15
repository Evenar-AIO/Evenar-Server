const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    ownerId: { type: Number, required: false },
    name: { type: String, required: true },
    description: String,
    physicalLocation: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    totalTicketCount: Number,
    isApproved: { type: Boolean, default: false },
    status: { type: String, default: "active" },
    imageURL: String,
    hasSeatingChart: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    genres: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre"
    }],
    genreId: Number,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    legacyId: { type: Number, unique: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
