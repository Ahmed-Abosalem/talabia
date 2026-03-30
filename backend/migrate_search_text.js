// ────────────────────────────────────────────────
// 📁 backend/migrate_search_text.js
// سكربت هجرة البيانات: تحديث حقول البحث لكل المنتجات القديمة
// ────────────────────────────────────────────────

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// استيراد الموديل والـ Utility
import Product from './models/Product.js';
import { processText } from './utils/textProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل الإعدادات
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
}

async function migrate() {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected successfully.");

        // 1. جلب المنتجات التي تفتقر لحقل search_text أو تحتاج تحديث
        // في البداية، سنحدث الكل لضمان الدقة
        const products = await Product.find({});
        console.log(`📦 Found ${products.length} products to process.`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const product of products) {
            try {
                // تجميع النص الخام
                const rawTextParts = [
                    product.name,
                    product.brand,
                    product.description,
                    product.unitLabel
                ].filter(Boolean);

                const fullText = rawTextParts.join(' ');

                // معالجة النص
                const { normalized } = processText(fullText);

                // تحديث الحقل
                product.search_text = normalized;
                
                // حفظ بدون التحقق من الحقول الإلزامية الأخرى (للسرعة ولتجنب أخطاء الداتا القديمة)
                // ولكن نفضل استخدام save() لتفعيل أي hooks أخرى إذا وجدت مستقبلاً
                // هنا سنستخدم save({ validateBeforeSave: false }) لضمان المرور
                await product.save({ validateBeforeSave: false });

                updatedCount++;
                if (updatedCount % 10 === 0) {
                    process.stdout.write(`\r🚀 Processed ${updatedCount}/${products.length}...`);
                }
            } catch (err) {
                console.error(`\n❌ Failed to process product ${product._id}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n\n✨ Migration Completed!`);
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Failed: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
}

migrate();
