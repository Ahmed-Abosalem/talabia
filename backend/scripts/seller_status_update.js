import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OrderSchema = new mongoose.Schema({
    statusCode: String,
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Order = mongoose.model('Order', OrderSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Update the order for "خالد القاسمي" (698e362a63cb3f35548167e8)
        const orderId = '69c95c3258b14196cbd02c52';
        const res = await Order.findByIdAndUpdate(orderId, { statusCode: 'AT_SELLER_PROCESSING' }, { new: true });
        
        console.log(`Updated Order ${orderId} to status: ${res.statusCode}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
