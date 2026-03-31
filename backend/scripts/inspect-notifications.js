// s:\Talabia_new\backend\scripts\inspect-notifications.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';

dotenv.config();

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const total = await Notification.countDocuments();
    const unread = await Notification.countDocuments({ isRead: false });
    const last5 = await Notification.find().sort({ createdAt: -1 }).limit(5);

    console.log('\n--- 📊 Notification Stats ---');
    console.log(`Total Notifications: ${total}`);
    console.log(`Unread Notifications: ${unread}`);

    console.log('\n--- 🕒 Last 5 Notifications ---');
    last5.forEach((n, i) => {
      console.log(`[${i+1}] ${n.createdAt.toISOString()} - ${n.title}: ${n.message} (Type: ${n.type}, Audience: ${n.audience || 'None'}, User: ${n.user || 'None'})`);
    });

    // Test Creation
    /*
    console.log('\n--- 🧪 Testing Notification Creation ---');
    const test = await Notification.create({
      title: 'إشعار اختبار التشخيص',
      message: 'هذا مجرد اختبار للتنفيذ.',
      type: 'system'
    });
    console.log('✅ Test Notification Created:', test._id);
    */

    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Inspection Failed:', err);
    process.exit(1);
  }
}

inspect();
