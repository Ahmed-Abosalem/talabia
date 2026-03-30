import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const CategorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  isProtected: Boolean,
  isActive: Boolean,
  sortOrder: Number
});

const Category = mongoose.model('Category', CategorySchema);

async function testControllerLogic() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');
  
  // Simulation of AdminCategoriesController.js line 53
  const allCategories = await Category.find({
    $or: [{ slug: 'all' }, { name: 'الكل' }]
  }).sort({ createdAt: 1 });
  
  console.log('Admin find "All" results:', allSpecial.length);
  
  const allList = await Category.find().sort({ sortOrder: 1, name: 1 });
  console.log('All List Count:', allList.length);
  console.log('First Item Slug:', allList[0]?.slug);
  console.log('First Item Name:', allList[0]?.name);
  
  process.exit(0);
}

testControllerLogic();
