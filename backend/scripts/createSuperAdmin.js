// backend/scripts/createSuperAdmin.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// User Schema (simplified version)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: {
        type: String,
        enum: ["buyer", "seller", "shipping", "admin"],
        default: "buyer",
    },
    isOwner: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function createSuperAdmin() {
    try {
        // Connect to MongoDB
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: "admin@talabia.com" });

        if (existingAdmin) {
            console.log("⚠️  Admin user already exists!");
            console.log("📧 Email:", existingAdmin.email);
            console.log("👤 Name:", existingAdmin.name);
            console.log("🔑 Role:", existingAdmin.role);
            console.log("👑 Is Owner:", existingAdmin.isOwner);

            // Update password if needed
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("Admin123456", salt);
            existingAdmin.password = hashedPassword;
            existingAdmin.isOwner = true;
            existingAdmin.role = "admin";
            existingAdmin.isActive = true;
            await existingAdmin.save();
            console.log("✅ Admin password updated successfully!");
        } else {
            // Create new admin
            console.log("🔨 Creating Super Admin...");

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("Admin123456", salt);

            const superAdmin = new User({
                name: "Super Admin",
                email: "admin@talabia.com",
                password: hashedPassword,
                phone: "+90 555 000 0000",
                role: "admin",
                isOwner: true,
                isActive: true,
            });

            await superAdmin.save();
            console.log("✅ Super Admin created successfully!");
            console.log("📧 Email: admin@talabia.com");
            console.log("🔑 Password: Admin123456");
            console.log("👑 Is Owner: true");
        }

        // Disconnect
        await mongoose.disconnect();
        console.log("👋 Disconnected from MongoDB");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

createSuperAdmin();
