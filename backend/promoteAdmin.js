import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "./models/User.js";

// اقرأ MONGODB_URI من ملف .env يدويًا
const envPath = path.resolve(process.cwd(), ".env");
const envText = fs.readFileSync(envPath, "utf8");
const match = envText.match(/^MONGODB_URI\s*=\s*(.+)\s*$/m);

if (!match) {
  console.log("❌ لم أجد MONGODB_URI داخل .env");
  process.exit(1);
}

const MONGODB_URI = match[1].trim();
const email = "admin@talabia.com";

await mongoose.connect(MONGODB_URI);

const u = await User.findOne({ email });
if (!u) {
  console.log("❌ لم أجد مستخدم بهذا البريد:", email);
  process.exit(1);
}

const setObj = {};

// اجعل الدور admin
if (User.schema.paths.role) setObj["role"] = "admin";

// فعّل أعلام super admin إن كانت موجودة
for (const flag of ["isAdmin", "isSuperAdmin", "superAdmin"]) {
  if (User.schema.paths[flag]) setObj[flag] = true;
}

// فعّل أي boolean permissions موجودة داخل user (إن وجدت)
const boolPaths = Object.entries(User.schema.paths)
  .filter(([p, t]) => t.instance === "Boolean")
  .map(([p]) => p);

for (const p of boolPaths) {
  if (p.startsWith("permissions.") || p.startsWith("adminPermissions.") || p.startsWith("access.")) {
    setObj[p] = true;
  }
}

await User.updateOne({ email }, { $set: setObj });

console.log("✅ تم تحديث حساب الأدمن بنجاح");
console.log("✅ الحقول التي تم ضبطها:", Object.keys(setObj));

await mongoose.disconnect();
