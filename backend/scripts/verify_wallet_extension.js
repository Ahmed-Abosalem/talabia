// backend/scripts/verify_wallet_extension.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Wallet from "../models/Wallet.js";

dotenv.config({ path: "./.env" });

async function verifyWalletExtension() {
    console.log("🚀 Starting Comprehensive Wallet Extension Audit...");

    try {
        // 1. Check Backend Logic Neutrality
        console.log("\n--- [Audit 1: Backend Logic Neutrality] ---");
        const controllerPath = path.resolve("controllers/walletController.js");
        const controllerContent = fs.readFileSync(controllerPath, "utf8");
        const buyerCount = (controllerContent.match(/مشتري/g) || []).length;
        const userCount = (controllerContent.match(/مستخدم/g) || []).length;

        console.log(`- Words 'مشتري' (buyer) found: ${buyerCount}`);
        console.log(`- Words 'مستخدم' (user) found: ${userCount}`);

        if (buyerCount > 5) {
            console.warn("⚠️ Warning: Higher than expected buyer-specific terms found in controller.");
        } else {
            console.log("✅ Backend controller seems well-generalized.");
        }

        // 2. Check Route Permissions
        console.log("\n--- [Audit 2: Route Permissions] ---");
        const routesPath = path.resolve("routes/walletRoutes.js");
        const routesContent = fs.readFileSync(routesPath, "utf8");
        if (routesContent.includes('allowRoles("buyer", "seller")')) {
            console.log("✅ Route permissions correctly include 'seller'.");
        } else {
            console.error("❌ ERROR: Route permissions do NOT include 'seller'!");
        }

        // 3. Check Frontend Dashboard Integration
        console.log("\n--- [Audit 3: Frontend Dashboard Integration] ---");
        const dashboardPath = path.resolve("../frontend/src/pages/Seller/SellerDashboard.jsx");
        const dashboardContent = fs.readFileSync(dashboardPath, "utf8");
        if (dashboardContent.includes('"wallet"') && dashboardContent.includes("<Wallet")) {
            console.log("✅ Seller Dashboard correctly includes Wallet tab and icon.");
        } else {
            console.error("❌ ERROR: Seller Dashboard missing Wallet integration!");
        }

        // 4. Check Database Schema Validation
        console.log("\n--- [Audit 4: DB Schema Validation] ---");
        const modelPath = path.resolve("models/Wallet.js");
        const modelContent = fs.readFileSync(modelPath, "utf8");
        if (modelContent.includes('"المستخدم مطلوب"')) {
            console.log("✅ Database validation messages are role-neutral.");
        } else {
            console.warn("⚠️ Warning: Database validation messages might still be role-specific.");
        }

        // 5. Check Admin Notifications Role-Awareness
        console.log("\n--- [Audit 5: Admin Notification Links] ---");
        const adminCtrlPath = path.resolve("controllers/admin/adminWalletController.js");
        const adminCtrlContent = fs.readFileSync(adminCtrlPath, "utf8");
        if (adminCtrlContent.includes("dashboardPath") && adminCtrlContent.includes("/wallet`")) {
            console.log("✅ Admin notifications are successfully role-aware (dynamic links).");
        } else {
            console.error("❌ ERROR: Admin notification links are static or buyer-only!");
        }

        console.log("\n--- Audit Conclusion ---");
        console.log("Audit complete. Please review any warnings/errors above.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Audit failed due to error:", err);
        process.exit(1);
    }
}

verifyWalletExtension();
