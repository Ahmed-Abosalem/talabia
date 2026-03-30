
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

async function forceDisable() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB");

        const doc = await SystemSettings.findOne({ key: 'payment_settings' });
        if (doc) {
            doc.value.cod.enabled = false;
            doc.markModified('value');
            await doc.save();
            console.log("✅ COD forced to DISABLED in DB.");
        } else {
            console.log("❌ Document not found.");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

forceDisable();
