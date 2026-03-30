import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    isActive: Boolean
});
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const roles = ['buyer', 'seller', 'shipper', 'admin'];
        for (const role of roles) {
            const user = await User.findOne({ role }).select('name email role isActive');
            if (user) {
                console.log(`[${role.toUpperCase()}] Name: ${user.name} | Email: ${user.email} | Active: ${user.isActive}`);
            } else {
                console.log(`[${role.toUpperCase()}] No user found`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
