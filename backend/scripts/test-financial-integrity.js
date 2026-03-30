/**
 * 🧪 Financial Integrity Test Script
 * ---------------------------------
 * This script simulates a complex multi-seller order with different categories and commission rates.
 * It verifies that the financial registration logic (registerFinancialTransactionsForDeliveredOrder)
 * correctly splits earnings between Sellers, Platform, and Shipping Company.
 * 
 * Run with: node backend/scripts/test-financial-integrity.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

import { registerFinancialTransactionsForDeliveredOrder } from '../utils/financialTransactions.js';

async function runTest() {
    try {
        console.log("🚀 Starting Financial Integrity Test...");

        // 1. Connect to DB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found in .env");
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // 2. Setup Mock Data
        console.log("📦 Setting up mock data...");

        // Mock Buyer
        const buyer = await User.findOneAndUpdate(
            { email: "test-buyer@example.com" },
            { name: "Test Buyer", role: "buyer", isVerified: true },
            { upsert: true, new: true }
        );

        // Mock Sellers (Stores)
        const seller1 = await Store.findOneAndUpdate(
            { email: "seller1@test.com" },
            { 
                name: "Alpha Store", 
                slug: "alpha-store-test", 
                status: "approved", 
                owner: buyer._id,
                description: "Test description for Alpha Store"
            },
            { upsert: true, new: true }
        );
        const seller2 = await Store.findOneAndUpdate(
            { email: "seller2@test.com" },
            { 
                name: "Beta Store", 
                slug: "beta-store-test", 
                status: "approved", 
                owner: buyer._id,
                description: "Test description for Beta Store"
            },
            { upsert: true, new: true }
        );

        // Mock Shipping Company
        const shippingCo = await ShippingCompany.findOneAndUpdate(
            { email: "ship-co@test.com" },
            { name: "Fast Logistics", status: "active" },
            { upsert: true, new: true }
        );

        // Mock Categories with different commission rates
        const catA = await Category.findOneAndUpdate(
            { name: "Electronics-Test" },
            { commissionRate: 10, isActive: true }, // 10%
            { upsert: true, new: true }
        );
        const catB = await Category.findOneAndUpdate(
            { name: "Cloting-Test" },
            { commissionRate: 5, isActive: true }, // 5%
            { upsert: true, new: true }
        );
        const catC = await Category.findOneAndUpdate(
            { name: "Food-Test" },
            { commissionRate: 20, isActive: true }, // 20%
            { upsert: true, new: true }
        );

        // Mock Products
        const prod1 = await Product.findOneAndUpdate(
            { name: "Smartphone-Test" },
            { 
                store: seller1._id, 
                seller: buyer._id,
                category: catA._id, 
                price: 100, 
                stock: 100,
                description: "Test description",
                images: [{ url: "test.jpg" }]
            },
            { upsert: true, new: true }
        );
        const prod2 = await Product.findOneAndUpdate(
            { name: "Shirt-Test" },
            { 
                store: seller1._id, 
                seller: buyer._id,
                category: catB._id, 
                price: 50, 
                stock: 100,
                description: "Test description",
                images: [{ url: "test.jpg" }]
            },
            { upsert: true, new: true }
        );
        const prod3 = await Product.findOneAndUpdate(
            { name: "Burger-Test" },
            { 
                store: seller2._id, 
                seller: buyer._id,
                category: catC._id, 
                price: 200, 
                stock: 100,
                description: "Test description",
                images: [{ url: "test.jpg" }]
            },
            { upsert: true, new: true }
        );

        // 3. Create a complex Order
        // Scenario:
        // P1: 2 units @ 100 = 200 (S1, Cat A - 10%). Net Seller: 180, Platform: 20
        // P2: 1 unit @ 50 = 50 (S1, Cat B - 5%). Net Seller: 47.5, Platform: 2.5
        // P3: 1 unit @ 200 = 200 (S2, Cat C - 20%). Net Seller: 160, Platform: 40
        // Total S1: 227.5
        // Total S2: 160.0
        // Total Platform: 62.5
        // Shipping: 30
        // Expected Order Total: 480

        console.log("🛒 Creating mock complex order...");
        
        // Cleanup existing test order and transactions
        const existingOrder = await Order.findOne({ notes: "FINANCIAL-TEST-ORDER" });
        if (existingOrder) {
            await Transaction.deleteMany({ order: existingOrder._id });
            await Order.deleteOne({ _id: existingOrder._id });
        }

        const order = await Order.create({
            buyer: buyer._id,
            seller: buyer._id, // Owner of primary store
            store: seller1._id,
            shippingCompany: shippingCo._id,
            paymentMethod: "Online",
            paymentSubMethod: "BANK_TRANSFER",
            status: "مكتمل",
            statusCode: "DELIVERED",
            totalPrice: 480,
            shippingPrice: 30,
            notes: "FINANCIAL-TEST-ORDER",
            shippingAddress: {
                fullName: "Test Recipient",
                phone: "0500000000",
                city: "Riyadh",
                street: "Test Street"
            },
            orderItems: [
                {
                    product: prod1._id,
                    store: seller1._id,
                    name: prod1.name,
                    price: 100,
                    qty: 2,
                    deliveryCode: "D111"
                },
                {
                    product: prod2._id,
                    store: seller1._id,
                    name: prod2.name,
                    price: 50,
                    qty: 1,
                    deliveryCode: "D222"
                },
                {
                    product: prod3._id,
                    store: seller2._id,
                    name: prod3.name,
                    price: 200,
                    qty: 1,
                    deliveryCode: "D333"
                }
            ]
        });

        console.log(`✅ Order created with ID: ${order._id}`);

        // 4. Trigger Financial Registration
        console.log("⚙️ Triggering financial registration...");
        await registerFinancialTransactionsForDeliveredOrder(order._id);

        // 5. Verification
        console.log("🔍 Verifying results...");
        const txs = await Transaction.find({ order: order._id });

        if (txs.length === 0) throw new Error("❌ No transactions were created!");

        console.log(`📊 Found ${txs.length} transactions for this order.`);

        // Test Assertions
        const assertions = [
            { role: "SELLER", store: seller1._id, expected: 227.5, type: "ORDER_EARNING_SELLER" },
            { role: "SELLER", store: seller2._id, expected: 160.0, type: "ORDER_EARNING_SELLER" },
            { role: "PLATFORM", expected: 62.5, type: "ORDER_EARNING_PLATFORM" },
            { role: "SHIPPING", shippingCompany: shippingCo._id, expected: 30.0, type: "ORDER_EARNING_SHIPPING" }
        ];

        let grandPass = true;

        for (const ass of assertions) {
            const match = txs.find(t => 
                t.role === ass.role && 
                t.type === ass.type &&
                (!ass.store || String(t.store) === String(ass.store)) &&
                (!ass.shippingCompany || String(t.shippingCompany) === String(ass.shippingCompany))
            );

            if (!match) {
                console.error(`❌ FAILED: Transaction for role ${ass.role} / type ${ass.type} not found!`);
                grandPass = false;
                continue;
            }

            if (Math.abs(match.amount - ass.expected) > 0.01) {
                console.error(`❌ FAILED: Role ${ass.role} expected ${ass.expected}, but got ${match.amount}`);
                grandPass = false;
            } else {
                console.log(`✅ PASSED: Role ${ass.role} got ${match.amount} (Expected: ${ass.expected})`);
            }

            // Verify Payment Method consistency
            if (match.paymentMethod !== "BANK_TRANSFER") {
                 console.error(`❌ FAILED: Payment method expected BANK_TRANSFER, but got ${match.paymentMethod}`);
                 grandPass = false;
            } else {
                 console.log(`   └─ Payment Method verified: BANK_TRANSFER`);
            }
        }

        if (grandPass) {
            console.log("\n🎊 ALL FINANCIAL INTEGRITY TESTS PASSED SUCCESSFULLY! 🎊");
            console.log("The system correctly split multi-seller revenue and calculated category-based commissions.");
        } else {
            console.error("\n💀 SOME TESTS FAILED. Please check the logs above.");
        }

        // 6. Cleanup (Optional, but good for repeatability)
        // await Transaction.deleteMany({ order: order._id });
        // await Order.deleteOne({ _id: order._id });
        // console.log("🧹 Test data cleaned up.");

    } catch (err) {
        console.error("❌ TEST CRASHED:", err);
    } finally {
        await mongoose.disconnect();
        console.log("👋 Disconnected from DB");
    }
}

runTest();
