// ────────────────────────────────────────────────
// 📁 backend/ensure_all_category.js
// سكربت ضمان وجود وضبط قسم "الكل" (System Category Health Check)
// ────────────────────────────────────────────────

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// استيراد الموديل
import Category from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل الإعدادات
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected successfully.");

        // البحث عن أي قسم يحمل اسم "الكل" أو المعرف "all"
        let allCategory = await Category.findOne({ 
            $or: [{ slug: 'all' }, { name: 'الكل' }] 
        });

        if (!allCategory) {
            console.log("✨ 'All' category not found. Creating it...");
            allCategory = await Category.create({
                name: "الكل",
                slug: "all",
                isActive: true,
                isProtected: true,
                sortOrder: -999,
                description: "عرض جميع المنتجات",
                image: "/assets/categories/all.jpg"
            });
            console.log("✅ Created 'All' category.");
        } else {
            console.log("🛠️ Existing 'All' category found. Updating to protected standard...");
            allCategory.slug = 'all';
            allCategory.name = 'الكل';
            allCategory.isActive = true;
            allCategory.isProtected = true;
            allCategory.sortOrder = -999;
            await allCategory.save();
            console.log("✅ Standardized 'All' category.");
        }

        console.log("✨ Database is now healthy for the 'All' category.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Health Check Failed:", error);
        process.exit(1);
    }
}

run();
