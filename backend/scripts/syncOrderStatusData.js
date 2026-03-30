// backend/scripts/syncOrderStatusData.js
/**
 * 🧹 سكربت تطهير ومزامنة بيانات حالات الطلبات
 * الهدف: التأكد من أن كل الطلبات القديمة والجديدة لها statusCode صحيح 
 * وأن النصوص العربية متزامنة تماماً معه بناءً على "مصدر الحقيقة".
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import {
    ORDER_STATUS_CODES,
    recomputeOrderStatusCode,
    syncItemStatus,
    syncOrderStatus
} from "../utils/orderStatus.js";

dotenv.config({ path: "./backend/.env" });

const syncData = async () => {
    try {
        console.log("🚀 بدء عملية مزامنة بيانات حالات الطلبات...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ تم الاتصال بقاعدة البيانات.");

        const orders = await Order.find({});
        console.log(`📦 جاري معالجة ${orders.length} طلب...`);

        let updatedOrdersCount = 0;
        let updatedItemsCount = 0;

        for (const order of orders) {
            let isChanged = false;

            // 1. إعادة حساب الكود الموحد للطلب بناءً على الحالات الحالية (Legacy -> Unified)
            const computedCode = recomputeOrderStatusCode(order);

            if (computedCode && order.statusCode !== computedCode) {
                syncOrderStatus(order, computedCode);
                isChanged = true;
            }

            // 2. مزامنة كل عنصر داخل الطلب
            if (Array.isArray(order.orderItems)) {
                for (const item of order.orderItems) {
                    // إذا لم يكن للعنصر كود، نحاول اشتقاقه من حالة الطلب أو حالته النصية
                    const itemCode = item.statusCode || computedCode;
                    if (itemCode) {
                        const oldCode = item.statusCode;
                        const oldStatus = item.itemStatus;

                        syncItemStatus(item, itemCode);

                        if (item.statusCode !== oldCode || item.itemStatus !== oldStatus) {
                            updatedItemsCount++;
                            isChanged = true;
                        }
                    }
                }
            }

            if (isChanged) {
                await order.save();
                updatedOrdersCount++;
            }
        }

        console.log("────────────────────────────────────────────────");
        console.log(`✅ انتهت العملية بنجاح:`);
        console.log(`- طلبات تم تحديثها: ${updatedOrdersCount}`);
        console.log(`- عناصر (Items) تم تصحيحها: ${updatedItemsCount}`);
        console.log("────────────────────────────────────────────────");

        process.exit(0);
    } catch (error) {
        console.error("❌ حدث خطأ أثناء المزامنة:", error);
        process.exit(1);
    }
};

syncData();
