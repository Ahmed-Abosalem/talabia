import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const ProductSchema = new mongoose.Schema({
    name: String,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    storeName: String,
    price: Number,
    stock: Number
});

const UserSchema = new mongoose.Schema({
    name: String,
    role: String,
    storeName: String
});

const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const products = await Product.find().limit(10).populate('seller');
        console.log('--- Sample Products ---');
        products.forEach(p => {
            console.log(`ID: ${p._id} | Name: ${p.name} | Seller: ${p.seller?.name} (${p.seller?._id}) | Store: ${p.storeName}`);
        });

        const sellers = await User.find({ role: 'seller' }).limit(10);
        console.log('\n--- Sample Sellers ---');
        sellers.forEach(s => {
            console.log(`ID: ${s._id} | Name: ${s.name} | Store: ${s.storeName}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
