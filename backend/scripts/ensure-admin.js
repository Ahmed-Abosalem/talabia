
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function log(msg) {
    console.log(`[ADMIN SETUP] ${msg}`);
}

async function ensureAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log("Connected to DB");

        const email = "admin@talabia.com";
        const password = "Admin12345";

        // Check if exists
        let user = await User.findOne({ email });

        if (user) {
            log("Admin user found. Updating password...");
            // Set password as raw string. 
            // The User model's pre-save hook in backend/models/User.js 
            // will detect the modification and hash it correctly.
            user.password = password;
            user.isAdmin = true;
            user.role = "admin";
            await user.save();
            log("✅ Admin password reset via Mongoose hook.");
        } else {
            log("Admin user not found. Creating...");
            // Create directly using raw password. 
            // User.create also triggers pre-save hooks.
            user = await User.create({
                name: "Admin User",
                email,
                password: password,
                isAdmin: true,
                role: "admin"
            });
            log("✅ Admin user created via Mongoose hook.");
        }

        process.exit(0);
    } catch (e) {
        log(`❌ Error: ${e.message}`);
        console.error(e);
        process.exit(1);
    }
}

ensureAdmin();
