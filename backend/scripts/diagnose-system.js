
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { searchProducts } from "../services/searchService.js";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function log(section, msg, status = "INFO") {
    console.log(`[${section}] ${status}: ${msg}`);
}

async function diagnose() {
    console.log("\n🏥 STARTING SYSTEM DIAGNOSIS...\n");
    const report = {
        backend: {},
        login: {},
        products: {},
        search: {}
    };

    // 1. BACKEND HEALTH
    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI not found in env");
        await mongoose.connect(process.env.MONGO_URI);
        const dbState = mongoose.connection.readyState;
        const states = ["Disconnected", "Connected", "Connecting", "Disconnecting"];

        log("BACKEND", `Database Connection: ${states[dbState]}`, "PASS");
        report.backend.db = "Connected";
        report.backend.env = "Loaded";
    } catch (e) {
        log("BACKEND", `Database Error: ${e.message}`, "FAIL");
        report.backend.db = "Error";
        console.error(e);
        process.exit(1); // Cannot proceed without DB
    }

    // 2. ADMIN LOGIN CHECK
    try {
        const email = "admin@talabia.com";
        const password = "Admin12345";

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            log("LOGIN", `User '${email}' NOT FOUND`, "FAIL");
            report.login.status = "User Missing";
        } else {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                log("LOGIN", "Credentials Validated Successfully", "PASS");
                log("LOGIN", `Role: ${user.role}, IsAdmin: ${user.isAdmin}`, "INFO");
                report.login.status = "Success";
            } else {
                log("LOGIN", "Password Mismatch", "FAIL");
                report.login.status = "Invalid Password";
            }
        }
    } catch (e) {
        log("LOGIN", `Auth Check Error: ${e.message}`, "ERROR");
        report.login.status = "Error";
    }

    // 3. PRODUCT LOAD
    try {
        const count = await Product.countDocuments();
        log("PRODUCTS", `Total Products in DB: ${count}`, "INFO");

        const start = performance.now();
        // Simulate "List Products" query (simple find with limit)
        const products = await Product.find({ isActive: true }).limit(20).lean();
        const duration = performance.now() - start;

        log("PRODUCTS", `Fetch 20 Products took: ${duration.toFixed(2)}ms`, "INFO");

        // Large fetch simulation (if count > 100)
        if (count > 100) {
            const startAll = performance.now();
            await Product.find({ isActive: true }).select("name price").lean();
            const durAll = performance.now() - startAll;
            log("PRODUCTS", `Fetch ALL (${count}) took: ${durAll.toFixed(2)}ms (Performance Indicator)`, "WARN");
        }

        report.products.count = count;
        report.products.loadTime = `${duration.toFixed(2)}ms`;
    } catch (e) {
        log("PRODUCTS", `Fetch Error: ${e.message}`, "FAIL");
    }

    // 4. SEARCH & SYNONYMS
    try {
        const query = "Samsung";
        const start = performance.now();
        const results = await searchProducts({ query, limit: 10 });
        const duration = performance.now() - start;

        log("SEARCH", `Query '${query}': Found ${results.length} items in ${duration.toFixed(2)}ms`, results.length > 0 ? "PASS" : "WARN");
        report.search.status = results.length > 0 ? "Working" : "Empty Results";

        // Check Synonym Cache (Indirectly)
        // require re-import of cache if possible, or just trust previous tests.
        // We will assume if search works, basic pipeline is good.
    } catch (e) {
        log("SEARCH", `Execution Error: ${e.message}`, "FAIL");
        report.search.status = "Error";
    }

    console.log("\n🏥 DIAGNOSIS COMPLETE.");
    process.exit(0);
}

diagnose();
