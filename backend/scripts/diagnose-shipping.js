
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import ShippingCompany from "../models/ShippingCompany.js";
import Order from "../models/Order.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function diagnoseShipping() {
    console.log("\n🚚 STARTING SHIPPING SYSTEM DIAGNOSIS...\n");

    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI not found in env");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to Database");

        // 1. Check Users with role 'shipper' or 'shipping'
        const shippers = await User.find({ role: { $in: ['shipper', 'shipping'] } }).select('name email role isActive');
        console.log(`\n👥 Shipper Users Found: ${shippers.length}`);
        shippers.forEach(u => console.log(` - ${u.name} (${u.email}) | Role: ${u.role} | Active: ${u.isActive}`));

        // 2. Check Shipping Companies
        const companies = await ShippingCompany.find({}).populate('user', 'name email').lean();
        console.log(`\n🏢 Shipping Companies Found: ${companies.length}`);
        companies.forEach(c => {
            console.log(` - ${c.name} (ID: ${c._id}) | User: ${c.user?.name || 'N/A'} | Active: ${c.isActive} | Scope: ${c.scope}`);
            if (c.stores && c.stores.length > 0) {
                console.log(`   Linked Stores: ${c.stores.length}`);
            }
        });

        // 3. Check Orders with shippingCompany assigned
        const ordersWithShipping = await Order.countDocuments({ shippingCompany: { $exists: true, $ne: null } });
        console.log(`\n📦 Total Orders with Shipping Company: ${ordersWithShipping}`);

        // 4. Sample check for specific assignment
        if (ordersWithShipping > 0) {
            const sampleOrder = await Order.findOne({ shippingCompany: { $exists: true, $ne: null } })
                .populate('shippingCompany', 'name')
                .select('orderNumber status statusCode shippingStatus')
                .lean();
            console.log(`\n📝 Sample Order Assigned:`);
            console.log(` - Order #: ${sampleOrder.orderNumber || sampleOrder._id}`);
            console.log(` - Company: ${sampleOrder.shippingCompany?.name || 'Unknown'}`);
            console.log(` - Status: ${sampleOrder.status} / ${sampleOrder.statusCode}`);
            console.log(` - Shipping Status: ${sampleOrder.shippingStatus}`);
        }

        // 5. Check for orders that SHOULD be visible but might not be
        const eligibleOrders = await Order.countDocuments({
            statusCode: { $in: ['ready_to_ship', 'in_shipping'] }
        });
        console.log(`\n🔍 Orders in 'ready_to_ship' or 'in_shipping' state: ${eligibleOrders}`);

    } catch (e) {
        console.error("❌ Error during diagnosis:", e);
    } finally {
        await mongoose.disconnect();
        console.log("\n🏁 DIAGNOSIS COMPLETE.");
        process.exit(0);
    }
}

diagnoseShipping();
