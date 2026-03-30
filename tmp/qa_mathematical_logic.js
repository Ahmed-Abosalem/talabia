// S:\Talabia_new\tmp\qa_mathematical_logic.js
// اختبار النزاهة المحاسبية - الجزء الأول من خطة QA الشاملة

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

// 🧪 السيناريو 1: طلب متعدد البائعين بعمولات مختلفة
// بائع 1: 500 ريال (10% عمولة) => ربح 450، منصة 50
// بائع 2: 300 ريال (5% عمولة) => ربح 285، منصة 15
// بائع 3: 200 ريال (بدون عمولة) => ربح 200، منصة 0
// شحن: 50 ريال

const multiSellerOrder = {
    shippingPrice: 50,
    orderItems: [
        { store: "store_1", category: "cat_10", price: 500, qty: 1 },
        { store: "store_2", category: "cat_5", price: 150, qty: 2 },
        { store: "store_3", category: "cat_0", price: 200, qty: 1 }
    ]
};

const categories = [
    { _id: "cat_10", commissionRate: 10 },
    { _id: "cat_5", commissionRate: 5 },
    { _id: "cat_0", commissionRate: 0 }
];

console.log("🚀 بدء اختبار تعدد البائعين والعمولات المتغيرة...");
const res = calculateFinancials(multiSellerOrder, categories);
console.log("النتائج:", JSON.stringify(res, null, 2));

const expectedPlatform = 65; // 50 + 15
const expectedSeller1 = 450;
const expectedSeller2 = 285;
const expectedSeller3 = 200;
const expectedShipping = 50;

let passed = true;
if (res.platformCommission !== expectedPlatform) { passed = false; console.error("❌ خطأ في عمولة المنصة"); }
if (res.sellerEarningByStore["store_1"] !== expectedSeller1) { passed = false; console.error("❌ خطأ في ربح بائع 1"); }
if (res.sellerEarningByStore["store_2"] !== expectedSeller2) { passed = false; console.error("❌ خطأ في ربح بائع 2"); }
if (res.sellerEarningByStore["store_3"] !== expectedSeller3) { passed = false; console.error("❌ خطأ في ربح بائع 3"); }
if (res.shippingEarning !== expectedShipping) { passed = false; console.error("❌ خطأ في رسوم الشحن"); }

if (passed) {
    console.log("✅ نجاح باهر: توزيع المبالغ دقيق 100% في سيناريو الـ Multi-Seller.");
} else {
    process.exit(1);
}
