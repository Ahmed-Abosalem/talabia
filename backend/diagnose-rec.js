
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Store from './models/Store.js';
import Category from './models/Category.js';
import SystemSettings from './models/SystemSettings.js';
import { getProductRecommendations } from './controllers/productController.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/talabia';

async function diagnose() {
    console.log('--- Recommendation Engine Batch Diagnostic ---');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const products = await Product.find({ isActive: true }).limit(50);
        console.log(`🔍 Testing for ${products.length} Products...`);

        for (const product of products) {
            const req = { params: { id: product._id.toString() }, headers: {} };
            let hasError = false;
            const res = {
                status: function (code) {
                    if (code >= 400) {
                        hasError = true;
                        console.log(`\n❌ ERROR for ${product.name} (${product._id}): Status ${code}`);
                    }
                    this.statusCode = code;
                    return this;
                },
                json: function (data) {
                    if (hasError) {
                        console.log(`🔥 Error Body: ${JSON.stringify(data)}`);
                    } else {
                        process.stdout.write('.'); // Success dot
                    }
                }
            };

            try {
                await getProductRecommendations(req, res);
            } catch (err) {
                console.error(`\n💥 CRASH for ${product.name} (${product._id}):`, err);
            }
        }
        console.log('\n--- Diagnosis Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('💥 Setup Crashed:', err);
        process.exit(1);
    }
}

diagnose();
