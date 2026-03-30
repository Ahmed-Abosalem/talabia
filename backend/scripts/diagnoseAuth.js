import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

async function diagnose() {
  await connectDB();
  const email = "admin@talabia.com";
  const pass = "Admin12345";

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    console.log("User not found: " + email);
    process.exit(0);
  }

  console.log("User found:", user.email);
  const storedHash = user.password;
  console.log("Stored Hash:", storedHash);

  const isMatchNormal = await bcrypt.compare(pass, storedHash);
  console.log("Match with 'Admin12345'?", isMatchNormal);

  // 🔥 Test Double Hashing Hypothesis:
  // Is the stored hash actually a hash of the previous hash?
  // Let's assume the previous hash was valid for 'Admin12345'.
  // If we can find what $2b$10$... was, we could test it.
  // Actually, we can check if the stored hash IS a valid bcrypt hash of ANOTHER bcrypt hash.
  // But we don't know the another hash.

  // Let's try to RESET the password to 'Admin12345' and see if it works now.
  // If it works after reset, then the previous hash was definitely wrong.
  
  console.log("--- RESETTING PASSWORD TO 'Admin12345' ---");
  user.password = pass; 
  await user.save(); // This triggers pre-save (hashing)
  
  const newUser = await User.findOne({ email }).select("+password");
  const newHash = newUser.password;
  console.log("New Hash after reset:", newHash);
  
  const isMatchAfterReset = await bcrypt.compare(pass, newHash);
  console.log("Match after reset with 'Admin12345'?", isMatchAfterReset);

  process.exit(0);
}

diagnose();
