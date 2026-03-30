import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OrderSchema = new mongoose.Schema({
    orderNumber: String,
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderItems: Array,
    totalPrice: Number,
    statusCode: String,
    paymentMethod: String,
    paymentStatus: String,
    createdAt: Date
});

const Order = mongoose.model('Order', OrderSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        console.log('--- Recent Orders ---');
        orders.forEach(o => {
            console.log(`ID: ${o._id} | Num: ${o.orderNumber} | Buyer: ${o.buyer} | Seller: ${o.seller} | Total: ${o.totalPrice} | Status: ${o.statusCode} | Payment: ${o.paymentMethod} | Date: ${o.createdAt}`);
            console.log(`   Items: ${o.orderItems.length}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
