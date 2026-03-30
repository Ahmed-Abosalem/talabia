import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './backend/models/Product.js';
import connectDB from './backend/config/db.js';
import { searchProducts } from './backend/services/searchService.js';

dotenv.config();

async function diagnose() {
  try {
    await connectDB();
    
    const total = await Product.countDocuments();
    const outOfStock = await Product.find({ stock: 0 });
    const outOfStockActive = await Product.find({ stock: 0, isActive: true });
    
    console.log(`--- Product Stock Diagnosis ---`);
    console.log(`Total Products: ${total}`);
    console.log(`Out of Stock (stock: 0): ${outOfStock.length}`);
    console.log(`Out of Stock but Active (stock: 0, isActive: true): ${outOfStockActive.length}`);
    
    if (outOfStockActive.length > 0) {
      console.log(`\nSample Active Out-of-Stock Products:`);
      outOfStockActive.slice(0, 5).forEach(p => {
        console.log(`- ID: ${p._id}, Name: ${p.name}, isFeatured: ${p.isFeatured}, autoDeactivated: ${p.autoDeactivated}, status: ${p.status}`);
      });
    }

    // Check searchProducts result
    console.log(`\nChecking searchProducts results...`);
    const searchRes = await searchProducts({ limit: 100 });
    const visibleOutOfStock = searchRes.filter(p => p.stock === 0);
    console.log(`Visible via searchProducts (stock: 0): ${visibleOutOfStock.length}`);
    
    if (visibleOutOfStock.length > 0) {
       console.log(`Sample visible out-of-stock product details:`);
       console.log(JSON.stringify(visibleOutOfStock[0], null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnose();
