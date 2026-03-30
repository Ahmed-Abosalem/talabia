
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/talabia";

async function inspectOrders() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const ordersCollection = db.collection('orders');

        const sampleOrders = await ordersCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();

        console.log(`\n--- Inspecting last 5 orders ---\n`);

        sampleOrders.forEach((order, i) => {
            console.log(`Order #${i + 1} (${order._id}):`);
            console.log(`  shippingAddress:`, JSON.stringify(order.shippingAddress, null, 2));

            const hasNeighborhood = order.shippingAddress && 'neighborhood' in order.shippingAddress;
            console.log(`  Contains 'neighborhood' field? ${hasNeighborhood ? '✅ YES' : '❌ NO'}`);
            console.log('-----------------------------------');
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

inspectOrders();
