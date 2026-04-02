import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "./models/Category.js";
import Product from "./models/Product.js";

dotenv.config();

async function check() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is missing");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ DB Connected");

    const categoryCount = await Category.countDocuments();
    const productCount = await Product.countDocuments();

    console.log("📊 Categories Count:", categoryCount);
    console.log("📊 Products Count:", productCount);

    if (categoryCount === 0) {
      console.warn("⚠️  WARNING: No categories found!");
    }
    if (productCount === 0) {
      console.warn("⚠️  WARNING: No products found!");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  }
}

check();
