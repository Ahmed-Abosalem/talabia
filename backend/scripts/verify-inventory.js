import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

// Load environment variables
dotenv.config();

// Mongoose Models
const productSchema = new mongoose.Schema({
  name: String,
  isActive: Boolean,
  status: String,
  adminLocked: Boolean,
  stock: Number,
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { strict: false });

const storeSchema = new mongoose.Schema({
  status: String,
  visibility: String
}, { strict: false });

const userSchema = new mongoose.Schema({
  isActive: Boolean
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function inspectInventory() {
  await connectDB();
  
  const allProducts = await Product.find({}).populate('store').populate('seller').lean();
  console.log(`\n📊 Total Products in DB: ${allProducts.length}`);
  
  const stats = {
    activeOnStorefront: 0,
    blockedByAdmin: 0,
    outOfStock: 0,
    storeSuspended: 0,
    sellerSuspended: 0,
    inactiveSellerToggle: 0
  };

  const hiddenProductsList = [];

  allProducts.forEach(p => {
    let hideReason = null;

    // 1. Admin Block
    if (p.adminLocked || p.status === 'inactive') {
      stats.blockedByAdmin++;
      hideReason = "Admin Locked / Status Inactive";
    } 
    // 2. Seller toggled isAcive to false
    else if (p.isActive === false) {
      stats.inactiveSellerToggle++;
      hideReason = "Product Deactivated by Seller (isActive=false)";
    }
    // 3. Out of Stock
    else if (p.stock === undefined || p.stock <= 0) {
      stats.outOfStock++;
      hideReason = `Out of Stock (stock: ${p.stock})`;
    }
    // 4. Store is suspended/pending
    else if (p.store && p.store.status !== 'approved') {
      stats.storeSuspended++;
      hideReason = `Store not approved (Status: ${p.store.status})`;
    }
    else if (p.store && p.store.visibility === 'hidden') {
      stats.storeSuspended++;
      hideReason = `Store is hidden`;
    }
    // 5. Seller Account suspended
    else if (p.seller && p.seller.isActive === false) {
      stats.sellerSuspended++;
      hideReason = `Seller Account Suspended`;
    }
    // 6. Active
    else {
      stats.activeOnStorefront++;
    }

    if (hideReason) {
      hiddenProductsList.push({ name: p.name, reason: hideReason, stock: p.stock });
    }
  });

  console.log("\n📈 Breakdown of all 29 items:");
  console.log(`- Showing on Storefront (Active): ${stats.activeOnStorefront}`);
  console.log(`- Blocked by Admin: ${stats.blockedByAdmin}`);
  console.log(`- Out of Stock (Hidden from buyers): ${stats.outOfStock}`);
  console.log(`- Product Deactivated by Seller: ${stats.inactiveSellerToggle}`);
  console.log(`- Store Suspended/Pending: ${stats.storeSuspended}`);
  console.log(`- Seller Suspended: ${stats.sellerSuspended}`);

  console.log("\n🔍 Sample of Hidden Products:");
  hiddenProductsList.slice(0, 15).forEach(hp => {
    console.log(`  > "${hp.name}" -> Reason: ${hp.reason}`);
  });

  console.log("\n🔍 Investigating 'فاكهة':");
  const fruit = allProducts.find(p => p.name.includes("فاكهة"));
  console.log(fruit ? JSON.stringify(fruit, null, 2) : "Not found!");

  process.exit(0);
}

inspectInventory().catch(err => {
  console.error(err);
  process.exit(1);
});
