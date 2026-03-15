const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

const seedUsers = [
    {
        "_id": "000000000000000000000001",
        "name": "Admin",
        "email": "adminEventWeb@support.com",
        "password": "ddfa08f04ffbedd937ce079026ead9826c0f4572feee5e45ff2a66d058c0c9d5",
        "role": "admin",
        "isLocked": false,
        "createdAt": new Date("2026-03-15T09:00:00Z"),
        "updatedAt": new Date("2026-03-15T09:00:00Z"),
    },
    {
        "_id": "000000000000000000000002",
        "name": "TayNguyen Sound",
        "email": "organizer@ticketbox.vn",
        "password": "058caa5e5eec0aa2911b924607646627dbf0815d513576ada793072e78810691",
        "role": "user",
        "isLocked": false,
        "createdAt": new Date("2026-03-25T14:30:00Z"),
        "updatedAt": new Date("2026-03-25T14:30:00Z"),
    }
];

const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/evenar';
        console.log(`Connecting to MongoDB at: ${mongoUri}`);

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB connected successfully for seeding.');

        console.log('Dropping existing users...');
        await User.deleteMany({});

        console.log(`Seeding ${seedUsers.length} users...`);
        await User.insertMany(seedUsers);

        console.log('✅ Database seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error testing database connection or seeding data:', error);
        process.exit(1);
    }
};

seedDatabase();
