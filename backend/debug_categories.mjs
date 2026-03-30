
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    image: String,
}, { versionKey: false });

// Reuse existing model if defined to avoid overwriting error, though in standalone script it's fine
const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

async function listCategories() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI not found in environment. Make sure you run this from backend directory or where .env exists.");
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const categories = await Category.find({}, "name slug _id");
        console.log("Categories found:"); // Marker for parsing
        categories.forEach((c) => {
            console.log(`- ID: ${c._id}, Name: "${c.name}", Slug: "${c.slug}"`);
        });
        console.log("End of Categories"); // Marker

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

listCategories();
