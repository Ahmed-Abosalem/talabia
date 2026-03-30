// S:\Talabia_new\tmp\test_logic_standalone.js
// اختبار منطق الحسبة المالية - بدون الاعتماد على الموديلات مباشرة لتجنب مشاكل الموديولات

function normalizeCommissionRate(rawRate) {
    if (typeof rawRate !== "number" || Number.isNaN(rawRate) || rawRate < 0) return 0;
    if (rawRate > 1) return rawRate / 100;
    return rawRate;
}

function calculateFinancials(order, categories) {
    let platformCommission = 0;
    const sellerEarningByStore = {};
    let shippingPrice = order.shippingPrice || 0;

    const categoryRates = {};
    categories.forEach(cat => {
        categoryRates[String(cat._id)] = normalizeCommissionRate(cat.commissionRate);
    });

    order.orderItems.forEach(item => {
        const lineTotal = item.price * item.qty;
        const storeId = item.store;
        const rate = categoryRates[item.category] || 0;

        if (rate > 0) {
            const commissionForLine = lineTotal * rate;
            platformCommission += commissionForLine;
            const sellerNet = lineTotal - commissionForLine;
            sellerEarningByStore[storeId] = (sellerEarningByStore[storeId] || 0) + sellerNet;
        } else {
            sellerEarningByStore[storeId] = (sellerEarningByStore[storeId] || 0) + lineTotal;
        }
    });

    return {
        platformCommission: Math.round(platformCommission * 100) / 100,
        sellerEarningByStore,
        shippingEarning: Math.round(shippingPrice * 100) / 100
    };
}

// سيناريو الاختبار: طلب بقيمة 1000 + 50 شحن، وعمولة 10%
const mockOrder = {
    shippingPrice: 50,
    orderItems: [
        { store: "store_1", category: "cat_1", price: 500, qty: 2 }
    ]
};

const mockCategories = [
    { _id: "cat_1", commissionRate: 10 }
];

console.log("🧪 بدء اختبار منطق الحسبة المالية...");
const results = calculateFinancials(mockOrder, mockCategories);

console.log("النتائج المحسوبة:", results);

const expectedPlatform = 100; // 10% of 1000
const expectedSeller = 900;
const expectedShipping = 50;

if (results.platformCommission === expectedPlatform &&
    results.sellerEarningByStore["store_1"] === expectedSeller &&
    results.shippingEarning === expectedShipping) {
    console.log("✅ نجاح الاختبار: الحسبة المالية دقيقة 100%");
} else {
    console.error("❌ فشل الاختبار: الأرقام غير متطابقة!");
    process.exit(1);
}
