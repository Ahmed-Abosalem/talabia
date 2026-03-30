
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// تحميل متغيرات البيئة
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';

async function verifySearchAndSort() {
    console.log('🚀 Starting Verification of Search & Sort API (using fetch)...');

    try {
        // Helper for fetch
        const get = async (url) => {
            const res = await fetch(url);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP Error ${res.status}: ${text}`);
            }
            return res.json();
        };

        // 1. Test Default Sort (Check for Featured First)
        console.log('\n1️⃣ Testing Default Sort (Featured First)...');
        const defaultProducts = await get(`${API_URL}/products`);

        if (defaultProducts.length > 0) {
            const first = defaultProducts[0];
            console.log(`   First Product: ${first.name} | Featured: ${first.isFeatured} | Order: ${first.featuredOrder}`);

            // Check if logic holds
            if (first.isFeatured) {
                console.log('   ✅ Default sort prioritizes featured products.');
            } else {
                // Check if any featured products exist at all in the DB (maybe none are featured)
                // We can't know for sure without checking DB, but if list has featured items they MUST be first.
                const anyFeatured = defaultProducts.find(p => p.isFeatured);
                if (anyFeatured) {
                    console.error('   ❌ Default sort FAILED! Found a featured product that is NOT at the top.');
                } else {
                    console.log('   ℹ️ No featured products found in the first batch to verify sorting priority.');
                }
            }
        } else {
            console.log('   ℹ️ No products found in DB.');
        }

        // 2. Test Search (Regex) - Try searching for something likely to exist or "a"
        const searchQuery = "a";
        console.log(`\n2️⃣ Testing Search (Query: "${searchQuery}")...`);
        const searchRes = await get(`${API_URL}/products?search=${searchQuery}`);
        console.log(`   Found ${searchRes.length} products matching "${searchQuery}".`);

        if (searchRes.length > 0) {
            const match = searchRes[0];
            const nameMatch = match.name.toLowerCase().includes(searchQuery.toLowerCase());
            const descMatch = match.description && match.description.toLowerCase().includes(searchQuery.toLowerCase());

            if (nameMatch || descMatch) {
                console.log(`   ✅ Search matched: "${match.name}"`);
            } else {
                console.warn(`   ⚠️ Search result "${match.name}" might not contain query visible (could be in description).`);
            }
        } else {
            console.log('   ℹ️ No results found. (Might be empty DB or no match)');
        }

        // 3. Test Sort Options
        console.log('\n3️⃣ Testing specific sort options...');

        // Price ASC
        const priceAsc = await get(`${API_URL}/products?sort=price_asc&limit=5`);
        if (priceAsc.length >= 2) {
            const isSorted = priceAsc[0].price <= priceAsc[1].price;
            console.log(`   Price ASC: ${priceAsc[0].price} <= ${priceAsc[1].price} ? ${isSorted}`);
            if (isSorted) console.log('   ✅ Price ASC works.');
            else console.error('   ❌ Price ASC Failed.');
        } else {
            console.log('   ℹ️ Not enough products to test Price ASC.');
        }

        // Featured Only
        console.log('\n4️⃣ Testing "Featured Only" Filter...');
        const featuredOnly = await get(`${API_URL}/products?sort=featured`);
        if (featuredOnly.length > 0) {
            const allFeatured = featuredOnly.every(p => p.isFeatured);
            console.log(`   Fetched ${featuredOnly.length} items. All are featured? ${allFeatured}`);
            if (allFeatured) console.log('   ✅ Featured Only filter works.');
            else console.error('   ❌ Featured Only filter included non-featured items.');
        } else {
            console.log('   ℹ️ No featured products found.');
        }


    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
    }

    console.log('\n🏁 Verification Complete.');
}

verifySearchAndSort();
