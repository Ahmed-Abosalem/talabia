import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

// الاتصال المباشر بالقاعدة لمحاكاة دقيقة
await mongoose.connect(process.env.MONGO_URI);

const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));

async function runTest() {
  console.log("==================================================");
  console.log("🧠 محاكاة خوارزمية العصب التجاري (Hybrid Relevance)");
  console.log("الترتيب الافتراضي للصفحة الرئيسية (بدون فلاتر ولا بحث)");
  console.log("==================================================\n");

  const pipeline = [
    { $match: { stock: { $gt: 0 }, isActive: true } },
    {
      $addFields: {
        finalRelevance: {
          $add: [
            { $cond: ["$isFeatured", 10, 0] },
            { $multiply: [{ $ifNull: ["$featuredOrder", 0] }, -1] },
            { $multiply: [{ $log10: { $add: [{ $ifNull: ["$salesCount", 0] }, 1] } }, 2] },
            { $ifNull: ["$performanceScore", 0] }
          ]
        }
      }
    },
    { $sort: { finalRelevance: -1, createdAt: -1 } },
    { $limit: 10 }
  ];

  const results = await Product.aggregate(pipeline);

  if (results.length === 0) {
    console.log("❌ لا توجد منتجات نشطة في قاعدة البيانات الحالية.");
  }

  results.forEach((p, i) => {
    const isFeatured = p.isFeatured ? "⭐ نعم" : "❌ لا";
    const sales = p.salesCount || 0;
    const score = p.finalRelevance ? p.finalRelevance.toFixed(2) : "0.00";
    
    console.log(`#${i + 1} | النقاط الذكية: [${score}]`);
    console.log(`    المنتج: ${p.name}`);
    console.log(`    مميز: ${isFeatured} | المبيعات: ${sales}`);
    console.log("------------------------------------------");
  });

  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
