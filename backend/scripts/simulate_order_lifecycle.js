// backend/scripts/simulate_order_lifecycle.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import {
    ORDER_STATUS_CODES,
    syncItemStatus,
    syncOrderStatus,
    isCompleted,
    isBillable,
    isCancelled
} from "../utils/orderStatus.js";

dotenv.config({ path: "./backend/.env" });

const runSimulation = async () => {
    console.log("🚀 Starting Order Lifecycle Simulation...");

    // Mock Order Object
    const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderItems: [
            {
                _id: new mongoose.Types.ObjectId(),
                name: "Test Product A",
                statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
                itemStatus: "جديد" // Legacy initial state
            },
            {
                _id: new mongoose.Types.ObjectId(),
                name: "Test Product B",
                statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
                itemStatus: "جديد"
            }
        ],
        statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
        status: "جديد",
        save: async function () { return this; } // Mock save
    };

    console.log("\n1️⃣  Initial State:");
    console.table({
        OrderCode: mockOrder.statusCode,
        OrderStatus: mockOrder.status,
        Item1Code: mockOrder.orderItems[0].statusCode,
        Item1Status: mockOrder.orderItems[0].itemStatus
    });

    // --- Step 1: Seller prepares the order ---
    console.log("\n🔄 Step 1: Seller updates to PROCESSING...");
    syncOrderStatus(mockOrder, ORDER_STATUS_CODES.AT_SELLER_PROCESSING);
    mockOrder.orderItems.forEach(item => syncItemStatus(item, ORDER_STATUS_CODES.AT_SELLER_PROCESSING));

    if (mockOrder.status !== "قيد المعالجة") console.error("❌ FAILED: Order status text mismatch");
    else console.log("✅ Order status text synced matches 'قيد المعالجة'");

    // --- Step 2: Partial Delivery (One item delivered) ---
    console.log("\n🔄 Step 2: Shipping delivers Item A...");
    const itemA = mockOrder.orderItems[0];
    syncItemStatus(itemA, ORDER_STATUS_CODES.DELIVERED);

    console.log(`Item A isCompleted: ${isCompleted(itemA)}`);
    console.log(`Item A isBillable: ${isBillable(itemA)}`);

    if (!isCompleted(itemA)) console.error("❌ FAILED: Item A should be completed");
    else console.log("✅ Item A marked completed successfully");

    // --- Step 3: Admin Cancels Item B ---
    console.log("\n🔄 Step 3: Admin cancels Item B...");
    const itemB = mockOrder.orderItems[1];
    syncItemStatus(itemB, ORDER_STATUS_CODES.CANCELLED_BY_ADMIN);

    console.log(`Item B isCancelled: ${isCancelled(itemB)}`);
    console.log(`Item B isBillable: ${isBillable(itemB)}`);

    if (!isCancelled(itemB)) console.error("❌ FAILED: Item B should be cancelled");
    else console.log("✅ Item B marked cancelled successfully");

    // --- Final Verification ---
    console.log("\n📊 Final State Analysis:");
    const completedCount = mockOrder.orderItems.filter(isCompleted).length;
    const cancelledCount = mockOrder.orderItems.filter(isCancelled).length;
    const billableCount = mockOrder.orderItems.filter(isBillable).length;

    console.log(`Completed Items: ${completedCount} (Expected: 1)`);
    console.log(`Cancelled Items: ${cancelledCount} (Expected: 1)`);
    console.log(`Billable Items: ${billableCount} (Expected: 1)`);

    if (completedCount === 1 && cancelledCount === 1 && billableCount === 1) {
        console.log("\n🎉 TEST PASSED: System logic is consistent and robust.");
    } else {
        console.error("\n❌ TEST FAILED: Discrepancies found.");
        process.exit(1);
    }
    process.exit(0);
};

runSimulation();
