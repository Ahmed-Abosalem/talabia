import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Order from "../models/Order.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";
import { CANCELLED_CODES } from "../utils/cancellationCodes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyReportingFix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📊 VERIFYING REPORTING FIX...");

        // Scenario 1: Total Sales WITHOUT exclusion (The OLD way)
        const oldWayAgg = await Order.aggregate([
            { $match: { statusCode: { $nin: ["CANCELLED", "CANCELLED_BY_ADMIN"] } } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        // Scenario 2: Total Sales WITH exclusion (The NEW way)
        const newWayAgg = await Order.aggregate([
            { $match: { statusCode: { $nin: CANCELLED_CODES } } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);

        const oldTotal = oldWayAgg[0]?.total || 0;
        const newTotal = newWayAgg[0]?.total || 0;

        console.log(`- Old Logic Total: ${oldTotal} SAR`);
        console.log(`- New Logic Total: ${newTotal} SAR`);

        if (oldTotal > newTotal) {
            console.log("✅ SUCCESS: The new logic correctly excludes more cancellations than before.");
            console.log(`   Difference: ${oldTotal - newTotal} SAR removed from "ghost" sales.`);
        } else if (oldTotal === newTotal) {
            console.log("ℹ️ INFO: No difference in current data, but the logic is now safer.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyReportingFix();
