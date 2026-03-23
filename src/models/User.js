const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email'
            ]
        },
        passwordHash: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false
        },
        role: {
            type: String,
            enum: ['customer', 'event_owner', 'admin', 'organizer'],
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
        companyName: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        },
        contactInfo: {
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
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        verifyOtp: {
            type: String,
            default: null
        },
        verifyOtpExpiresAt: {
            type: Date,
            default: null
        },
        resetOtp: {
            type: String,
            default: null
        },
        resetOtpExpiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema, 'users');
