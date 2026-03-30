import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
    name: String,
    role: String
});
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const shippers = await User.find({ role: 'shipper' }).limit(5);
        console.log('--- Sample Shippers ---');
        shippers.forEach(s => {
            console.log(`ID: ${s._id} | Name: ${s.name}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
