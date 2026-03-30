
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

async function findCompanyForUser(userId) {
    if (!userId) return null;
    const company = await ShippingCompany.findOne({
        user: userId,
        isActive: true,
    }).lean();
    return company || null;
}

function isItemVisibleForCompany(company, item) {
    if (!item) return false;
    const scope = company?.scope || "global";
    if (scope === "global") return true;
    const stores =
        Array.isArray(company?.stores) && company.stores.length
            ? company.stores.map((id) => id.toString())
            : [];
    if (!stores.length) return false;
    const storeId =
        item.store?._id?.toString?.() ||
        item.store?.toString?.() ||
        (typeof item.store === "string" ? item.store : null);
    if (!storeId) return false;
    return stores.includes(storeId);
}

async function testGetShippingOrders() {
    console.log("\n🧪 TESTING getShippingOrders CONTROLLER LOGIC...\n");

    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI not found in env");
        await mongoose.connect(process.env.MONGO_URI);

        const testUserEmail = "shopingtest@gmail.com";
        const user = await User.findOne({ email: testUserEmail });

        if (!user) {
            console.error(`❌ Test user ${testUserEmail} not found`);
            return;
        }

        console.log(`👤 Using User: ${user.name} (ID: ${user._id}, Role: ${user.role})`);

        const company = await findCompanyForUser(user._id);
        if (!company) {
            console.error("❌ No ShippingCompany found for this user");
            return;
        }
        console.log(`🏢 Linked Company: ${company.name} (ID: ${company._id}, Scope: ${company.scope})`);

        const query = {
            shippingCompany: company._id,
            "orderItems.0": { $exists: true },
        };
        console.log(`🔍 Query: ${JSON.stringify(query)}`);

        const orders = await Order.find(query)
            .populate("buyer", "name email phone")
            .populate("store", "name phone email address")
            .populate("seller", "name phone email address country")
            .populate({
                path: "orderItems.product",
                select: "name images description",
            })
            .populate({
                path: "orderItems.store",
                select: "name phone email address address",
            })
            .sort({ createdAt: -1 })
            .lean();

        console.log(`📦 Found ${orders.length} orders in DB`);

        const sanitized = orders
            .map((order) => {
                try {
                    const items = Array.isArray(order.orderItems)
                        ? order.orderItems
                            .filter((item) => {
                                if (!item) return false;
                                if (item.itemStatus === "ملغى") return false;
                                return isItemVisibleForCompany(company, item);
                            })
                            .map((item) => {
                                const { deliveryCode, ...restItem } = item;
                                return restItem;
                            })
                        : [];

                    if (!items.length) {
                        // console.log(`   - Order ${order._id} filtered out (0 visible items)`);
                        return null;
                    }

                    const { deliveryCode, ...restOrder } = order;
                    return { ...restOrder, orderItems: items };
                } catch (err) {
                    console.error(`❌ Error sanitizing order ${order._id}:`, err);
                    return null;
                }
            })
            .filter(Boolean);

        console.log(`✨ Sanitized results: ${sanitized.length} orders`);

        if (sanitized.length === 0 && orders.length > 0) {
            console.warn("⚠️ All orders were filtered out during sanitization!");
        }

    } catch (e) {
        console.error("💥 CRASH during controller logic simulation:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testGetShippingOrders();
