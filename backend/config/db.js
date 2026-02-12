// ────────────────────────────────────────────────
// 📁 backend/config/db.js
// إعداد الاتصال بقاعدة بيانات MongoDB (Production Ready)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri || typeof uri !== "string") {
      console.error("❌ MONGO_URI غير موجود في البيئة (ENV).");
      process.exit(1);
    }

    // ✅ Mongoose 7+ لا يحتاج useNewUrlParser/useUnifiedTopology
    const conn = await mongoose.connect(uri);

    console.log(`✅ تم الاتصال بقاعدة البيانات: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
