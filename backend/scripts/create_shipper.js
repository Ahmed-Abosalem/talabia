import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'shipper_audit@test.com';
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({
                name: 'Shipper Audit',
                email: email,
                password: 'Audit123!',
                role: 'shipper',
                isActive: true
            });
            console.log(`Created Shipper: ${user._id}`);
        } else {
            console.log(`Shipper already exists: ${user._id}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
