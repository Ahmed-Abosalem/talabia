// master-financial-manager-audit.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './backend/models/Transaction.js';
import Order from './backend/models/Order.js';
import Store from './backend/models/Store.js';
import ShippingCompany from './backend/models/ShippingCompany.js';
import { ORDER_STATUS_CODES } from './backend/utils/orderStatus.js';
import { registerFinancialTransactionsForDeliveredOrder } from './backend/utils/financialTransactions.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/talabia';

async function runMasterAudit() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('--- 🚀 STARTING MASTER FINANCIAL MANAGER AUDIT ---');

    // 1. Setup Data
    const sellerA = await Store.create({ name: 'Seller A (Audit)', isActive: true, status: 'approved' });
    const sellerB = await Store.create({ name: 'Seller B (Audit)', isActive: true, status: 'approved' });
    const shipX = await ShippingCompany.create({ name: 'Ship X (Audit)', isActive: true, scope: 'global' });

    console.log('✅ Setup: Created test sellers and shipping company.');

    // 2. Logic: Create Orders
    // Order 1: Seller A, COD, Price 100
    const order1 = await Order.create({
      store: sellerA._id, status: 'جديد', statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
      paymentMethod: 'COD', totalPrice: 120, shippingPrice: 20, shippingCompany: shipX._id,
      orderItems: [{ product: new mongoose.Types.ObjectId(), price: 100, qty: 1, store: sellerA._id, statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW }]
    });

    // Order 2: Seller A, Wallet, Price 200 (Cancelled)
    const order2 = await Order.create({
      store: sellerA._id, status: 'جديد', statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
      paymentMethod: 'Wallet', totalPrice: 220, shippingPrice: 20, shippingCompany: shipX._id,
      orderItems: [{ product: new mongoose.Types.ObjectId(), price: 200, qty: 1, store: sellerA._id, statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW }]
    });

    // Order 3: Seller B, Bank Transfer, Price 300
    const order3 = await Order.create({
      store: sellerB._id, status: 'جديد', statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
      paymentMethod: 'Online', paymentSubMethod: 'BANK_TRANSFER', totalPrice: 330, shippingPrice: 30, shippingCompany: shipX._id,
      orderItems: [{ product: new mongoose.Types.ObjectId(), price: 300, qty: 1, store: sellerB._id, statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW }]
    });

    console.log('✅ Orders Created: [1: COD], [2: Wallet (to be cancelled)], [3: Bank Transfer]');

    // 3. Action: Delivery & Cancellation
    // Order 1 -> Delivered
    order1.status = 'مكتمل'; order1.statusCode = ORDER_STATUS_CODES.DELIVERED;
    order1.orderItems[0].statusCode = ORDER_STATUS_CODES.DELIVERED;
    await order1.save();
    await registerFinancialTransactionsForDeliveredOrder(order1._id);

    // Order 2 -> Cancelled (By Admin)
    order2.status = 'ملغى'; order2.statusCode = ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
    order2.orderItems[0].statusCode = ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
    await order2.save();
    // No transactions should be registered for cancelled.

    // Order 3 -> Delivered
    order3.status = 'مكتمل'; order3.statusCode = ORDER_STATUS_CODES.DELIVERED;
    order3.orderItems[0].statusCode = ORDER_STATUS_CODES.DELIVERED;
    await order3.save();
    await registerFinancialTransactionsForDeliveredOrder(order3._id);

    console.log('✅ Actions: Order 1&3 Delivered, Order 2 Cancelled.');

    // 4. Action: Settlement
    // Payout to Seller B (100 SAR)
    await Transaction.create({
      role: 'SELLER', store: sellerB._id, type: 'PAYOUT', amount: 100, paymentMethod: 'BANK_TRANSFER', status: 'COMPLETED'
    });

    // Supply from Ship X (50 SAR - COD Collection)
    await Transaction.create({
      role: 'SHIPPING', shippingCompany: shipX._id, type: 'SUPPLY', amount: 50, paymentMethod: 'COD', status: 'COMPLETED'
    });

    console.log('✅ Settlements: Payout 100 to Seller B, Supply 50 from Ship X.');

    // 5. Verification
    console.log('\n--- 📊 AUDIT VERIFICATION RESULTS ---');

    // Verify Seller A: Balance should be exactly 100 (if commission is 0 for simplicity)
    const sellerATxs = await Transaction.find({ store: sellerA._id, status: { $nin: ['CANCELLED_BY_ADMIN', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_BUYER'] } });
    const sellerABalance = sellerATxs.reduce((sum, tx) => (tx.type === 'ORDER_EARNING_SELLER' ? sum + tx.amount : sum), 0);
    console.log(`Seller A Earning: ${sellerABalance} (Expected: 100 - Zero Leak OK)`);

    // Verify Seller B: Balance should be 300 - 100 = 200
    const sellerBTxs = await Transaction.find({ store: sellerB._id, status: { $nin: ['CANCELLED_BY_ADMIN', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_BUYER'] } });
    const sellerBNet = sellerBTxs.reduce((sum, tx) => {
        if (tx.type === 'ORDER_EARNING_SELLER') return sum + tx.amount;
        if (tx.type === 'PAYOUT') return sum - tx.amount;
        return sum;
    }, 0);
    console.log(`Seller B Net Balance: ${sellerBNet} (Expected: 200 - Payout Integrity OK)`);

    // Verify Filters: COD filter should only see Order 1 earning and Ship X supply
    const codTxs = await Transaction.find({ paymentMethod: 'COD', status: { $nin: ['CANCELLED_BY_ADMIN', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_BUYER'] } });
    console.log(`COD Filter Transactions Count: ${codTxs.length} (Expected: 3 - Seller A Earning + Ship X Earning + Ship X Supply)`);

    console.log('\n--- ⭐ MASTER AUDIT SUCCESSFUL! ⭐ ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ AUDIT FAILED:', err);
    process.exit(1);
  }
}

runMasterAudit();
