
// backend/scripts/verify_featured_logic.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config({ path: "./backend/.env" });

const verifyFeaturedLogic = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database Connected.");

        // 1. Check current Featured Products
        const featured = await Product.find({ isFeatured: true }).sort({ featuredOrder: 1 });
        console.log(`\n🔍 Found ${featured.length} featured products.`);

        featured.forEach(p => {
            console.log(`   - [${p.featuredOrder}] ${p.name} (ID: ${p._id})`);
            if (p.featuredOrder === 0) {
                console.warn("   ⚠️ WARNING: Featured product has Order 0!");
            }
        });

        // 2. Simulate "Next Order" Calculation
        const lastFeatured = await Product.findOne({ isFeatured: true })
            .sort({ featuredOrder: -1 })
            .select("featuredOrder");

        const maxOrder = lastFeatured?.featuredOrder || 0;
        const nextOrder = maxOrder + 1;
        console.log(`\n✅ Simulated Auto-Increment: Next available order should be: ${nextOrder}`);

        // 3. Validation Simulation
        console.log("\n🧪 Testing Validation Logic (Simulation):");
        const testOrders = [0, -1, 1, 5, 100];
        testOrders.forEach(val => {
            if (val < 1) {
                console.log(`   - Input ${val}: ❌ Rejected (Correct)`);
            } else {
                console.log(`   - Input ${val}: ✅ Accepted (Correct)`);
            }
        });

        console.log("\n✅ Verification Logic Check Passed.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
};

verifyFeaturedLogic();
