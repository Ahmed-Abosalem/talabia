import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAnomalies() {
    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔍 CHECKING FOR FINANCIAL ANOMALIES...");

        // 1. Find transactions for non-delivered orders
        const earningsTypes = ["ORDER_EARNING_SELLER", "ORDER_EARNING_SHIPPING", "ORDER_EARNING_PLATFORM"];
        
        const anomalies = await Transaction.aggregate([
            { $match: { type: { $in: earningsTypes } } },
            {
                $lookup: {
                    from: "orders",
                    localField: "order",
                    foreignField: "_id",
                    as: "orderData"
                }
            },
            { $unwind: "$orderData" },
            {
                $match: {
                    "orderData.statusCode": { $ne: ORDER_STATUS_CODES.DELIVERED }
                }
            },
            {
                $project: {
                    _id: 1,
                    type: 1,
                    amount: 1,
                    orderId: "$orderData._id",
                    orderStatus: "$orderData.status",
                    orderStatusCode: "$orderData.statusCode"
                }
            }
        ]);

        if (anomalies.length === 0) {
            console.log("✅ PERFECT: No earning transactions found for non-delivered orders.");
        } else {
            console.warn(`⚠️ ALERT: Found ${anomalies.length} anomaly transactions!`);
            anomalies.slice(0, 10).forEach(a => {
                console.log(`   - Tx: ${a._id}, Amt: ${a.amount}, Order: ${a.orderId}, Status: ${a.orderStatusCode} (${a.orderStatus})`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAnomalies();
