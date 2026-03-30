
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Category from '../models/Category.js';
import SystemSettings from '../models/SystemSettings.js';
import { getProductRecommendations } from '../controllers/productController.js';
import { invalidateCache, getOrSetCache } from '../utils/recommendationCache.js';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/talabia';

async function runPrecisionAudit() {
    console.log('🏁 Starting Precision Audit (v3) - High Fidelity Evidence...');

    try {
        await mongoose.connect(MONGO_URI);
        const testProduct = await Product.findOne({ isActive: true });
        if (!testProduct) throw new Error('No product found');

        // 🎯 1. Instrumenting DB Calls (Global Counter)
        let mongoCallCount = 0;
        const originalFind = mongoose.Model.find;
        mongoose.Model.find = function () {
            mongoCallCount++;
            return originalFind.apply(this, arguments);
        };
        const originalFindById = mongoose.Model.findById;
        mongoose.Model.findById = function () {
            mongoCallCount++;
            return originalFindById.apply(this, arguments);
        };

        // 🧩 2. MongoDB Explain Plan
        console.log('\n--- MongoDB Execution Stats (Explain Plan) ---');
        const explainResult = await Product.find({
            isActive: true,
            adminLocked: false,
            category: testProduct.category
        }).limit(12).explain('executionStats');

        console.log('Execution Time (ms):', explainResult.executionStats.executionTimeMillis);
        console.log('Docs Examined:', explainResult.executionStats.totalDocsExamined);
        console.log('Index Used:', explainResult.queryPlanner.winningPlan.inputStage?.indexName || 'COLLSCAN (Warning)');

        // 📊 3. Latency Distribution (1000 requests for statistical significance)
        console.log('\n--- Latency Distribution (1000 Samples) ---');
        invalidateCache('all');
        const samples = [];

        for (let i = 0; i < 1000; i++) {
            const start = performance.now();
            const mockRes = { status: function () { return this; }, json: () => { } };
            await getProductRecommendations({ params: { id: testProduct._id.toString() }, headers: {} }, mockRes);
            samples.push(performance.now() - start);
        }

        const sorted = [...samples].sort((a, b) => a - b);
        const coldStart = samples[0];
        const steadySamples = samples.slice(1);
        const steadyAvg = steadySamples.reduce((a, b) => a + b, 0) / steadySamples.length;
        const totalAvg = samples.reduce((a, b) => a + b, 0) / samples.length;

        // Percentiles
        const p50 = sorted[Math.floor(sorted.length * 0.50)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        const p999 = sorted[Math.floor(sorted.length * 0.999)]; // Should be the cold start if it's the only outlier

        console.log(`Cold Start: ${coldStart.toFixed(4)}ms`);
        console.log(`Steady State Avg: ${steadyAvg.toFixed(4)}ms`);
        console.log(`Global Avg: ${totalAvg.toFixed(4)}ms`);
        console.log(`P95: ${p95.toFixed(4)}ms`);
        console.log(`P99: ${p99.toFixed(4)}ms`);
        console.log(`P99.9: ${p999.toFixed(4)}ms`);

        // 🚀 4. Concurrency Heavy Load (500 concurrent)
        console.log('\n--- Concurrency Audit (500 Simultaneous) ---');
        invalidateCache(testProduct._id.toString());
        mongoCallCount = 0; // Reset counter

        const startConcurrency = Date.now();
        await Promise.all(Array.from({ length: 500 }).map(() => {
            const mockRes = { status: function () { return this; }, json: () => { } };
            return getProductRecommendations({ params: { id: testProduct._id.toString() }, headers: {} }, mockRes);
        }));
        const totalConcurrentTime = Date.now() - startConcurrency;

        console.log(`Concurrent Requests handled: 500`);
        console.log(`Total Time: ${totalConcurrentTime}ms`);
        console.log(`Total MongoDB Calls Observed: ${mongoCallCount}`);
        // Note: Real controller calls findById + find trending + find seller. 
        // With Single-flight, it should be Exactly (1 fetcher execution) which contains X calls.
        // If it's > X * 1, then Single-flight failed.

        // 💻 5. CPU & Memory Snapshot
        const mem = process.memoryUsage();
        console.log(`Memory RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`CPU Cores: ${os.cpus().length}`);

        // Cleanup
        mongoose.Model.find = originalFind;
        mongoose.Model.findById = originalFindById;

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runPrecisionAudit();
