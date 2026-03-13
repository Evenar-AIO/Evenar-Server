const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        legacyId: {
            type: Number
        },
        username: {
            type: String,
            required: [true, 'Please add a username']
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email'
            ]
        },
        passwordHash: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false // Do not return password by default
        },
        role: {
            type: String,
            enum: ['customer', 'event_owner', 'admin'],
            default: 'customer'
        },
        gender: {
            type: String
        },
        birthday: {
            type: Date
        },
        phoneNumber: {
            type: String
        },
        address: {
            type: String
        },
        avatar: {
            type: String,
            default: ''
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date,
            default: null
        },
        googleId: {
            type: String,
            default: null
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

module.exports = mongoose.model('User', userSchema);
