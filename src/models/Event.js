const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true
        },
        description: {
            type: String,
            required: [true, 'Please add a description']
        },
        location: {
            type: String,
            required: [true, 'Please add a location']
        },
        date: {
            type: Date,
            required: [true, 'Please add a date']
        },
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        price: {
            type: Number,
            required: [true, 'Please add a price']
        },
        totalTickets: {
            type: Number,
            required: [true, 'Please add total tickets']
        },
        soldTickets: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

module.exports = mongoose.model('Event', eventSchema);
