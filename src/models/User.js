const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
            trim: true,
        },
        birthday: {
            type: Date,
        },
        role: {
            type: String,
            enum: ["Customer", "EventOwner", "Admin"],
            required: true,
        },

        companyName: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        contactInfo: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);