import mongoose from "mongoose";
import "dotenv/config";
import User from "./models/User.js";

const email = "admin@talabia.com";

await mongoose.connect(process.env.MONGODB_URI);

// اقرأ حقول السكيمة لمعرفة مسارات الصلاحيات (permissions.*)
const permissionPaths = Object.entries(User.schema.paths)
  .filter(([path, schemaType]) =>
    path.startsWith("permissions.") && schemaType.instance === "Boolean"
  )
  .map(([path]) => path);

const setObj = {};

// اجعل كل صلاحية Boolean داخل permissions = true
for (const p of permissionPaths) setObj[p] = true;

// إن كانت هناك أعلام شائعة للأدمن/السوبر أدمن، فعّلها (إذا كانت موجودة في السكيمة)
for (const flag of ["isAdmin", "isSuperAdmin", "superAdmin"]) {
  if (User.schema.paths[flag]) setObj[flag] = true;
}

// لو لا يوجد permissions.* في المشروع، سنطبع تحذير
if (permissionPaths.length === 0) {
  console.log("⚠️ لم أجد permissions.* في User schema. قد يكون نظام الصلاحيات في Collection أخرى.");
}

const res = await User.updateOne({ email }, { $set: setObj });

console.log("✅ Updated:", res.modifiedCount, "document(s)");
console.log("✅ Permissions paths updated:", permissionPaths.length);

await mongoose.disconnect();
