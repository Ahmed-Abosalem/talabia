import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const ACCOUNTS = [
  {
    oldEmails: ["admin@talabia.com"],
    email: "admin@talabia.com",
    name: "مدير النظام",
    role: "admin",
    password: "Aa123456",
    isOwner: true
  },
  {
    oldEmails: ["buylertest@gmail.com", "buyer@talabia.com"], // Typo fix
    email: "buyer@talabia.com",
    name: "مشتري تجريبي",
    role: "buyer",
    password: "Aa123456"
  },
  {
    oldEmails: ["sellertest@gmail.com", "seller@talabia.com"],
    email: "seller@talabia.com",
    name: "بائع تجريبي",
    role: "seller",
    password: "Aa123456"
  },
  {
    oldEmails: ["shopingtest@gmail.com", "shipping@talabia.com"], // Typo fix
    email: "shipping@talabia.com",
    name: "شركة شحن تجريبية",
    role: "shipper",
    password: "Aa123456"
  }
];

async function resetAll() {
  try {
    await connectDB();
    console.log("--- STARTING MASTER RESET ---");

    for (const acc of ACCOUNTS) {
      // Find the user by any of the old emails or the new email
      const user = await User.findOne({ email: { $in: [...acc.oldEmails, acc.email] } });

      if (user) {
        console.log(`Updating existing user: ${user.email} -> ${acc.email}`);
        user.email = acc.email;
        user.password = acc.password;
        user.name = acc.name;
        user.role = acc.role;
        if (acc.isOwner) user.isOwner = true;
        await user.save();
        console.log(`✅ ${acc.role} updated successfully.`);
      } else {
        console.log(`Creating NEW user: ${acc.email}`);
        await User.create({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: acc.role,
          isOwner: acc.isOwner || false
        });
        console.log(`✅ ${acc.role} created successfully.`);
      }
    }

    console.log("\n--- MASTER RESET COMPLETE ---");
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset Failed:", err.message);
    process.exit(1);
  }
}

resetAll();
