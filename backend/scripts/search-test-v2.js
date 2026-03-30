
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { searchProducts, reloadSynonyms } from "../services/searchService.js";
import Product from "../models/Product.js";
import Synonym from "../models/Synonym.js";
import Category from "../models/Category.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function log(msg, type = "INFO") {
    console.log(`[${type}] ${msg}`);
}

async function runTestV2() {
    log("🚀 Starting Search Test V2...", "START");
    let storeId;
    let prodId;

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log("✅ Connected to MongoDB");
    } catch (e) { log(`Failed to connect: ${e.message}`, "ERROR"); process.exit(1); }

    try {
        // SETUP STORE
        log("1. Creating Store...");
        storeId = new mongoose.Types.ObjectId();
        await mongoose.connection.collection("stores").insertOne({
            _id: storeId,
            name: "TEST_STORE_V2",
            slug: `test-store-v2-${Date.now()}`,
            status: "approved",
            visibility: "visible"
        });
        log("   ✅ Store Created");
    } catch (e) { log(`Store setup failed: ${e.message}`, "ERROR"); process.exit(1); }

    try {
        // SETUP CATEGORY (Fix populate CastError)
        log("1.5 Creating Category...");
        const catId = new mongoose.Types.ObjectId();
        // Insert directly to avoid schema validation issues if Category model has required fields
        await mongoose.connection.collection("categories").insertOne({
            _id: catId,
            name: "Electronics",
            slug: "electronics-test",
            image: "img.jpg",
            isActive: true
        });
        log("   ✅ Category Created");

        // SETUP PRODUCT
        log("2. Creating Product...");
        const prod = await Product.create({
            name: "TEST_PROD_Samsung Galaxy S24 Ultra",
            description: "The ultimate smartphone experience with AI.",
            price: 1000,
            stock: 10,
            category: catId.toString(), // Use valid ObjectId string
            store: storeId,
            seller: new mongoose.Types.ObjectId(),
            images: [{ url: "http://example.com/img.jpg" }],
            isActive: true,
            status: "active"
        });
        prodId = prod._id;
        log(`   ✅ Product Created: ${prod._id}`);

        // Ensure Text Index for Search
        await Product.ensureIndexes();
        log("   ✅ Indexes Ensured");


        // Check search_text
        const debugProd = await Product.findById(prod._id).select("+search_text");
        log(`   🔎 search_text: "${debugProd.search_text}"`);
    } catch (e) { log(`Product setup failed: ${e.message}`, "ERROR"); process.exit(1); }

    try {
        // SETUP SYNONYM
        log("3. Creating Synonym...");
        await Synonym.create({
            term: "TEST_PHONE_V2",
            synonyms: ["smartphone", "mobile", "جوال"],
            isActive: true
        });
        log("   ✅ Synonym Created");

        log("4. Reloading Synonyms...");
        await reloadSynonyms();
        log("   ✅ Synonyms Reloaded");
    } catch (e) { log(`Synonym setup failed: ${e.message}`, "ERROR"); process.exit(1); }

    // SEARCH
    const scenarios = [
        { q: "S24", name: "Partial" },
        { q: "جوال", name: "Synonym" },
        { q: "Samsung", name: "Exact" }
    ];

    console.log("\n--- RESULTS ---");
    for (const s of scenarios) {
        try {
            const start = performance.now();
            const res = await searchProducts({ query: s.q, limit: 5 });
            const dur = performance.now() - start;
            const found = res.some(p => p._id.toString() === prodId.toString());
            console.log(`[${s.name}] "${s.q}" -> ${found ? "PASS" : "FAIL"} (${dur.toFixed(2)}ms, ${res.length} results)`);
        } catch (e) {
            console.log(`[${s.name}] ERROR: ${e.message}`);
        }
    }

    try {
        log("5. Cleaning Up...");
        await Product.deleteMany({ name: /^TEST_PROD_/ });
        log("   Cleaned Products");
        await Synonym.deleteMany({ term: "TEST_PHONE_V2" });
        log("   Cleaned Synonyms");
        if (storeId) await mongoose.connection.collection("stores").deleteOne({ _id: storeId });
        log("   Cleaned Store");
    } catch (e) {
        log(`Cleanup failed: ${e.message} \nStack: ${e.stack}`, "ERROR");
    }

    log("✅ Done.");
    process.exit(0);
}

runTestV2();
