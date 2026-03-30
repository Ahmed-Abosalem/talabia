import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import { isCompleted } from "../utils/orderStatus.js";

dotenv.config({ path: "./backend/.env" });

const debugStats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ DB Connected");

        // 1. Get a seller ID from an existing order to be sure
        const sampleOrder = await Order.findOne({ "orderItems.0": { $exists: true } });
        if (!sampleOrder) {
            console.log("❌ No orders found");
            process.exit();
        }

        const sellerId = sampleOrder.orderItems[0].seller;
        console.log(`🔍 Testing with Seller ID: ${sellerId} (String: ${String(sellerId)})`);

        // 2. Simulate computeSellerOrderStats query
        const match = {
            "orderItems.seller": String(sellerId), // Trying string explicitly as controller does implicitly via mongoose?
            // Actually controller passes string if it came from req.user._id.toString()
            // Let's try both ObjectId and String
        };

        console.log("--- Querying with match:", match);
        const orders = await Order.find(match).select("orderItems createdAt status");
        console.log(`📦 Found ${orders.length} orders matching seller.`);

        let totalItems = 0;
        let completedItems = 0;

        for (const order of orders) {
            console.log(`\nOrder [${order._id}] items:`);
            const items = order.orderItems || [];

            for (const item of items) {
                // Filter by seller
                const rawSeller = item.seller && item.seller._id ? item.seller._id : item.seller;
                if (String(rawSeller) !== String(sellerId)) continue;

                totalItems++;
                const isComp = isCompleted(item);
                console.log(`   - Item Status: ${item.statusCode} | Legacy: ${item.itemStatus} | isCompleted: ${isComp}`);

                if (isComp) {
                    completedItems++;
                }
            }
        }

        console.log(`\n📊 Manual Stats Calc: Total: ${totalItems}, Completed: ${completedItems}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

debugStats();
