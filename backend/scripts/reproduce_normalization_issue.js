// backend/scripts/reproduce_normalization_issue.js
import { ORDER_STATUS_CODES, ORDER_STATUS_LABELS_AR } from "../utils/orderStatus.js";

// Copy-paste of the current function from sellerController.js
function normalizeSellerStatusKey(value) {
    if (!value) return null;
    const v = String(value).trim().toLowerCase();

    switch (v) {
        case "new":
        case "جديد":
            return "new";
        case "processing":
        case "قيد المعالجة":
            return "processing";
        case "ready_for_shipping":
        case "ready-for-shipping":
        case "قيد الشحن":
        case "جاهز للشحن":
            return "ready_for_shipping";
        case "cancelled":
        case "ملغى":
        case "ملغي":
            return "cancelled";
        default:
            return null;
    }
}

console.log("🚀 Testing normalizeSellerStatusKey with Unified Codes & Labels...\n");

const testCases = [
    // Standard Legacy (Should Pass)
    { input: "new", expected: "new" },
    { input: "جديد", expected: "new" },

    // Unified Codes (Likely Fail)
    { input: ORDER_STATUS_CODES.AT_SELLER_NEW, expected: "new" },
    { input: ORDER_STATUS_CODES.AT_SELLER_PROCESSING, expected: "processing" },

    // Unified Arabic Labels (Likely Fail)
    { input: ORDER_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_NEW], expected: "new" }, // "عند البائع طلب جديد"
    { input: ORDER_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_PROCESSING], expected: "processing" }, // "عند البائع قيد المعالجة"
];

let failures = 0;

testCases.forEach(t => {
    const result = normalizeSellerStatusKey(t.input);
    const passed = result === t.expected;
    const icon = passed ? "✅" : "❌";

    console.log(`${icon} Input: "${t.input}" -> Output: "${result}" (Expected: "${t.expected}")`);

    if (!passed) failures++;
});

if (failures > 0) {
    console.log(`\n⚠️  Found ${failures} failures. valid inputs are being rejected!`);
    process.exit(1); // Fail
} else {
    console.log("\n🎉 All normalizations passed!");
    process.exit(0);
}
