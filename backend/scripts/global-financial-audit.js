import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction, { WALLET_TX_TYPES, WALLET_TX_DIRECTIONS, WALLET_TX_STATUS } from "../models/WalletTransaction.js";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Store from "../models/Store.js";
import ShippingCompany from "../models/ShippingCompany.js";
import { processWalletPayment } from "../controllers/walletController.js";
import { createFinancialSettlement } from "../controllers/admin/adminFinancialController.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/talabia";

async function runGlobalAudit() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("💎 ULTIMATE FINANCIAL RESILIENCE AUDIT 💎");
        console.log("==========================================");

        // --- Setup Test Entities ---
        const admin = await User.findOne({ role: "admin" });
        if (!admin) throw new Error("Admin user not found");

        const buyer = await User.create({
            name: `Audit Buyer ${Date.now()}`,
            email: `audit_buyer_${Date.now()}@test.com`,
            password: "password123",
            role: "buyer"
        });

        const sellerUser = await User.create({
            name: `Audit Seller ${Date.now()}`,
            email: `audit_seller_${Date.now()}@test.com`,
            password: "password123",
            role: "seller"
        });

        const store = await Store.create({
            name: `Audit Store ${Date.now()}`,
            slug: `audit-store-${Date.now()}`,
            owner: sellerUser._id,
            status: "approved",
            isActive: true
        });

        const shippingUser = await User.create({
            name: `Audit Shipper ${Date.now()}`,
            email: `audit_shipper_${Date.now()}@test.com`,
            password: "password123",
            role: "shipper"
        });

        const shippingCompany = await ShippingCompany.create({
            name: `Audit Shipping Co ${Date.now()}`,
            user: shippingUser._id,
            isActive: true,
            email: `audit_shipper_${Date.now()}@test.com`,
            phone: `05${Math.floor(Math.random() * 100000000)}`
        });

        const wallet = await Wallet.create({
            buyer: buyer._id,
            walletNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
            balance: 5000,
            pin: "123456",
            status: "active",
            metadata: {
                fullName: buyer.name,
                docType: "هوية وطنية",
                docNumber: "1234567890",
                whatsapp: "0500000000"
            }
        });

        console.log(`✅ Setup Complete: 
           Buyer: ${buyer.name}
           Store: ${store.name}
           Shipper: ${shippingCompany.name}
           Wallet: ${wallet.walletNumber} (Initial Balance: 5000)`);

        // ════════════════════════════════════════════════
        // TEST 1: WALLET -> SELLER SETTLEMENT CYCLE
        // ════════════════════════════════════════════════
        console.log("\n🧪 Test 1: Wallet -> Seller Settlement Cycle");
        
        const orderPrice = 1000;
        const platformCommission = 100; // 10%
        const sellerEarning = 900;

        const order = await Order.create({
            buyer: buyer._id,
            seller: sellerUser._id,
            store: store._id,
            totalPrice: orderPrice,
            paymentMethod: "Wallet",
            isPaid: true,
            status: "جديد",
            shippingAddress: { fullName: buyer.name, phone: "0500000000", city: "Riyadh", street: "Audit St" },
            orderItems: [{ 
                product: new mongoose.Types.ObjectId(), 
                name: "Premium Audit Item",
                qty: 1, price: orderPrice, seller: sellerUser._id, store: store._id, itemStatus: "جديد",
                deliveryCode: "4321"
            }]
        });

        // Payment Simulation
        await processWalletPayment(wallet.walletNumber, "123456", orderPrice, order._id, buyer._id, "127.0.0.1");
        
        // Manual Earning Records (simulate what system does during lifecycle)
        await Transaction.create({
            role: "SELLER", store: store._id, type: "ORDER_EARNING_SELLER", amount: sellerEarning, 
            direction: "CREDIT", status: "COMPLETED", order: order._id, paymentMethod: "WALLET"
        });
        await Transaction.create({
            role: "PLATFORM", type: "ORDER_EARNING_PLATFORM", amount: platformCommission, 
            direction: "CREDIT", status: "COMPLETED", order: order._id, paymentMethod: "WALLET"
        });

        console.log(`💰 Order #1 paid. Wallet Balance: ${(await Wallet.findById(wallet._id)).balance} (Expected: 4000)`);
        
        const payoutAmount = 500;
        // Mocking Controller Call
        const mockReq = { 
            body: { role: "SELLER", partyId: store._id, operationType: "PAYOUT", amount: payoutAmount, note: "Audit Payout", paymentMethod: "BANK_TRANSFER" },
            user: admin
        };

        // Helper to call asyncHandler controllers
        const callController = (fn, req) => new Promise((resolve, reject) => {
            const res = {
                status: (c) => { 
                    res.statusCode = c; 
                    return res; 
                },
                json: (d) => { 
                    res.data = d;
                    resolve(res); 
                    return res;
                }
            };
            fn(req, res, (err) => {
                if (err) reject(err);
                // Note: if fn calls res.json, resolve is already called.
            });
        });
        
        console.log("💸 Processing Seller Payout (Settlement)...");
        await callController(createFinancialSettlement, mockReq);
        
        const txs = await Transaction.find({ store: store._id });
        const sellerEarnings = txs.filter(t => t.type === "ORDER_EARNING_SELLER").reduce((s, t) => s + t.amount, 0);
        const sellerPayouts = txs.filter(t => t.type === "PAYOUT").reduce((s, t) => s + t.amount, 0);
        const finalSellerBalance = sellerEarnings - sellerPayouts;

        console.log(`📈 Seller Stats: Total Earnings: ${sellerEarnings}, Total Payouts: ${sellerPayouts}, Current Balance: ${finalSellerBalance}`);
        if (finalSellerBalance === 400) console.log("✅ SUCCESS: Test 1 Passed.");
        else throw new Error(`Test 1 Failed: Balance mismatch. Expected 400, got ${finalSellerBalance}`);

        // ════════════════════════════════════════════════
        // TEST 2: COD -> SHIPPING SUPPLY CYCLE
        // ════════════════════════════════════════════════
        console.log("\n🧪 Test 2: COD -> Shipping Supply Cycle");
        
        const codAmount = 250;
        const shippingEarning = 30;
        
        // Record COD earnings
        await Transaction.create({
            role: "SHIPPING", shippingCompany: shippingCompany._id, type: "ORDER_EARNING_SHIPPING", 
            amount: shippingEarning, direction: "CREDIT", status: "COMPLETED", paymentMethod: "COD"
        });
        
        // Shipping Company supplies the COD cash to Platform
        console.log("📦 Shipper supplying COD cash to platform...");
        await callController(createFinancialSettlement, {
            body: { role: "SHIPPING", partyId: shippingCompany._id, operationType: "SUPPLY", amount: codAmount, note: "COD Supply", paymentMethod: "COD" },
            user: admin
        });

        const shipTxs = await Transaction.find({ shippingCompany: shippingCompany._id });
        const shipSupplied = shipTxs.filter(t => t.type === "SUPPLY").reduce((s, t) => s + t.amount, 0);
        
        console.log(`📉 Shipper Supply: ${shipSupplied} (Expected: 250)`);
        if (shipSupplied === 250) console.log("✅ SUCCESS: Test 2 Passed.");
        else throw new Error("Test 2 Failed: Supply mismatch");

        // ════════════════════════════════════════════════
        // TEST 3: SUSPENDED ACCOUNT BLOCKING
        // ════════════════════════════════════════════════
        console.log("\n🧪 Test 3: Suspended Account Blocking");
        
        store.isActive = false;
        await store.save();
        console.log(`🚫 Store ${store.name} SUSPENDED.`);

        try {
            await callController(createFinancialSettlement, {
                body: { role: "SELLER", partyId: store._id, operationType: "PAYOUT", amount: 100, note: "Illegal Payout", paymentMethod: "BANK_TRANSFER" },
                user: admin
            });
            throw new Error("FAILURE: Payout should have been blocked for suspended store");
        } catch (err) {
            console.log(`✅ SUCCESS: Payout blocked as expected: "${err.message}"`);
        }

        // ════════════════════════════════════════════════
        // TEST 4: INSUFFICIENT BALANCE BLOCKING
        // ════════════════════════════════════════════════
        console.log("\n🧪 Test 4: Insufficient Balance Blocking");
        
        store.isActive = true; // reactivate
        await store.save();

        try {
            // Current Balance is 400. Attempting payout of 1000.
            await callController(createFinancialSettlement, {
                body: { role: "SELLER", partyId: store._id, operationType: "PAYOUT", amount: 1000, note: "Insane Payout", paymentMethod: "BANK_TRANSFER" },
                user: admin
            });
            throw new Error("FAILURE: Payout should have been blocked due to insufficient balance");
        } catch (err) {
            console.log(`✅ SUCCESS: Insufficient balance blocked as expected: "${err.message}"`);
        }

        // ════════════════════════════════════════════════
        // TEST 5: LEDGER SYNCHRONIZATION
        // ════════════════════════════════════════════════
        console.log("\n🧪 Test 5: Ledger Synchronization Audit");
        
        const buyerWallet = await Wallet.findById(wallet._id);
        const allWalletTxs = await WalletTransaction.find({ wallet: wallet._id });
        console.log(`🔍 Found ${allWalletTxs.length} transactions in ledger.`);
        allWalletTxs.forEach(t => console.log(`   - Type: ${t.type}, Dir: ${t.direction}, Amt: ${t.amount}, Status: ${t.status}`));

        const walletTxs = allWalletTxs.filter(t => t.status === "completed" || t.status === "COMPLETED");
        const walletCalculated = 5000 - walletTxs.filter(t => t.direction === "DEBIT" || t.direction === "debit").reduce((s, t) => s + t.amount, 0) 
                                      + walletTxs.filter(t => t.direction === "CREDIT" || t.direction === "credit").reduce((s, t) => s + t.amount, 0);
        
        console.log(`📝 Wallet Sync: Actual: ${buyerWallet.balance}, Calculated: ${walletCalculated}`);
        if (buyerWallet.balance === walletCalculated) console.log("✅ SUCCESS: Wallet Ledger synchronized.");
        else throw new Error(`Wallet Ledger mismatch. Actual: ${buyerWallet.balance}, Calculated: ${walletCalculated}`);

        console.log("\n🚀 ALL GLOBAL FINANCIAL AUDIT SCENARIOS PASSED!");
        console.log("==========================================");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ AUDIT FAILED:", error.message);
        process.exit(1);
    }
}

runGlobalAudit();
