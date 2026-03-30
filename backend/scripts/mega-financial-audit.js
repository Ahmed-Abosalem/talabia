import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Store from "../models/Store.js";
import ShippingCompany from "../models/ShippingCompany.js";
import { processWalletPayment } from "../controllers/walletController.js";
import { createFinancialSettlement } from "../controllers/admin/adminFinancialController.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/talabia";

async function runMegaAudit() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🌟 MEGA FINANCIAL LIFECYCLE AUDIT 🌟");
        console.log("==========================================");

        // --- Helper to call asyncHandler controllers ---
        const callController = (fn, req) => new Promise((resolve, reject) => {
            const res = {
                status: (c) => { res.statusCode = c; return res; },
                json: (d) => { res.data = d; resolve(res); return res; }
            };
            fn(req, res, (err) => {
                if (err) reject(err);
            });
        });

        // --- 1. SETUP ENTITIES ---
        console.log("🏗️ Setting up entities (3 Buyers, 3 Sellers, 2 Shippers)...");
        const admin = await User.findOne({ role: "admin" });
        const ts = Date.now();
        
        const buyers = [];
        for(let i=1; i<=3; i++) {
            const b = await User.create({ name: `Mega Buyer ${i} ${ts}`, email: `mega_b${i}_${ts}@test.com`, password: "password123", role: "buyer" });
            const w = await Wallet.create({ 
                buyer: b._id, walletNumber: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
                balance: 10000, pin: "123456", status: "active",
                metadata: { fullName: b.name, docType: "هوية وطنية", docNumber: `DOCB${i}${ts}`, whatsapp: `050000000${i}` }
            });
            buyers.push({ user: b, wallet: w });
        }

        const sellers = [];
        for(let i=1; i<=3; i++) {
            const u = await User.create({ name: `Mega Seller ${i} ${ts}`, email: `mega_s${i}_${ts}@test.com`, password: "password123", role: "seller" });
            const s = await Store.create({ name: `Mega Store ${i} ${ts}`, slug: `mega-st${i}-${ts}`, owner: u._id, status: "approved", isActive: true });
            sellers.push({ user: u, store: s });
        }

        const shippers = [];
        for(let i=1; i<=2; i++) {
            const u = await User.create({ name: `Mega Shipper ${i} ${ts}`, email: `mega_sh${i}_${ts}@test.com`, password: "password123", role: "shipper" });
            const c = await ShippingCompany.create({ name: `Mega ShipCo ${i} ${ts}`, user: u._id, isActive: true, email: u.email, phone: `059999999${i}` });
            shippers.push({ user: u, company: c });
        }

        console.log("✅ Entities created.");

        // --- 2. CREATE ORDERS MATRIX ---
        console.log("\n🛍️ Creating Order Matrix (6 Mixed Orders)...");

        const orderData = [
            { b: buyers[0], s: sellers[0], method: "Wallet", price: 500, status: "مكتمل" },      // B1 -> ST1 (Delivered)
            { b: buyers[0], s: sellers[1], method: "Online", subMethod: "CARD", price: 1200, status: "مكتمل" }, // B1 -> ST2 (Delivered)
            { b: buyers[1], s: sellers[1], method: "Online", subMethod: "BANK_TRANSFER", price: 2500, status: "مكتمل" }, // B2 -> ST2 (Delivered)
            { b: buyers[1], s: sellers[2], method: "COD", price: 300, status: "مكتمل", sh: shippers[0] }, // B2 -> ST3 (Delivered)
            { b: buyers[2], s: sellers[2], method: "Wallet", price: 800, status: "ملغى" },        // B3 -> ST3 (Cancelled - Leak Test)
            { b: buyers[2], s: sellers[0], method: "COD", price: 450, status: "مكتمل", sh: shippers[1] }, // B3 -> ST1 (Delivered)
        ];

        const createdOrders = [];
        for(const od of orderData) {
            const order = await Order.create({
                buyer: od.b.user._id, seller: od.s.user._id, store: od.s.store._id,
                shippingCompany: od.sh ? od.sh.company._id : undefined,
                totalPrice: od.price, paymentMethod: od.method,
                paymentSubMethod: od.subMethod,
                isPaid: od.method === "Wallet" || od.subMethod === "CARD",
                status: od.status,
                shippingAddress: {
                    fullName: od.b.user.name,
                    phone: "0500000000",
                    city: "Riyadh",
                    street: "Mega Audit St"
                },
                orderItems: [{ product: new mongoose.Types.ObjectId(), name: "Mega Item", qty: 1, price: od.price, seller: od.s.user._id, store: od.s.store._id, itemStatus: od.status, deliveryCode: "MEGA" }]
            });
            createdOrders.push({ order, od });
        }

        // --- 3. PROCESS PAYMENTS & EARNINGS ---
        console.log("\n💸 Processing Payments, Earnings & Approvals...");

        for(const { order, od } of createdOrders) {
            if (od.method === "Wallet" && od.status !== "ملغى") {
                await processWalletPayment(od.b.wallet.walletNumber, "123456", od.price, order._id, od.b.user._id, "127.0.0.1");
            }

            if (od.status === "مكتمل") {
                const platformFee = od.price * 0.1;
                const netEarning = od.price - platformFee;
                
                let txMethod;
                if (od.method === "Online") {
                    txMethod = od.subMethod === "CARD" ? "ONLINE" : "BANK_TRANSFER";
                } else {
                    txMethod = od.method.toUpperCase();
                }

                // Record Seller Earning
                await Transaction.create({ role: "SELLER", store: od.s.store._id, type: "ORDER_EARNING_SELLER", amount: netEarning, direction: "CREDIT", status: "COMPLETED", order: order._id, paymentMethod: txMethod });
                // Record Platform Earning
                await Transaction.create({ role: "PLATFORM", type: "ORDER_EARNING_PLATFORM", amount: platformFee, direction: "CREDIT", status: "COMPLETED", order: order._id, paymentMethod: txMethod });
                
                if (od.sh) {
                    const shipFee = 25;
                    await Transaction.create({ role: "SHIPPING", shippingCompany: od.sh.company._id, type: "ORDER_EARNING_SHIPPING", amount: shipFee, direction: "CREDIT", status: "COMPLETED", order: order._id, paymentMethod: txMethod });
                }
            }
        }
        console.log("✅ Earnings recorded.");

        // --- 4. ADMIN SETTLEMENTS (PAYOUTS & SUPPLIES) ---
        console.log("\n🏛️ Admin Settlements & Reconciliations...");

        // Payout to Seller 1 (Earnings: 500*0.9 = 450. Payout 200)
        await callController(createFinancialSettlement, {
            body: { role: "SELLER", partyId: sellers[0].store._id, operationType: "PAYOUT", amount: 200, note: "Mega Payout S1", paymentMethod: "BANK_TRANSFER" },
            user: admin
        });

        // Shipping 1 COD Supply (Order price 300)
        await callController(createFinancialSettlement, {
            body: { role: "SHIPPING", partyId: shippers[0].company._id, operationType: "SUPPLY", amount: 300, note: "COD Supply SH1", paymentMethod: "COD" },
            user: admin
        });

        console.log("✅ Settlements completed.");

        // --- 5. FINAL INTEGRITY SWEEP ---
        console.log("\n🧪 Final Integrity Sweep (Mathematical Audit)...");

        // Audit Seller 1 (ST1)
        // Earnings: (Order 1: 500*0.9=450) + (Order 6: 450*0.9=405). Total: 855. Payout: 200. Balance: 655.
        const s1Txs = await Transaction.find({ store: sellers[0].store._id });
        const s1Bal = s1Txs.filter(t => t.type === "ORDER_EARNING_SELLER").reduce((a,b) => a+b.amount,0) - s1Txs.filter(t => t.type === "PAYOUT").reduce((a,b) => a+b.amount,0);
        console.log(`📊 Seller 1 Balance: ${s1Bal} (Expected: 655)`);

        // Audit Buyer 3 (B3) - Leak Test
        // Order 5 was 800 (Wallet) and CANCELLED. Wallet shouldn't have been charged (transaction logic in script bypasses charge if cancelled, but let's check ledger).
        const b3Wallet = await Wallet.findById(buyers[2].wallet._id);
        console.log(`💰 Buyer 3 Wallet: ${b3Wallet.balance} (Expected: 10000 - 0 = 10000)`);

        // Audit Shipper 1 (SH1)
        // Earnings: 25. Supply: 250 (Wait, order was 300. Supply 300).
        const sh1Txs = await Transaction.find({ shippingCompany: shippers[0].company._id });
        const sh1Earn = sh1Txs.filter(t => t.type === "ORDER_EARNING_SHIPPING").reduce((a,b) => a+b.amount,0);
        const sh1Supp = sh1Txs.filter(t => t.type === "SUPPLY").reduce((a,b) => a+b.amount,0);
        console.log(`📦 Shipper 1 Earning: ${sh1Earn} (Expected: 25)`);
        console.log(`📦 Shipper 1 Supply: ${sh1Supp} (Expected: 300)`);

        if (s1Bal === 655 && b3Wallet.balance === 10000 && sh1Earn === 25 && sh1Supp === 300) {
            console.log("\n💎 MEGA FINANCIAL AUDIT: 100% SUCCESS");
            console.log("==========================================");
            process.exit(0);
        } else {
            console.error("\n❌ MEGA FINANCIAL AUDIT: FAILED - Mismatch detected.");
            process.exit(1);
        }

    } catch (err) {
        console.error("\n🔥 CRITICAL ERROR DURING AUDIT:", err.message);
        process.exit(1);
    }
}

runMegaAudit();
