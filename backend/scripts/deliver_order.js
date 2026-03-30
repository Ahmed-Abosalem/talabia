import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orderId = '69c83b6a58b14196cbd025b0';
        const order = await Order.findById(orderId);
        
        if (!order) {
            console.error('No order found');
            process.exit(1);
        }

        order.statusCode = 'DELIVERED';
        order.isPaid = true; // Mark as paid since it's COD and delivered
        order.deliveredAt = new Date();
        await order.save();
        
        console.log(`Updated Order ${orderId} to status: ${order.statusCode}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
