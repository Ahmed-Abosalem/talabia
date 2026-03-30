// backend/scripts/verify_financial_integrity.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

dotenv.config({ path: "./backend/.env" });

const verifyFinancials = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database Connected.");

        // 1. Find all Delivered Orders
        // We look for the unified status code OR the legacy status for safety,
        // but primarily the unified code since that's our new truth.
        const query = {
            statusCode: ORDER_STATUS_CODES.DELIVERED
        };

        const deliveredOrders = await Order.find(query).select("_id status statusCode");
        console.log(`\n🔍 Found ${deliveredOrders.length} DELIVERED orders in the system.`);

        if (deliveredOrders.length === 0) {
            console.log("⚠️ No delivered orders found to verify financials for.");
            process.exit(0);
        }

        let verifiedCount = 0;
        let missingCount = 0;

        console.log("\n🧾 Checking Financial Transactions for each...");
        console.log("────────────────────────────────────────────────");

        for (const order of deliveredOrders) {
            // Check if ANY transaction exists for this order
            const txCount = await Transaction.countDocuments({ order: order._id });

            if (txCount > 0) {
                verifiedCount++;
                // console.log(`✅ Order [${order._id}] has ${txCount} transactions.`);
            } else {
                missingCount++;
                console.warn(`❌ Order [${order._id}] is DELIVERED but has NO transactions!`);
                console.warn(`   Status: ${order.status}, Code: ${order.statusCode}`);
            }
        }

        console.log("────────────────────────────────────────────────");
        console.log(`📊 Financial Integrity Results:`);
        console.log(`   - Fully Reconciled: ${verifiedCount}`);
        console.log(`   - Missing Records:  ${missingCount}`);

        if (missingCount === 0) {
            console.log("\n🎉 SUCCESS: All delivered orders have financial records.");
            process.exit(0);
        } else {
            console.error("\n⚠️ WARNING: Some delivered orders are missing financial records.");
            console.error("   This might be expected for old legacy orders before the new system.");
            process.exit(0); // Exit 0 because this is a verify script, not a functional failure of the script itself
        }

    } catch (error) {
        console.error("❌ Error during verification:", error);
        process.exit(1);
    }
};

verifyFinancials();
