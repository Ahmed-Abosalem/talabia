import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find the latest order for seller "خالد القاسمي" (698e362a63cb3f35548167e8)
        const sellerId = '698e362a63cb3f35548167e8';
        const order = await Order.findOne({ seller: sellerId }).sort({ createdAt: -1 });
        
        if (!order) {
            console.error('No order found for this seller');
            process.exit(1);
        }

        console.log(`Found Order: ${order._id} | Current Status: ${order.statusCode}`);
        
        order.statusCode = 'AT_SELLER_READY_TO_SHIP';
        await order.save();
        
        console.log(`Updated Order ${order._id} to status: ${order.statusCode}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
