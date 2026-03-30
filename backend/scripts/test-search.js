// ────────────────────────────────────────────────
// 📁 backend/scripts/test-search.js
// سكربت اختبار داخلي للتحقق من جودة البحث
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { searchProducts } from "../services/searchService.js";
import Synonym from "../models/Synonym.js";
import Category from "../models/Category.js"; // ✅ Import Category to register schema
import Product from "../models/Product.js";

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

const runTests = async () => {
    await connectDB();

    console.log("\n🧪 Starting Search System Verification...\n");

    // 1. Get a real product to test with
    const sampleProduct = await Product.findOne({ isActive: true });

    if (!sampleProduct) {
        console.error("❌ No active products found in DB to test with. Please add products first.");
        process.exit(1);
    }

    console.log(`📦 Found Sample Product: [${sampleProduct.name}]`);

    // Prepare dynamic queries based on real data
    const nameParts = sampleProduct.name.split(" ");
    const firstWord = nameParts[0];
    const twoWords = nameParts.slice(0, 2).join(" ");

    // 2. Add Test Synonym
    // Let's assume the first word might have a synonym. 
    // For demonstration, we'll just add a generic one if not exists.
    const synonymTerm = "تجربة";
    const synonymTarget = "اختبار";

    // Add a specific synonym for the sample product if possible
    // e.g. if product is "Samsung S24", we add "Galaxy" -> "Samsung"
    let testSynonymQuery = "موبايل"; // Default

    // 3. Test Cases
    const testCases = [
        { name: "Exact Match (2 words)", query: twoWords },
        { name: "Partial Match (1 word)", query: firstWord },
        // Out of order: Reverse the first two words
        { name: "Out of Order", query: nameParts.slice(0, 2).reverse().join(" ") },
        { name: "Synonym Search (Generic)", query: testSynonymQuery },
    ];

    // Typo test: change first letter of first word if possible
    if (firstWord.length > 1) {
        // Very naive typo: just repeat first char or something
        // Better: if starts with 'ا' make it 'أ'
        let typoQuery = firstWord;
        if (firstWord.startsWith("ا")) typoQuery = "أ" + firstWord.substring(1);
        else if (firstWord.startsWith("أ")) typoQuery = "ا" + firstWord.substring(1);

        if (typoQuery !== firstWord) {
            testCases.push({ name: "Typo / Normalization", query: typoQuery });
        }
    }

    for (const test of testCases) {
        if (!test.query || test.query.trim().length === 0) continue;

        console.log(`\n🔎 Testing: [${test.name}] Query: "${test.query}"`);
        const start = Date.now();

        try {
            const results = await searchProducts({ query: test.query, limit: 5 });
            const duration = Date.now() - start;

            console.log(`   ⏱️ Time: ${duration}ms | Found: ${results.length}`);

            if (results.length > 0) {
                results.forEach((p, idx) => {
                    console.log(`   ${idx + 1}. [${p.name}] (Score: ${p.finalRelevance?.toFixed(2) || "N/A"})`);
                });
            } else {
                console.warn("   ⚠️ No results found.");
            }
        } catch (e) {
            console.error("   ❌ Error:", e.message);
        }
    }

    console.log("\n✅ Verification Completed.");
    process.exit(0);
};

runTests();
