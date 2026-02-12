// backend/createAdmin.js
// سكربت لمرة واحدة لإنشاء حساب أدمن في نظام طلبية

import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config();

async function createAdmin() {
  try {
    // الاتصال بقاعدة البيانات
    await connectDB();

    const email = "admin@talabia.com"; // يمكنك تغييره لما تريد
    const password = "Admin12345";     // غيّرها لاحقًا لكلمة قوية تحفظها
    const name = "مدير طلبية";

    // هل يوجد أدمن بهذا الإيميل مسبقًا؟
    const existing = await User.findOne({ email });

    if (existing) {
      console.log("❗ يوجد مستخدم بهذا البريد الإلكتروني بالفعل:");
      console.log(`   ${existing.email} (role: ${existing.role})`);
      process.exit(0);
    }

    // إنشاء الأدمن
    const admin = await User.create({
      name,
      email,
      password,      // سيتم تشفيرها تلقائيًا عن طريق الـ pre('save')
      role: "admin", // مهم جدًا: من enum ['admin','seller','buyer','shipper']
      phone: "",
      address: "",
    });

    console.log("✅ تم إنشاء حساب الأدمن بنجاح:");
    console.log(`   البريد: ${admin.email}`);
    console.log(`   الدور:  ${admin.role}`);
    console.log("❗ تذكّر تغيير كلمة المرور لاحقًا من داخل النظام إن أحببت.");
    process.exit(0);
  } catch (err) {
    console.error("❌ حدث خطأ أثناء إنشاء الأدمن:");
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
