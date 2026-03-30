
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Store from './models/Store.js';
import SystemSettings from './models/SystemSettings.js';
// Category NOT imported to test global registration issue
import { getProductRecommendations } from './controllers/productController.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/talabia';

async function diagnose() {
    console.log('--- Recommendation Engine (No-Category-Import) Diagnostic ---');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const product = await Product.findOne({ isActive: true });
        if (!product) {
            process.exit(1);
        }

        const req = { params: { id: product._id.toString() }, headers: {} };
        const res = {
            status: function (code) {
                console.log(`HTTP Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log('Data Received:', data.message || 'SUCCESS');
                process.exit(0);
            }
        };

        await getProductRecommendations(req, res);

    } catch (err) {
        console.error('💥 CRASHED:', err.message);
        process.exit(1);
    }
}

diagnose();
