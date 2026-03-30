
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import ShippingCompany from "../models/ShippingCompany.js";
import Order from "../models/Order.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function checkOrphanOrders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected");

        // 1. Ready to ship but no shipping company
        const unassigned = await Order.countDocuments({
            statusCode: ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP,
            shippingCompany: { $exists: false }
        });
        console.log(`📦 Unassigned 'READY_TO_SHIP' orders: ${unassigned}`);

        // 2. All active orders (AT_SELLER_READY_TO_SHIP or IN_SHIPPING)
        const activeOrders = await Order.find({
            statusCode: { $in: [ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP, ORDER_STATUS_CODES.IN_SHIPPING] }
        })
            .populate('shippingCompany', 'name')
            .select('orderNumber statusCode shippingCompany')
            .lean();

        console.log(`\n📦 Active Shipping Orders in System: ${activeOrders.length}`);
        activeOrders.forEach(o => {
            console.log(` - Order #${o.orderNumber || o._id} | Status: ${o.statusCode} | Assigned to: ${o.shippingCompany?.name || 'NONE'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkOrphanOrders();
