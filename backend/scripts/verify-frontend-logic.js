
/**
 * Mock data representing the raw API response
 */
const mockRawData = [
    {
        _id: "698e3c1b63cb3f35548169e2",
        createdAt: "2026-02-21T10:00:00.000Z",
        orderNumber: "ORD-12345",
        buyer: { name: "Ahmed User" },
        shippingAddress: { city: "Cairo" },
        paymentMethod: "COD",
        orderItems: [
            {
                _id: "item_1",
                product: { name: "Samsung Galaxy" },
                qty: 2,
                price: 100
            },
            null, // Test null item resilience
            {
                _id: "item_2",
                product: { name: "Broken Item" },
                // Purposefully missing name or price if needed
            }
        ]
    }
];

// Mock helper functions (simplified)
function formatDate(d) { return new Date(d).toLocaleDateString(); }
function buildProductImageUrl(img) { return `/uploads/${img}`; }
function normalizeOrderStatusCode() { return "ready_to_ship"; }
function mapUnifiedStatusCodeToVisualKey() { return "pending"; }

/**
 * 🛠️ Copied Refactored Helper
 */
function normalizeShippingOrderItem({ item, order, orderId, orderNumber, idx, dateFormatted, createdAtDate, orderShippingStatusRaw, baseStatus }) {
    const itemId = item._id || item.id;
    const itemStatusRaw = item.status || baseStatus;
    const rawStatusText = (itemStatusRaw || "").toString();

    const unifiedStatusCode = "AT_SELLER_READY_TO_SHIP";
    const visualStatusKey = "pending";

    const qty = item.qty || item.quantity || 1;
    const unitPrice = item.price || 0;
    const total = unitPrice * qty;

    const storeName = item.store?.name || order.store?.name || "—";
    const productName = item.name || item.productName || item.product?.name || "منتج";

    return {
        id: `${orderNumber}-${idx + 1}`,
        orderId,
        itemId,
        orderNumber,
        date: dateFormatted,
        createdAt: createdAtDate,
        productName,
        total,
        // ... other fields simplified for test
    };
}

/**
 * 🛠️ Copied Refactored Main Function
 */
function normalizeShippingOrdersFromApi(raw) {
    if (!Array.isArray(raw)) return [];
    const shipments = [];

    raw.forEach((order) => {
        if (!order) return;
        try {
            const orderId = order._id || order.id;
            const createdAt = order.createdAt || order.created_at || order.date;
            const dateFormatted = createdAt ? formatDate(createdAt) : (order.date || "");

            let createdAtDate = null; // ✅ The Fix
            if (createdAt) {
                const d = new Date(createdAt);
                if (!Number.isNaN(d.getTime())) {
                    createdAtDate = d;
                }
            }

            const baseStatus = order.status || "processing";
            const orderNumber = order.orderNumber || (orderId ? String(orderId).slice(-6) : "—");
            const items = order.orderItems || order.items || [];
            const orderShippingStatusRaw = order.shippingStatus || null;

            items.forEach((item, idx) => {
                if (!item) return;
                try {
                    const normalized = normalizeShippingOrderItem({
                        item, order, orderId, orderNumber, idx, dateFormatted, createdAtDate, orderShippingStatusRaw, baseStatus
                    });
                    shipments.push(normalized);
                } catch (itemErr) {
                    console.error(`❌ Item Error:`, itemErr.message);
                }
            });
        } catch (orderErr) {
            console.error(`❌ Order Error:`, orderErr.message);
        }
    });

    return shipments;
}

// Run Test
console.log("🚀 Running Normalization Logic Test...");
try {
    const results = normalizeShippingOrdersFromApi(mockRawData);
    console.log(`✅ Success! Produced ${results.length} shipments.`);
    console.log("Sample Result:", JSON.stringify(results[0], null, 2));
} catch (err) {
    console.error("💥 TEST FAILED:", err);
}
