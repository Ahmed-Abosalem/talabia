import axios from 'axios';

async function verify() {
  try {
    const res = await axios.get('http://localhost:5000/api/categories');
    console.log('Categories Count:', res.data.categories.length);
    const all = res.data.categories.find(c => c.slug === 'all' || c.name === 'الكل');
    console.log('Result for "All":', JSON.stringify(all, null, 2));
  } catch (err) {
    console.error('Error fetching categories:', err.message);
  }
}

verify();
