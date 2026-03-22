const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        legacyId: { type: Number },
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true
        },
        description: {
            type: String,
            required: [true, 'Please add a description']
        },
        physicalLocation: {
            type: String,
            required: [true, 'Please add a location']
        },
        startTime: {
            type: Date,
            required: [true, 'Please add starting time']
        },
        endTime: {
            type: Date,
            required: [true, 'Please add ending time']
        },
        ownerId: {
            type: Number,
            required: true
        },
        genreId: {
            type: Number
        },
        totalTicketCount: {
            type: Number,
            required: [true, 'Please add total tickets']
        },
        soldTickets: {
            type: Number,
            default: 0
        },
        isApproved: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            default: 'active'
        },
        imageURL: {
            type: String
        },
        layout: {
            type: mongoose.Schema.Types.Mixed
        },
        organizerName: {
            type: String
        },
        ageLimit: {
            type: Number
        },
        dressCode: {
            type: String
        },
        hasSeatingChart: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Event', eventSchema, 'events');
