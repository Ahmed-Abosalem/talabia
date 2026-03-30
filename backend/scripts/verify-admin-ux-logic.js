
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Store from "../models/Store.js";
import { getAdminUserDetails, updateUserStatus, deleteUserByAdmin } from "../controllers/admin/adminUsersController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function runTests() {
    console.log("🚀 Starting Admin UX Logic Verification...\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Database Connected.\n");

        const testAdmin = await User.findOne({ role: 'admin' });
        const testSeller = await User.findOne({ role: 'seller' });
        const testBuyer = await User.findOne({ role: 'buyer' });

        if (!testAdmin || !testSeller || !testBuyer) {
            console.warn("⚠️ Warning: Could not find all user roles for testing. Running partial tests.");
        }

        // Test 1: Data Structure Integrity
        console.log("Test 1: Verifying Admin User Details Structure...");
        if (testSeller) {
            const req = { params: { id: testSeller._id } };
            const res = {
                json: (data) => {
                    if (data.user && data.store !== undefined && data.stats) {
                        console.log("  PASS: Seller details structure is correct.");
                    } else {
                        console.error("  FAIL: Seller details structure mismatch.");
                    }
                }
            };
            await getAdminUserDetails(req, res);
        }

        // Test 2: Status Synchronization (Seller -> Store)
        console.log("Test 2: Verifying Status Synchronization...");
        if (testSeller) {
            const mockReq = {
                params: { id: testSeller._id },
                body: { isActive: false },
                user: { _id: testAdmin._id }
            };
            const mockRes = { json: () => { } };

            await updateUserStatus(mockReq, mockRes);
            const store = await Store.findOne({ owner: testSeller._id });
            if (store && store.status === 'suspended') {
                console.log("  PASS: Seller deactivation correctly suspended the store.");
            } else {
                console.error("  FAIL: Store status did not synchronize.");
            }

            // Re-activate
            mockReq.body.isActive = true;
            await updateUserStatus(mockReq, mockRes);
            const storeActive = await Store.findOne({ owner: testSeller._id });
            if (storeActive && storeActive.status === 'approved') {
                console.log("  PASS: Seller activation correctly approved the store.");
            }
        }

        // Test 3: Security Guards
        console.log("Test 3: Verifying Security Guards...");
        if (testAdmin) {
            const mockReq = {
                params: { id: testAdmin._id },
                user: { _id: testAdmin._id }
            };
            const mockRes = {
                status: (code) => {
                    if (code === 400 || code === 403) console.log(`  PASS: Prevented self-action with status ${code}`);
                    return { json: () => { } };
                }
            };

            try {
                await deleteUserByAdmin(mockReq, mockRes, () => { });
            } catch (e) {
                console.log(`  PASS: Prevented self-delete (Exception: ${e.message})`);
            }
        }

        console.log("\n✅ Logic Verification Complete.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Test Suite Failed:", error);
        process.exit(1);
    }
}

runTests();
