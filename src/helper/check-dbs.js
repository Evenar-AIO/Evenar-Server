const mongoose = require('mongoose');
require('dotenv').config();

const checkDBs = async () => {
    const email = 'adminEventWeb@support.com';
    const dbs = ['evenar', 'EventTicketDB'];
    
    for (const dbName of dbs) {
        try {
            const uri = `mongodb://localhost:27017/${dbName}`;
            const conn = await mongoose.createConnection(uri).asPromise();
            const User = conn.model('User', new mongoose.Schema({ email: String, role: String, isVerified: Boolean }));
            
            const user = await User.findOne({ email });
            console.log(`DB: ${dbName}`);
            if (user) {
                console.log(`  Found user: ${user.email}, Role: ${user.role}, Verified: ${user.isVerified}`);
            } else {
                console.log('  User not found');
            }
            await conn.close();
        } catch (err) {
            console.log(`Error checking ${dbName}: ${err.message}`);
        }
    }
    process.exit(0);
};

checkDBs();
