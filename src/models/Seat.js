const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
    {
        zone: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Zone",
            required: true
        },
        row: {
            type: String, // e.g., "A", "B"
            required: true
        },
        number: {
            type: Number, // e.g., 1, 2, 3
            required: true
        },
        status: {
            type: String,
            enum: ["available", "booked", "locked"],
            default: "available"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Seat", seatSchema);
