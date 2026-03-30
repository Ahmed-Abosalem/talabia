// ────────────────────────────────────────────────
// 📁 backend/scripts/audit-search.js
// سكربت التدقيق الشامل (Full Audit)
// 1. يقيس الأداء مع Explain Plans
// 2. يتحقق من سيناريوهات الجودة
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { buildSearchPipeline } from "../services/searchService.js";
import Product from "../models/Product.js";
import Synonym from "../models/Synonym.js";

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

const runAudit = async () => {
    await connectDB();

    console.log("\n🔍 STARTING COMPREHENSIVE SEARCH AUDIT\n");

    // 1. Performance Audit
    console.log("📊 [PART 1] PERFORMANCE AUDIT (Avg of 5 runs)");
    console.log("---------------------------------------------");

    const testQueries = ["جوال", "sam", "ايفون 13 برو", "شاحن اصلي"];

    for (const q of testQueries) {
        let totalTime = 0;

        // Warmup
        await Product.aggregate(await buildSearchPipeline({ query: q, limit: 1 }));

        for (let i = 0; i < 5; i++) {
            const start = performance.now();
            const pipeline = await buildSearchPipeline({ query: q, limit: 20 });
            await Product.aggregate(pipeline);
            const end = performance.now();
            totalTime += (end - start);
        }

        console.log(`Query: "${q}" | Avg Latency: ${(totalTime / 5).toFixed(2)}ms`);
    }

    // 2. Execution Plan Check
    console.log("\n🛠️ [PART 2] EXECUTION PLAN ANALYSIS");
    console.log("---------------------------------------------");

    try {
        const explainPipeline = await buildSearchPipeline({ query: "جوال", limit: 1 });

        // Explain Command
        const explanation = await Product.aggregate(explainPipeline).explain("executionStats");

        // Safe Extract
        let stats = explanation.stages ? explanation.stages[0].$cursor.executionStats : explanation.executionStats;
        let planner = explanation.stages ? explanation.stages[0].$cursor.queryPlanner : explanation.queryPlanner;

        if (!stats) {
            console.log("⚠️ Could not extract execution stats. Raw output keys:", Object.keys(explanation));
        } else {
            console.log(`Total Docs Examined: ${stats.totalDocsExamined}`);
            console.log(`nReturned: ${stats.nReturned}`);
            console.log(`Execution Time: ${stats.executionTimeMillis}ms`);

            const stage = planner?.winningPlan?.stage || planner?.winningPlan?.inputStage?.stage || "UNKNOWN";
            const indexName = planner?.winningPlan?.indexName || planner?.winningPlan?.inputStage?.indexName || "UNKNOWN";

            console.log(`Winning Plan Stage: ${stage}`);
            console.log(`Index Used: ${indexName}`);

            if (stage.includes("vScan") || stage === "COLLSCAN") {
                console.error("❌ CRTICAL WARNING: Collection Scan detected!");
            } else {
                console.log("✅ Efficiency Check: Index used successfully.");
            }
        }
    } catch (e) {
        console.error("❌ Explain Error:", e.message);
    }

    // 3. Quality Check
    console.log("\n✨ [PART 3] QUALITY SCENARIOS");
    console.log("---------------------------------------------");

    const scenarios = [
        { name: "Normalization (أ/ا)", query: "أيفون" },
        { name: "Synonyms (New)", query: "موبايل" },
        { name: "Out of Order", query: "13 ايفون" },
        { name: "Zero Result", query: "خزعبلات_غير_موجودة_123" }
    ];

    for (const s of scenarios) {
        const p = await buildSearchPipeline({ query: s.query, limit: 3 });
        const results = await Product.aggregate(p);
        console.log(`[${s.name}] Query: "${s.query}" -> Found: ${results.length}`);
        if (results.length > 0) {
            console.log(`   Top Result: ${results[0].name}`);
        }
    }

    process.exit(0);
};

runAudit();
