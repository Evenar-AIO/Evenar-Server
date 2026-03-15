const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User');

const createAdmin = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/EventTicketDB";
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // IMPORTANT: Use lowercase email because authRoutes.js uses .toLowerCase()
        const email = 'adminEventWeb@support.com'.toLowerCase();
        const password = 'Admin123@';

        // Check if exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('Admin already exists, updating password and verifying...');
            user.passwordHash = password; // Pre-save hook will hash it
            user.role = 'admin';
            user.isVerified = true;
            user.isLocked = false;
            await user.save();
        } else {
            console.log('Creating new admin...');
            user = new User({
                username: 'Admin',
                email: email,
                passwordHash: password, // Pre-save hook will hash it
                role: 'admin',
                isVerified: true,
                isLocked: false
            });
            await user.save();
        }

        console.log('-----------------------------------');
        console.log('Admin User Updated Successfully!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();
