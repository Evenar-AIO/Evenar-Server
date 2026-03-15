const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        name: {
            type: String, // e.g., "VIP", "Regular", "Balcony"
            required: true
        },
        description: String,
        capacity: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
