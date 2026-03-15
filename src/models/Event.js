const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        description: String,

        date: Date,

        location: String,

        image: String,

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        genres: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Genre"
        }],

        status: {
            type: String,
            enum: ["pending", "approved", "deleted"],
            default: "pending"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);