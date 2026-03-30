/**
 * 🌍 End-to-End Platform Lifecycle Test Script
 * -----------------------------------------
 * This script simulates the full operational cycle of the platform:
 * 1. Setup 3 Sellers, 3 Buyers, and Products.
 * 2. Process a Wallet Deposit for Buyer 3.
 * 3. Place 3 complex multi-seller orders with different methods (Card, Bank Transfer, Wallet).
 * 4. Process Bank Transfer approval and Wallet deduction.
 * 5. Mark all as Delivered and record transactions.
 * 6. Perform a Payout (Settlement) to Seller 1.
 * 7. Assert all final net balances and earnings.
 * 
 * Run with: node backend/scripts/test-platform-lifecycle.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Models
import User from '../models/User.js';
import Store from '../models/Store.js';
import ShippingCompany from '../models/ShippingCompany.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';

import { registerFinancialTransactionsForDeliveredOrder } from '../utils/financialTransactions.js';

async function runE2ETest() {
    try {
        console.log("🚀 Starting E2E Platform Lifecycle Test...");

        // 1. Connect to DB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found in .env");
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // 2. Setup Mock Parties (3 Sellers, 3 Buyers)
        console.log("👥 Setting up mock parties...");
        
        async function getMockUser(email, name, role = "buyer") {
            return await User.findOneAndUpdate(
                { email },
                { name, role, isVerified: true },
                { upsert: true, new: true }
            );
        }

        async function getMockStore(email, name, slug, ownerId) {
            return await Store.findOneAndUpdate(
                { email },
                { name, slug, status: "approved", owner: ownerId, description: `Store ${name}` },
                { upsert: true, new: true }
            );
        }

        const b1 = await getMockUser("b1@test.com", "Buyer One");
        const b2 = await getMockUser("b2@test.com", "Buyer Two");
        const b3 = await getMockUser("b3@test.com", "Buyer Three");

        const s1_owner = await getMockUser("s1_owner@test.com", "S1 Owner");
        const s2_owner = await getMockUser("s2_owner@test.com", "S2 Owner");
        const s3_owner = await getMockUser("s3_owner@test.com", "S3 Owner");

        const s1 = await getMockStore("s1@test.com", "Store One", "store-1-e2e", s1_owner._id);
        const s2 = await getMockStore("s2@test.com", "Store Two", "store-2-e2e", s2_owner._id);
        const s3 = await getMockStore("s3@test.com", "Store Three", "store-3-e2e", s3_owner._id);

        const shippingCo = await ShippingCompany.findOneAndUpdate(
            { email: "e2e-ship@test.com" },
            { name: "Global Shipping", status: "active" },
            { upsert: true, new: true }
        );

        // 3. Setup Categories (10%, 5%, 0%)
        console.log("🏷️ Setting up categories...");
        const cat10 = await Category.findOneAndUpdate({ name: "Cat-10-E2E" }, { commissionRate: 10, isActive: true }, { upsert: true, new: true });
        const cat5 = await Category.findOneAndUpdate({ name: "Cat-5-E2E" }, { commissionRate: 5, isActive: true }, { upsert: true, new: true });
        const cat0 = await Category.findOneAndUpdate({ name: "Cat-0-E2E" }, { commissionRate: 0, isActive: true }, { upsert: true, new: true });

        // 4. Setup Products
        console.log("📦 Setting up products...");
        async function getMockProd(name, storeId, sellerId, catId, price) {
            return await Product.findOneAndUpdate(
                { name },
                { store: storeId, seller: sellerId, category: catId, price, stock: 100, description: "E2E Test", images: [{ url: "p.jpg" }] },
                { upsert: true, new: true }
            );
        }

        const pA = await getMockProd("Prod-A-10", s1._id, s1_owner._id, cat10._id, 100);
        const pB = await getMockProd("Prod-B-5", s2._id, s2_owner._id, cat5._id, 200);
        const pC = await getMockProd("Prod-C-10", s2._id, s2_owner._id, cat10._id, 400);
        const pD = await getMockProd("Prod-D-0", s3._id, s3_owner._id, cat0._id, 100);
        const pE = await getMockProd("Prod-E-5", s3._id, s3_owner._id, cat5._id, 150);

        // 5. Wallet Deposit for B3 (1000 SAR)
        console.log("💳 Setting up Wallet for B3...");
        let wallet = await Wallet.findOne({ buyer: b3._id });
        if (!wallet) {
            wallet = await Wallet.create({
                buyer: b3._id,
                walletNumber: await Wallet.generateWalletNumber(),
                pin: "123456",
                status: "active",
                metadata: { fullName: "Buyer Three", docType: "هوية وطنية", docNumber: "123", whatsapp: "050" }
            });
        }
        
        // Deposit 1000
        const depositAmount = 1000;
        const balanceBefore = wallet.balance;
        wallet.balance += depositAmount;
        await wallet.save();

        await WalletTransaction.create({
            wallet: wallet._id,
            type: "deposit",
            direction: "credit",
            amount: depositAmount,
            balanceBefore,
            balanceAfter: wallet.balance,
            status: "completed",
            reference: WalletTransaction.generateReference(),
            note: "E2E Test Deposit"
        });
        console.log(`✅ B3 Wallet Deposit: 1000 SAR. New Balance: ${wallet.balance}`);

        // 6. Create 3 Orders
        console.log("🛒 Placing 3 orders...");

        async function createMockOrder(buyerId, sellerId, storeId, items, shipPrice, method, subMethod = null) {
            const totalProducts = items.reduce((sum, it) => sum + (it.price * it.qty), 0);
            return await Order.create({
                buyer: buyerId,
                seller: sellerId,
                store: storeId,
                shippingCompany: shippingCo._id,
                orderItems: items,
                totalPrice: totalProducts + shipPrice,
                shippingPrice: shipPrice,
                paymentMethod: method,
                paymentSubMethod: subMethod,
                status: "مكتمل", // For test simplicity
                statusCode: "DELIVERED",
                shippingAddress: { fullName: "Test", phone: "05", city: "R", street: "S" },
                notes: "E2E-LIFECYCLE-ORDER"
            });
        }

        // Cleanup previous E2E orders
        const oldOrders = await Order.find({ notes: "E2E-LIFECYCLE-ORDER" });
        if (oldOrders.length) {
            const ids = oldOrders.map(o => o._id);
            await Transaction.deleteMany({ order: { $in: ids } });
            await Order.deleteMany({ _id: { $in: ids } });
        }

        // O1: B1 buys Card. S1: P1(100@10%), S2: P2(200@5%), Ship: 30. Total: 330
        const o1 = await createMockOrder(b1._id, s1_owner._id, s1._id, [
            { product: pA._id, store: s1._id, name: pA.name, price: 100, qty: 1, deliveryCode: "E1" },
            { product: pB._id, store: s2._id, name: pB.name, price: 200, qty: 1, deliveryCode: "E2" }
        ], 30, "Online", "CARD");

        // O2: B2 buys Bank Transfer. S2: P3(400@10%), S3: P4(100@0%), Ship: 20. Total: 520
        const o2 = await createMockOrder(b2._id, s2_owner._id, s2._id, [
            { product: pC._id, store: s2._id, name: pC.name, price: 400, qty: 1, deliveryCode: "E3" },
            { product: pD._id, store: s3._id, name: pD.name, price: 100, qty: 1, deliveryCode: "E4" }
        ], 20, "Online", "BANK_TRANSFER");
        o2.bankTransferStatus = "confirmed";
        await o2.save();

        // O3: B3 buys Wallet. S1: P1(100@10%), S3: P5(150@5%), Ship: 25. Total: 275
        const o3 = await createMockOrder(b3._id, s1_owner._id, s1._id, [
            { product: pA._id, store: s1._id, name: pA.name, price: 100, qty: 1, deliveryCode: "E5" },
            { product: pE._id, store: s3._id, name: pE.name, price: 150, qty: 1, deliveryCode: "E6" }
        ], 25, "Wallet");

        // Process Wallet Deduction for O3
        const o3_wallet = await Wallet.findOne({ buyer: b3._id });
        const walletBeforeO3 = o3_wallet.balance;
        o3_wallet.balance -= o3.totalPrice;
        await o3_wallet.save();
        await WalletTransaction.create({
            wallet: o3_wallet._id,
            type: "payment",
            direction: "debit",
            amount: o3.totalPrice,
            balanceBefore: walletBeforeO3,
            balanceAfter: o3_wallet.balance,
            status: "completed",
            reference: WalletTransaction.generateReference(),
            orderId: o3._id,
            note: "E2E Test Payment"
        });

        console.log(`✅ Orders created and payments processed (Wallet B3: ${o3_wallet.balance})`);

        // 7. Trigger Financial Registration for all 3
        console.log("⚙️ Triggering financial registration for all orders...");
        await registerFinancialTransactionsForDeliveredOrder(o1._id);
        await registerFinancialTransactionsForDeliveredOrder(o2._id);
        await registerFinancialTransactionsForDeliveredOrder(o3._id);

        // 8. Settlement: Admin Payout 50 SAR to S1
        console.log("🏛️ Simulating Admin Payout (Settlement) to S1...");
        await Transaction.create({
            role: "SELLER",
            store: s1._id,
            type: "PAYOUT",
            amount: 50,
            direction: "DEBIT",
            status: "COMPLETED",
            paymentMethod: "BANK_TRANSFER",
            note: "E2E Test Payout Settlement",
            processedAt: new Date()
        });

        // 9. Final Assertions
        console.log("🔍 Verifying final platform-wide balances...");
        
        const allTxs = await Transaction.find({ order: { $in: [o1._id, o2._id, o3._id] } });
        const payoutTx = await Transaction.findOne({ type: "PAYOUT", store: s1._id, amount: 50 });

        // Expected Net for S1: 90 (O1) + 90 (O3) - 50 (Payout) = 130
        const s1_earnings = allTxs.filter(t => String(t.store) === String(s1._id) && t.role === "SELLER").reduce((s,t) => s+t.amount, 0);
        const s1_actual_net = s1_earnings - (payoutTx ? payoutTx.amount : 0);
        
        // Expected Net for S2: 190 (O1) + 360 (O2) = 550
        const s2_actual_net = allTxs.filter(t => String(t.store) === String(s2._id) && t.role === "SELLER").reduce((s,t) => s+t.amount, 0);

        // Expected Net for S3: 100 (O2) + 142.5 (O3) = 242.5
        const s3_actual_net = allTxs.filter(t => String(t.store) === String(s3._id) && t.role === "SELLER").reduce((s,t) => s+t.amount, 0);

        // Platform Earnings: sum of ORDER_EARNING_PLATFORM
        const platform_actual = allTxs.filter(t => t.role === "PLATFORM").reduce((s,t) => s+t.amount, 0);

        console.log("\n--- Final Integrity Snapshot ---");
        console.log(`Seller 1 (S1) Net: ${s1_actual_net} (Expected: 130) ${s1_actual_net === 130 ? "✅" : "❌"}`);
        console.log(`Seller 2 (S2) Net: ${s2_actual_net} (Expected: 550) ${s2_actual_net === 550 ? "✅" : "❌"}`);
        console.log(`Seller 3 (S3) Net: ${s3_actual_net} (Expected: 242.5) ${s3_actual_net === 242.5 ? "✅" : "❌"}`);
        console.log(`Platform Commission: ${platform_actual} (Expected: 77.5) ${platform_actual === 77.5 ? "✅" : "❌"}`);
        console.log(`B3 Wallet Balance: ${o3_wallet.balance} (Expected: 725) ${o3_wallet.balance === 725 ? "✅" : "❌"}`);

        const grandPass = (s1_actual_net === 130 && s2_actual_net === 550 && s3_actual_net === 242.5 && platform_actual === 77.5 && o3_wallet.balance === 725);
        
        if (grandPass) {
            console.log("\n🏆 🎊 E2E PLATFORM LIFECYCLE TEST PASSED! 🎊 🏆");
            console.log("Full data integrity verified from Buyer Deposit to Seller Payout.");
        } else {
            console.error("\n💀 E2E TEST FAILED. Data inconsistency detected.");
        }

    } catch (err) {
        console.error("❌ E2E TEST CRASHED:", err);
    } finally {
        await mongoose.disconnect();
        console.log("👋 Disconnected from DB");
    }
}

runE2ETest();
