// ────────────────────────────────────────────────
// 📁 backend/seed_privacy_policy.js
// سكربت تهيئة سياسة الخصوصية لضمان وجود السجل الأول
// ────────────────────────────────────────────────

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PrivacyPolicy from './models/PrivacyPolicy.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected successfully.");

        const existing = await PrivacyPolicy.findOne();
        
        if (existing) {
            console.log("ℹ️ Privacy Policy record already exists. No need to seed.");
            console.log("Current Content Preview:", existing.content.substring(0, 50) + "...");
        } else {
            console.log("🌱 Creating initial Privacy Policy record...");
            await PrivacyPolicy.create({
                content: "سياسة الخصوصية الافتراضية - يرجى تعديلها من لوحة التحكم.",
                lastUpdated: new Date(),
                version: 1
            });
            console.log("✅ Seeded successfully.");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed:", error);
        process.exit(1);
    }
}

seed();
