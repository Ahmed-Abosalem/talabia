
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

async function debugSettings() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB");

        const settings = await SystemSettings.findOne({ key: 'payment_settings' });
        if (!settings) {
            console.log("❌ No payment_settings document found.");
        } else {
            console.log("📄 Current Payment Settings in DB:");
            console.log(JSON.stringify(settings.value, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

debugSettings();
