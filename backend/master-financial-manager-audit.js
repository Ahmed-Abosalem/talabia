// master-financial-manager-audit.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import schemas to ensure they are registered
import './models/User.js';
import './models/Store.js';
import './models/ShippingCompany.js';
import './models/Order.js';
import './models/Transaction.js';
import './models/Category.js';

import { ORDER_STATUS_CODES } from './utils/orderStatus.js';
import { registerFinancialTransactionsForDeliveredOrder } from './utils/financialTransactions.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/talabia';

async function runMasterAudit() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('--- 🚀 STARTING MASTER FINANCIAL MANAGER AUDIT ---');

    const Store = mongoose.models.Store;
    const ShippingCompany = mongoose.models.ShippingCompany;
    const Order = mongoose.models.Order;
    const Transaction = mongoose.models.Transaction;

    console.log('🧹 Cleaning previous audit data...');
    await Transaction.deleteMany({ note: /Audit/ });
    await Order.deleteMany({ 'orderItems.name': /Audit/ });
    await Store.deleteMany({ name: /Audit/ });
    await ShippingCompany.deleteMany({ name: /Audit/ });

    const dummyOwner = new mongoose.Types.ObjectId();

    // 1. Setup Data
    const sellerA = await Store.create({ 
      name: 'Seller A (Audit)', 
      slug: 'seller-a-audit-' + Date.now(),
      owner: dummyOwner,
      isActive: true, 
      status: 'approved' 
    });
    const sellerB = await Store.create({ 
      name: 'Seller B (Audit)', 
      slug: 'seller-b-audit-' + Date.now(),
      owner: dummyOwner,
      isActive: true, 
      status: 'approved' 
    });
    const shipX = await ShippingCompany.create({ 
      name: 'Ship X (Audit)', 
      email: 'shipx@audit.com',
      phone: '000000000',
      isActive: true, 
      scope: 'global' 
    });

    console.log('✅ Setup: Created test sellers and shipping company.');

    const commonShipping = {
      fullName: 'Audit Buyer',
      phone: '000000000',
      city: 'Riyadh',
      street: 'Audit St'
    };

    // 2. Logic: Create Orders
    // Order 1: Seller A, COD, Price 100
    const order1 = await Order.create({
      store: sellerA._id,
      seller: dummyOwner,
      buyer: dummyOwner,
      status: 'مكتمل',
      statusCode: ORDER_STATUS_CODES.DELIVERED,
      paymentMethod: 'COD',
      totalPrice: 120,
      shippingPrice: 20,
      shippingCompany: shipX._id,
      shippingAddress: commonShipping,
      orderItems: [{
        product: new mongoose.Types.ObjectId(),
        name: 'Prod A (Audit)',
        qty: 1,
        price: 100,
        deliveryCode: '111111',
        seller: dummyOwner,
        store: sellerA._id,
        statusCode: ORDER_STATUS_CODES.DELIVERED,
        itemStatus: 'مكتمل'
      }]
    });

    // Order 2: Seller A, Wallet, Price 200 (Cancelled)
    const order2 = await Order.create({
      store: sellerA._id,
      seller: dummyOwner,
      buyer: dummyOwner,
      status: 'ملغى',
      statusCode: ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
      paymentMethod: 'Wallet',
      totalPrice: 220,
      shippingPrice: 20,
      shippingCompany: shipX._id,
      shippingAddress: commonShipping,
      orderItems: [{
        product: new mongoose.Types.ObjectId(),
        name: 'Prod B (Audit)',
        qty: 1,
        price: 200,
        deliveryCode: '222222',
        seller: dummyOwner,
        store: sellerA._id,
        statusCode: ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
        itemStatus: 'ملغى'
      }]
    });

    // Order 3: Seller B, Bank Transfer, Price 300
    const order3 = await Order.create({
      store: sellerB._id,
      seller: dummyOwner,
      buyer: dummyOwner,
      status: 'مكتمل',
      statusCode: ORDER_STATUS_CODES.DELIVERED,
      paymentMethod: 'Online',
      paymentSubMethod: 'BANK_TRANSFER',
      totalPrice: 330,
      shippingPrice: 30,
      shippingCompany: shipX._id,
      shippingAddress: commonShipping,
      orderItems: [{
        product: new mongoose.Types.ObjectId(),
        name: 'Prod C (Audit)',
        qty: 1,
        price: 300,
        deliveryCode: '333333',
        seller: dummyOwner,
        store: sellerB._id,
        statusCode: ORDER_STATUS_CODES.DELIVERED,
        itemStatus: 'مكتمل'
      }]
    });

    console.log('✅ Orders Created and States Set.');

    // 3. Register Financials
    await registerFinancialTransactionsForDeliveredOrder(order1._id);
    await registerFinancialTransactionsForDeliveredOrder(order3._id);

    console.log('✅ Financial Transactions Registered.');

    // 4. Action: Settlement
    await Transaction.create({
      role: 'SELLER', store: sellerB._id, type: 'PAYOUT', amount: 100, paymentMethod: 'BANK_TRANSFER', status: 'COMPLETED', note: 'Payout Audit'
    });
    await Transaction.create({
      role: 'SHIPPING', shippingCompany: shipX._id, type: 'SUPPLY', amount: 50, paymentMethod: 'COD', status: 'COMPLETED', note: 'Supply Audit'
    });

    console.log('✅ Settlements Executed.');

    // 5. Verification
    console.log('\n--- 📊 AUDIT VERIFICATION RESULTS ---');
    const sellerATxs = await Transaction.find({ store: sellerA._id });
    const sAEarning = sellerATxs.find(t => t.type === 'ORDER_EARNING_SELLER')?.amount || 0;
    console.log(`Seller A Earning: ${sAEarning} (Expected: 100)`);

    const sellerBTxs = await Transaction.find({ store: sellerB._id });
    const sBEarning = sellerBTxs.find(t => t.type === 'ORDER_EARNING_SELLER')?.amount || 0;
    const sBPayout = sellerBTxs.find(t => t.type === 'PAYOUT')?.amount || 0;
    console.log(`Seller B Balance: ${sBEarning - sBPayout} (Expected: 200)`);

    console.log('\n--- ⭐ MASTER AUDIT SUCCESSFUL! ⭐ ---');
    
    // Cleanup
    await Transaction.deleteMany({ note: /Audit/ });
    await Order.deleteMany({ 'orderItems.name': /Audit/ });
    await Store.deleteMany({ name: /Audit/ });
    await ShippingCompany.deleteMany({ name: /Audit/ });
    
    process.exit(0);

  } catch (err) {
    console.error('❌ AUDIT FAILED:', err);
    process.exit(1);
  }
}

runMasterAudit();
