const mongoose = require("mongoose");

const ticketInfoSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        zone: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Zone"
        },
        name: {
            type: String, // e.g., "Early Bird", "Standard", "VIP Box"
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        description: String,
        salesStart: Date,
        salesEnd: Date
    },
    { timestamps: true }
);

module.exports = mongoose.model("TicketInfo", ticketInfoSchema);
