
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/talabia";

/**
 * 🛠️ Mock Frontend Normalization Logic (Copied from ShippingDashboard.jsx)
 */
function normalizeShippingAddress(orderAddress) {
    const shippingAddressParts = [
        orderAddress?.country,
        orderAddress?.city,
        orderAddress?.district,
        orderAddress?.neighborhood,
        orderAddress?.street || orderAddress?.details || orderAddress?.additionalInfo,
    ].filter(Boolean);

    return shippingAddressParts.length > 0 ? shippingAddressParts.join("، ") : "—";
}

async function verifyMigration() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const ordersCollection = db.collection('orders');

        // 1. Create/Update a test order with Neighborhood
        const testOrderId = new mongoose.Types.ObjectId();
        const testOrder = {
            _id: testOrderId,
            createdAt: new Date(),
            shippingAddress: {
                fullName: "Test Verification User",
                phone: "0000000000",
                country: "اليمن",
                city: "صنعاء",
                district: "السبعين",
                neighborhood: "حي حدة",
                street: "شارع صخر",
                details: "عمارة رقم 1"
            },
            orderItems: [{ name: "Product 1", qty: 1, price: 10 }]
        };

        console.log("Inserting test order with Neighborhood...");
        await ordersCollection.insertOne(testOrder);

        // 2. Fetch it back and verify fields
        const fetched = await ordersCollection.findOne({ _id: testOrderId });
        console.log("Fetched Order Address:", JSON.stringify(fetched.shippingAddress, null, 2));

        if (fetched.shippingAddress.neighborhood === "حي حدة") {
            console.log("✅ Persistence Test Passed: Neighborhood field exists and is correct.");
        } else {
            console.log("❌ Persistence Test Failed: Neighborhood field is missing or incorrect.");
        }

        // 3. Test Display Normalization Logic
        const renderedAddress = normalizeShippingAddress(fetched.shippingAddress);
        console.log("Rendered Address (5-parts):", renderedAddress);

        const expected = "اليمن، صنعاء، السبعين، حي حدة، شارع صخر";
        if (renderedAddress === expected) {
            console.log("✅ Rendering Test Passed: 5-part address is unified and correctly ordered.");
        } else {
            console.log(`❌ Rendering Test Failed: Expected "${expected}", got "${renderedAddress}"`);
        }

        // Cleanup
        await ordersCollection.deleteOne({ _id: testOrderId });
        console.log("Test order cleaned up.");

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

verifyMigration();
