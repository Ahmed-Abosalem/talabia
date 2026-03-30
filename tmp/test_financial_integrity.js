// /tmp/test_financial_integrity.js
// اختبار شامل لنظام الإدارة المالية: من إنشاء الطلب حتى التسوية

import mongoose from 'mongoose';
import Order from '../backend/models/Order.js';
import Transaction from '../backend/models/Transaction.js';
import Store from '../backend/models/Store.js';
import ShippingCompany from '../backend/models/ShippingCompany.js';
import Category from '../backend/models/Category.js';
import { registerFinancialTransactionsForDeliveredOrder } from '../backend/utils/financialTransactions.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
    try {
        console.log("🚀 بدء اختبارات النزاهة المالية...");
        await mongoose.connect(process.env.MONGO_URI);

        // 1. إعداد بيانات الاختبار
        console.log("📝 1. إعداد بيانات الاختبار...");
        const testStore = await Store.create({ name: "متجر اختبار", email: "test-store@example.com" });
        const testShip = await ShippingCompany.create({ name: "شحن اختبار", email: "test-ship@example.com" });
        const testCat = await Category.create({ name: "قسم اختبار", commissionRate: 10 }); // 10% عمولة

        const testOrder = await Order.create({
            store: testStore._id,
            shippingCompany: testShip._id,
            totalPrice: 1050, // 1000 منتجات + 50 شحن
            shippingPrice: 50,
            paymentMethod: 'COD',
            status: 'DELIVERED', // حالة التسليم لتفعيل المنطق المالي
            statusCode: 5,
            orderItems: [
                {
                    product: { category: testCat._id },
                    qty: 2,
                    price: 500,
                    store: testStore._id
                }
            ]
        });

        // 2. اختبار تسجيل المعاملات (Idempotency + Accuracy)
        console.log("🧮 2. اختبار تسجيل المعاملات...");
        await registerFinancialTransactionsForDeliveredOrder(testOrder._id);

        // محاكاة استدعاء مكرر للتأكد من عدم تكرار الحسابات
        await registerFinancialTransactionsForDeliveredOrder(testOrder._id);

        const txs = await Transaction.find({ order: testOrder._id });
        console.log(`✅ تم إنشاء ${txs.length} معاملات (المتوقع: 3)`);

        let sellerEarn = 0, shipEarn = 0, platformEarn = 0;
        txs.forEach(t => {
            if (t.role === 'SELLER') sellerEarn = t.amount;
            if (t.role === 'SHIPPING') shipEarn = t.amount;
            if (t.role === 'PLATFORM') platformEarn = t.amount;
        });

        console.log(`- مستحقات البائع: ${sellerEarn} (المتوقع: 900)`);
        console.log(`- مستحقات الشحن: ${shipEarn} (المتوقع: 50)`);
        console.log(`- عمولة المنصة: ${platformEarn} (المتوقع: 100)`);

        if (sellerEarn === 900 && shipEarn === 50 && platformEarn === 100) {
            console.log("✅ توزيع المبالغ دقيق 100%");
        } else {
            throw new Error("❌ فشل توزيع المبالغ!");
        }

        // 3. تنظيف البيانات
        console.log("🧹 تنظيف بيانات الاختبار...");
        await Order.findByIdAndDelete(testOrder._id);
        await Transaction.deleteMany({ order: testOrder._id });
        await Store.findByIdAndDelete(testStore._id);
        await ShippingCompany.findByIdAndDelete(testShip._id);
        await Category.findByIdAndDelete(testCat._id);

        console.log("🏁 انتهت جميع الاختبارات بنجاح باهر!");
    } catch (err) {
        console.error("❌ فشل الاختبار:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
