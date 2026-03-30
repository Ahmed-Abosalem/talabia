// ────────────────────────────────────────────────
// 📁 backend/scripts/seed-products.js
// سكربت توليد 10,000 منتج لاختبار الأداء
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import { processText } from "../utils/textProcessor.js";

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

const TERMS = ["جوال", "لابتوب", "شاحن", "سماعة", "كفر", "شاشة", "ماوس", "كيبورد", "طابعة", "تابلت"];
const BRANDS = ["سامسونج", "أبل", "هواوي", "شاومي", "سوني", "إل جي", "ديل", "اتش بي", "لينوفو", "أسوس"];
const ADJECTIVES = ["برو", "ماكس", "الترا", "بلس", "لايت", "اير", "ميني", "جيمنج", "احترافي", "أصلي"];

const generateProduct = (i) => {
    const term = TERMS[Math.floor(Math.random() * TERMS.length)];
    const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];

    const name = `${term} ${brand} ${adj} ${i}`;
    const description = `هذا هو وصف للمنتج ${name} يحتوي على تفاصيل ومواصفات عالية الجودة ومميزة جداً.`;

    const { normalized } = processText(`${name} ${brand} ${description}`);

    return {
        name,
        description,
        price: Math.floor(Math.random() * 1000) + 50,
        stock: Math.floor(Math.random() * 100),
        brand,
        category: new mongoose.Types.ObjectId(), // Fake ID
        store: new mongoose.Types.ObjectId(), // Fake ID
        seller: new mongoose.Types.ObjectId(), // Fake Seller ID (REQUIRED)
        search_text: normalized,
        isActive: true,
        status: "active",
        adminLocked: false
    };
};

const seedData = async () => {
    await connectDB();

    console.log("⏳ Generating 10,000 products...");
    const BATCH_SIZE = 1000;
    const TOTAL = 10000;

    for (let i = 0; i < TOTAL; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
            batch.push(generateProduct(i + j));
        }
        await Product.insertMany(batch);
        console.log(`   Processed ${i + BATCH_SIZE} / ${TOTAL}`);
    }

    console.log("✅ Seeding Completed!");
    process.exit(0);
};

seedData();
