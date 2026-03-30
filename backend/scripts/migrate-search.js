// ────────────────────────────────────────────────
// 📁 backend/scripts/migrate-search.js
// سكربت لتهيئة حقول البحث (search_text) للمنتجات الموجودة مسبقاً
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import { processText } from "../utils/textProcessor.js";

// إعداد البيئة
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

const migrateSearchFields = async () => {
    await connectDB();

    try {
        console.log("⏳ Starting migration...");

        // جلب كل المنتجات
        const products = await Product.find({});
        console.log(`📊 Found ${products.length} products to process.`);

        let updatedCount = 0;

        for (const product of products) {
            // تجميع النص كما في الـ pre-save hook
            const rawTextParts = [
                product.name,
                product.brand,
                product.description,
                product.unitLabel
            ].filter(Boolean);

            const fullText = rawTextParts.join(' ');
            const { normalized } = processText(fullText);

            // تحديث الحقل فقط
            product.search_text = normalized;

            // حفظ بدون تفعيل الـ validation الكاملة لتسريع العملية، 
            // لكن الـ pre-save hook سيعمل أيضاً. 
            // هنا سنستخدم updateOne مباشرة لتجنب تشغيل الـ hook مرتين وللسرعة
            await Product.updateOne(
                { _id: product._id },
                {
                    $set: { search_text: normalized }
                }
            );

            updatedCount++;
            if (updatedCount % 100 === 0) {
                console.log(`🔄 Processed ${updatedCount} products...`);
            }
        }

        console.log(`✅ Migration completed! Updated ${updatedCount} products.`);

        // إعادة بناء الفهارس لضمان الفاعلية
        console.log("⏳ Rebuilding indexes...");
        await Product.syncIndexes();
        console.log("✅ Indexes rebuilt successfully.");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

migrateSearchFields();
