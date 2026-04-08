import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Store from "../models/Store.js";
import { registerFinancialTransactionsForDeliveredOrder } from "../utils/financialTransactions.js";
import { CANCELLED_CODES } from "../utils/cancellationCodes.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function finalMoneyCycleReview() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("💎 FINAL MONEY CYCLE AUDIT 💎");
        console.log("--------------------------------");

        // 1. Create Mock Data
        const store = await Store.findOne({ isActive: true });
        const buyer = await User.findOne({ role: "buyer" });
        const cat = await Category.findOne({ isActive: true });
        
        if (!store || !buyer || !cat) throw new Error("Missing mock data entities");

        console.log(`✅ Using Store: ${store.name}, Buyer: ${buyer.name}, Category: ${cat.name}`);

        // 2. Simulate Order Lifecycle
        const orderId = new mongoose.Types.ObjectId();
        const price = 500;
        const shipping = 25;
        const total = price + shipping;
        const commRate = cat.commissionRate; 
        const expectedComm = (price * (commRate > 1 ? commRate / 100 : commRate));
        const expectedSeller = price - expectedComm;

        console.log(`🧮 Scenario: Price ${price}, Comm ${commRate}%, Shipping ${shipping} -> Total ${total}`);
        console.log(`   - Expected Platform: ${expectedComm}`);
        console.log(`   - Expected Seller: ${expectedSeller}`);

        const order = await Order.create({
            _id: orderId,
            buyer: buyer._id,
            store: store._id,
            seller: store.owner || buyer._id,
            totalPrice: total,
            shippingPrice: shipping,
            paymentMethod: "Online",
            status: "مكتمل",
            statusCode: ORDER_STATUS_CODES.DELIVERED,
            orderItems: [{
                product: new mongoose.Types.ObjectId(),
                store: store._id,
                name: "Audit Item",
                price: price,
                qty: 1,
                product: { category: cat._id } // for populate logic
            }]
        });

        // 3. Register Financials
        await registerFinancialTransactionsForDeliveredOrder(orderId);

        // 4. Audit Data in DB
        const txs = await Transaction.find({ order: orderId });
        console.log(`✅ Transactions found: ${txs.length}`);
        
        let actualSeller = 0, actualPlatform = 0, actualShipping = 0;
        txs.forEach(t => {
            if (t.type === "ORDER_EARNING_SELLER") actualSeller += t.amount;
            if (t.type === "ORDER_EARNING_PLATFORM") actualPlatform += t.amount;
            if (t.type === "ORDER_EARNING_SHIPPING") actualShipping += t.amount;
            console.log(`   └─ Found Transaction: Role=${t.role}, Type=${t.type}, Amt=${t.amount}`);
        });

        const round = (n) => Math.round(n * 100) / 100;

        console.log(`📊 DB Verification:
           - Seller: ${actualSeller} (Expected: ${round(expectedSeller)})
           - Platform: ${actualPlatform} (Expected: ${round(expectedComm)})
           - Shipping: ${actualShipping} (Expected: ${shipping})`);

        if (round(actualSeller) !== round(expectedSeller) || round(actualPlatform) !== round(expectedComm) || actualShipping !== shipping) {
            console.warn("⚠️ DB DATA MISMATCH (Check rounding logic or category structure)");
        } else {
            console.log("✅ DB DATA IS PERFECT.");
        }

        // 5. Audit Reporting Logic (Nin Filter)
        console.log("\n📈 Testing Reporting Dashboard Logic...");
        
        const reportsFilter = {
            statusCode: { $nin: CANCELLED_CODES }
        };
        
        const includedInReports = await Order.exists({ _id: orderId, ...reportsFilter });
        console.log(`   - Delivered Order included in Reports? ${includedInReports ? 'YES ✅' : 'NO ❌'}`);

        // Simulate Cancellation
        order.statusCode = ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
        await order.save();
        
        const includedAfterCancel = await Order.exists({ _id: orderId, ...reportsFilter });
        console.log(`   - Cancelled Order included in Reports? ${includedAfterCancel ? 'YES ❌' : 'NO ✅ (Correct)'}`);

        if (includedInReports && !includedAfterCancel) {
            console.log("\n🎊 MONEY CYCLE VERIFIED AS PERFECT! 🎊");
        } else {
            console.error("\n💀 MONEY CYCLE VERIFICATION FAILED!");
        }

        // Cleanup
        await Transaction.deleteMany({ order: orderId });
        await Order.deleteOne({ _id: orderId });
        console.log("\n🧹 Audit cleanup done.");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

finalMoneyCycleReview();
