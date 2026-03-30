import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function syncPasswords() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = [
            'buylertest@gmail.com',
            'sellertest@gmail.com',
            'shopingtest@gmail.com',
            'admin@talabia.com'
        ];
        
        const newPassword = 'Talabia123456';
        
        for (const email of users) {
            const user = await User.findOne({ email });
            if (user) {
                user.password = newPassword;
                await user.save();
                console.log(`✅ Password updated for: ${email}`);
            } else {
                console.log(`❌ User not found: ${email}`);
            }
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

syncPasswords();
