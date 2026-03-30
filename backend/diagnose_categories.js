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
  isActive: Boolean
});

const Category = mongoose.model('Category', CategorySchema);

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const all = await Category.find({});
    console.log('Total Categories:', all.length);
    console.log('Details:', JSON.stringify(all, null, 2));
    
    const allSpecial = await Category.find({ $or: [{ slug: 'all' }, { name: 'الكل' }] });
    console.log('Special "All" Categories:', allSpecial.length);
    if (allSpecial.length > 0) {
      console.log('Found:', allSpecial);
    } else {
      console.log('NOT FOUND in DB');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnose();
