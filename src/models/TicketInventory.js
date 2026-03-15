const mongoose = require("mongoose");

const ticketInventorySchema = new mongoose.Schema(
    {
        ticketInfo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TicketInfo",
            required: true
        },
        totalQuantity: {
            type: Number,
            required: true
        },
        availableQuantity: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TicketInventory", ticketInventorySchema);
