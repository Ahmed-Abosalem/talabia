import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const order = new Order({
            buyer: new mongoose.Types.ObjectId(),
            seller: new mongoose.Types.ObjectId(),
            store: new mongoose.Types.ObjectId(),
            orderItems: [
                {
                    product: new mongoose.Types.ObjectId(),
                    name: 'Product 1',
                    qty: 1,
                    price: 100,
                    deliveryCode: '111111'
                },
                {
                    product: new mongoose.Types.ObjectId(),
                    name: 'Product 2',
                    qty: 2,
                    price: 200,
                    deliveryCode: '222222'
                }
            ],
            shippingAddress: {
                fullName: 'Test User',
                phone: '123456',
                street: 'Street',
                city: 'City'
            },
            totalPrice: 500
        });

        const saved = await order.save();
        console.log('--- Order Created ---');
        console.log(`Order Number: ${saved.orderNumber}`);
        saved.orderItems.forEach((item, index) => {
            console.log(`Item ${index + 1} Number: ${item.itemNumber}`);
        });

        // Cleanup
        await Order.deleteOne({ _id: saved._id });
        console.log('Order deleted.');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
