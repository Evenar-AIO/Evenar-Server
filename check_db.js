const mongoose = require('mongoose');
require('dotenv').config({ path: '/home/rio/Documents/CODE/combos/server/.env' });

async function checkEvents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/EventTicketDB');
        const Event = require('/home/rio/Documents/CODE/combos/server/src/models/Event');
        const Order = require('/home/rio/Documents/CODE/combos/server/src/models/Order');
        const User = require('/home/rio/Documents/CODE/combos/server/src/models/User');

        const events = await Event.find({});
        console.log(`Found ${events.length} events total.`);
        
        events.forEach(e => {
            console.log(`Event: ${e.name}, ID: ${e._id}, Owner: ${e.ownerId}, Status: ${e.status}, Deleted: ${e.isDeleted}`);
        });

        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders total.`);
        orders.forEach(o => {
            console.log(`Order: ${o.orderNumber}, Event: ${o.eventId}, Amount: ${o.totalAmount}, PaymentStatus: ${o.paymentStatus}`);
        });

        const users = await User.find({ role: { $in: ['organizer', 'event_owner', 'EventOwner', 'admin'] } });
        console.log(`Found ${users.length} organizers/owners/admins.`);
        users.forEach(u => {
            console.log(`User: ${u.username}, ID: ${u._id}, Role: ${u.role}, Email: ${u.email}`);
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkEvents();
