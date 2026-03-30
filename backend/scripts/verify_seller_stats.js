// backend/scripts/verify_seller_stats.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import { isCompleted, isCancelled } from "../utils/orderStatus.js";

dotenv.config({ path: "./backend/.env" });

const verifyStats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ تم الاتصال بقاعدة البيانات.");

        const orders = await Order.find({});
        console.log(`📦 جاري تحليل ${orders.length} طلب في النظام...`);

        const statsBySeller = new Map();

        for (const order of orders) {
            if (!order.orderItems) continue;

            for (const item of order.orderItems) {
                const sellerId = item.seller ? String(item.seller._id || item.seller) : "unknown";

                if (!statsBySeller.has(sellerId)) {
                    statsBySeller.set(sellerId, { total: 0, completed: 0, pending: 0, cancelled: 0 });
                }

                const s = statsBySeller.get(sellerId);

                if (isCancelled(item)) {
                    s.cancelled++;
                } else {
                    s.total++;
                    if (isCompleted(item)) {
                        s.completed++;
                    } else {
                        s.pending++;
                    }
                }
            }
        }

        console.log("\n📊 ملخص إحصاءات البائعين (بناءً على المنطق الموحد):");
        console.log("────────────────────────────────────────────────");
        for (const [sellerId, s] of statsBySeller.entries()) {
            console.log(`👤 بائع [${sellerId}]:`);
            console.log(`   - إجمالي المنتجات النشطة: ${s.total}`);
            console.log(`   - المنتجات المكتملة: ${s.completed} ✅`);
            console.log(`   - المنتجات قيد التنفيذ: ${s.pending}`);
            console.log(`   - المنتجات الملغاة بمختلف أنواعها: ${s.cancelled}`);
            console.log("────────────────────────────────────────────────");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ خطأ أثناء التحقق:", error);
        process.exit(1);
    }
};

verifyStats();
