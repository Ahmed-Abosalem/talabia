/*
  📁 backend/scripts/e2e_simulation.js
  🎯 Talabia Production System Simulation (Phase 7)
  ------------------------------------------------
  This script simulates a full transactional lifecycle:
  1. Buyer A purchases products from Seller A and Seller B.
  2. Order is created and paid via Wallet.
  3. Order is processed and delivered by Shipping Company.
  4. Final financial reconciliation (Commission check).
*/

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import ShippingCompany from '../models/ShippingCompany.js';
import { registerFinancialTransactionsForDeliveredOrder } from '../utils/financialTransactions.js';
import { ORDER_STATUS_CODES } from '../utils/orderStatus.js';

dotenv.config();

async function runSimulation() {
  console.log('🚀 Starting Phase 7 E2E Simulation...');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Identify Personas
    const buyer = await User.findOne({ email: 'v7_sim_buyer_a@test.com' });
    const sellerA = await User.findOne({ email: 'v7_sim_seller_a@test.com' });
    const sellerB = await User.findOne({ email: 'v7_sim_seller_b@test.com' });
    const shipping = await ShippingCompany.findOne({ name: /Shipping/i }) || { _id: new mongoose.Types.ObjectId() };

    if (!buyer || !sellerA || !sellerB) {
      console.log('🔍 Debug Auth Status:');
      console.log(`Buyer Found: ${!!buyer}`);
      console.log(`Seller A Found: ${!!sellerA}`);
      console.log(`Seller B Found: ${!!sellerB}`);
      throw new Error('Missing simulation personas. Please run setup first.');
    }

    console.log('🔍 Searching for Products:');
    console.log(`Seller A ID: ${sellerA._id}`);
    console.log(`Seller B ID: ${sellerB._id}`);

    // Identify Products
    const prodA = await Product.findOne({ name: /Premium Oudh/i, seller: sellerA._id });
    const prodB = await Product.findOne({ name: /Modern Ceramic/i, seller: sellerB._id });

    if (!prodA || !prodB) {
      console.log(`Product A Found: ${!!prodA}`);
      if (!prodA) {
          const anyA = await Product.findOne({ name: /Premium Oudh/i });
          console.log(`Product A name-only match: ${anyA ? anyA.name : 'NONE'}`);
          console.log(`Product A seller in DB: ${anyA ? anyA.seller : 'N/A'}`);
      }
      console.log(`Product B Found: ${!!prodB}`);
      if (!prodB) {
          const anyB = await Product.findOne({ name: /Modern Ceramic/i });
          console.log(`Product B name-only match: ${anyB ? anyB.name : 'NONE'}`);
          console.log(`Product B seller in DB: ${anyB ? anyB.seller : 'N/A'}`);
      }
      throw new Error('Test products not found.');
    }

    console.log(`🛒 Buyer: ${buyer.email} (Wallet Balance check...)`);
    const buyerWallet = await Wallet.findOne({ buyer: buyer._id });
    console.log(`💰 Current Balance: ${buyerWallet?.balance || 0} SAR`);

    // 2. Create Multi-Seller Order (Simulated Cart Result)
    const orderData = {
      buyer: buyer._id,
      seller: sellerA._id, // Top-level seller (First one)
      store: prodA.store,
      orderItems: [
        {
          product: prodA._id,
          name: prodA.name,
          qty: 1,
          price: prodA.price,
          seller: sellerA._id,
          store: prodA.store,
          deliveryCode: '111111',
          statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW
        },
        {
          product: prodB._id,
          name: prodB.name,
          qty: 1,
          price: prodB.price,
          seller: sellerB._id,
          store: prodB.store,
          deliveryCode: '222222',
          statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW
        }
      ],
      shippingAddress: {
        fullName: 'V7 Test User',
        phone: '0501234567',
        city: 'Riyadh',
        street: 'Main St',
        details: 'Home'
      },
      paymentMethod: 'Wallet',
      totalPrice: prodA.price + prodB.price + 20, // 20 shipping
      shippingPrice: 20,
      isPaid: true,
      paidAt: new Date(),
      shippingCompany: shipping._id,
      status: 'جديد',
      statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW
    };

    const order = await Order.create(orderData);
    console.log(`📦 Order Created: ${order._id} (Total: ${order.totalPrice} SAR)`);

    // 3. Deduct Wallet Balance
    await Wallet.updateOne({ buyer: buyer._id }, { $inc: { balance: -order.totalPrice } });
    console.log('💳 Wallet Deducted.');

    // 4. Lifecycle Simulation (Transitions)
    console.log('🔄 Transitioning Order to DELIVERED...');
    order.status = 'مكتمل';
    order.statusCode = ORDER_STATUS_CODES.DELIVERED;
    order.deliveredAt = new Date();
    // Mark all items as delivered
    order.orderItems.forEach(item => {
        item.statusCode = ORDER_STATUS_CODES.DELIVERED;
        item.deliveredAt = new Date();
    });
    await order.save();

    // 5. Trigger Financial Settlement
    console.log('💎 Triggering Financial Transactions...');
    await registerFinancialTransactionsForDeliveredOrder(order._id);

    // 6. Audit Results
    console.log('\n--- 📊 FINAL AUDIT ---');
    const finalBuyerWallet = await Wallet.findOne({ buyer: buyer._id });
    console.log(`Buyer Remaining Balance: ${finalBuyerWallet.balance} SAR`);

    const sellerA_Wallet = await Wallet.findOne({ buyer: sellerA._id }); // Assuming seller also has a wallet record
    const sellerB_Wallet = await Wallet.findOne({ buyer: sellerB._id });
    
    // Check Transaction documents
    const txA = await Transaction.findOne({ order: order._id, store: prodA.store, type: 'ORDER_EARNING_SELLER' });
    const txB = await Transaction.findOne({ order: order._id, store: prodB.store, type: 'ORDER_EARNING_SELLER' });
    const txPlatform = await Transaction.findOne({ order: order._id, type: 'ORDER_EARNING_PLATFORM' });

    console.log(`Seller A Earning: ${txA?.amount || 0} SAR (Ref: ${txA?.store})`);
    console.log(`Seller B Earning: ${txB?.amount || 0} SAR (Ref: ${txB?.store})`);
    console.log(`Platform Commission: ${txPlatform?.amount || 0} SAR`);

    if (txA && txB && txPlatform) {
      console.log('\n✅ SIMULATION SUCCESS: Multi-seller split confirmed.');
    } else {
      console.log('\n❌ SIMULATION WARNING: Missing some transaction records.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Simulation Error:', err);
    process.exit(1);
  }
}

runSimulation();
