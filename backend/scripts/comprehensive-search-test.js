
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { searchProducts, reloadSynonyms } from "../services/searchService.js";
import Product from "../models/Product.js";
import Synonym from "../models/Synonym.js";
import Category from "../models/Category.js"; // Required for schema registration

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function log(msg, type = "INFO") {
    console.log(`[${new Date().toISOString()}] [${type}] ${msg}`);
}

async function runComprehensiveTests() {
    log("🚀 Starting Comprehensive Search & System Test...", "START");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log("✅ Connected to MongoDB");

        // 1. SETUP: Ensure specific test data exists
        log("🛠️  Setting up Test Data...");

        // Cleanup old test data
        await Product.deleteMany({ name: /^TEST_PROD_/ });
        await Synonym.deleteMany({ term: "TEST_PHONE" });


        // Add Test Store (REQUIRED for search pipeline lookup)
        // We need a store schema or just direct collection insertion if we don't want to import Store model
        // To be safe, let's use the native mongoose connection to insert into 'stores'
        const storeId = new mongoose.Types.ObjectId();
        await mongoose.connection.collection("stores").insertOne({
            _id: storeId,
            name: "TEST_STORE",
            slug: `test-store-${Date.now()}`,
            status: "approved",
            visibility: "visible"
        });
        log("🏪 Created Test Store (Active)");

        // Add Test Product
        const testProduct = await Product.create({
            name: "TEST_PROD_Samsung Galaxy S24 Ultra",
            description: "The ultimate smartphone experience with AI.",
            price: 1000,
            stock: 10,
            category: "electronics", // Simplified for test
            store: storeId,
            seller: new mongoose.Types.ObjectId(), // Dummy ID
            images: [{ url: "http://example.com/img.jpg" }],
            isActive: true,
            status: "active"
        });

        log(`📦 Created Test Product: ${testProduct.name}`);

        // DEBUG: Verify search_text
        const debugProd = await Product.findById(testProduct._id).select("+search_text");
        log(`   🔎 Populated search_text: "${debugProd.search_text}"`);

        // DEBUG: Verify Store
        const debugStore = await mongoose.connection.collection("stores").findOne({ _id: storeId });
        log(`   🏪 Store verified in DB: ${debugStore ? "YES" : "NO"} (Status: ${debugStore?.status})`);

        // Add Test Synonym
        await Synonym.create({
            term: "TEST_PHONE",
            synonyms: ["smartphone", "mobile", "جوال"],
            isActive: true
        });
        log("🔄 Created Test Synonym Group: TEST_PHONE <-> smartphone, mobile, جوال");

        // Force Cache Reload
        await reloadSynonyms();

        // 2. SEARCH SCENARIOS
        const testScenarios = [
            {
                name: "Partial Match (Suffix)",
                query: "S24",
                expectId: testProduct._id
            },
            {
                name: "Partial Match (Prefix)",
                query: "Sams",
                expectId: testProduct._id
            },
            {
                name: "Synonym Match (Arabic)",
                query: "جوال",
                expectId: testProduct._id // Should match 'smartphone' in description via synonym 'jawal' -> 'smartphone'? 
                // Wait, description has 'smartphone'. Synonym is 'TEST_PHONE' <-> 'smartphone'.
                // If I search 'جوال', it should map to 'smartphone' and find the product.
            },
            {
                name: "Out-of-Order Match",
                query: "Ultra Galaxy Samsung",
                expectId: testProduct._id
            },
            {
                name: "Typo / Normalization (Case)",
                query: "sAmSuNg",
                expectId: testProduct._id
            }
        ];

        const results = [];

        log("\n🔎 Executing Search Scenarios...");
        for (const scenario of testScenarios) {
            const start = performance.now();
            const products = await searchProducts({ query: scenario.query, limit: 10 });
            const duration = performance.now() - start;

            const found = products.some(p => p._id.toString() === scenario.expectId.toString());
            const status = found ? "PASS" : "FAIL";

            log(`   🔹 [${scenario.name}] Query: "${scenario.query}" -> ${status} (${duration.toFixed(2)}ms)`);

            results.push({
                scenario: scenario.name,
                query: scenario.query,
                status,
                duration: `${duration.toFixed(2)}ms`,
                resultCount: products.length
            });
        }

        // 3. SYNONYM MANAGEMENT (CRUD Simulation)
        log("\n🔄 Testing Synonym CRUD Operations...");

        // Add new synonym via Model (simulating API)
        const newSyn = await Synonym.create({ term: "TEST_LAPTOP", synonyms: ["notebook"] });
        log("   ✅ Created 'TEST_LAPTOP'");

        // Verify it's NOT in cache yet (strictly speaking, purely service-side logic might auto-reload if hooked, but here we expect explicit reload call in controller)
        // usage of direct Model create doesn't trigger reload. we must call reloadSynonyms logic.
        // In real app, Controller calls reloadSynonyms.

        const startReload = performance.now();
        await reloadSynonyms(); // Simulate Controller call
        const reloadDuration = performance.now() - startReload;
        log(`   ✅ Cache Reloaded in ${reloadDuration.toFixed(2)}ms`);

        // Test search with new synonym
        // Create dummy product for laptop
        const laptopProd = await Product.create({
            name: "TEST_PROD_MacBook Pro",
            description: "Powerful notebook",
            price: 2000,
            stock: 5,
            category: "electronics",
            store: storeId,
            seller: new mongoose.Types.ObjectId(),
            images: [],
            isActive: true
        });

        // Search for "TEST_LAPTOP" should find "notebook" product
        const laptopSearch = await searchProducts({ query: "TEST_LAPTOP" });
        const laptopFound = laptopSearch.some(p => p._id.toString() === laptopProd._id.toString());
        log(`   🔹 Search via new synonym ("TEST_LAPTOP" -> "notebook"): ${laptopFound ? "PASS" : "FAIL"}`);

        // 4. CLEANUP
        log("\n🧹 Cleaning up Test Data...");
        await Product.deleteMany({ name: /^TEST_PROD_/ });
        await Synonym.deleteMany({ term: "TEST_PHONE" });
        await Synonym.deleteMany({ term: "TEST_LAPTOP" });
        await mongoose.connection.collection("stores").deleteOne({ _id: storeId });

        // 5. FINAL REPORT DUMP
        console.log("\n--- JSON REPORT ---");
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            scenarios: results,
            synonymCRUD: {
                create: "PASS",
                cacheReload: "PASS",
                searchVerification: laptopFound ? "PASS" : "FAIL"
            },
            performance: {
                avgSearchTime: (results.reduce((a, b) => a + parseFloat(b.duration), 0) / results.length).toFixed(2) + "ms"
            }
        }, null, 2));

        process.exit(0);
    } catch (e) {
        log(`❌ FATAL ERROR: ${e.message}`, "error");
        console.error(e);
        process.exit(1);
    }
}

runComprehensiveTests();
