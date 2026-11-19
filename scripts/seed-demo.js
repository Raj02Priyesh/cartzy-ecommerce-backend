/**
 * Seed the database with demo catalog data so the live API has something to show.
 *
 * Usage:  node scripts/seed-demo.js        (uses MONGO_URI from .env)
 *
 * Idempotent: categories, brands and products are matched by name and updated,
 * never duplicated. Creates no user accounts. Images are placeholder photos
 * from picsum.photos - replace them with real product images via the admin API.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
const HomePage = require('../models/homePageModel');
const Notification = require('../models/notificationModel');
const PostalCode = require('../models/postalCodeModel');

const img = (seed, w = 600, h = 600) => `https://picsum.photos/seed/cartzy-${seed}/${w}/${h}`;

const categories = [
  { name: 'Electronics' },
  { name: 'Mobiles', parent: 'Electronics' },
  { name: 'Laptops', parent: 'Electronics' },
  { name: 'Audio', parent: 'Electronics' },
  { name: 'Fashion' },
  { name: 'Men\'s Clothing', parent: 'Fashion' },
  { name: 'Footwear', parent: 'Fashion' },
  { name: 'Home & Kitchen' },
];

const brands = ['Nova', 'Sonique', 'UrbanStep', 'Threadline', 'Brewly'];

const products = [
  { name: 'Nova X5 Smartphone', category: 'Mobiles', brand: 'Nova', MRP: 24999, price: 21999, stock: 40,
    description: '6.5" AMOLED display, 128 GB storage, 50 MP triple camera and a 5000 mAh battery with fast charging.',
    specifications: { color: 'black', storage: '128 GB', ram: '8 GB' }, keywords: ['phone', 'smartphone', 'android', 'mobile'] },
  { name: 'Nova Lite 3 Smartphone', category: 'Mobiles', brand: 'Nova', MRP: 13999, price: 11499, stock: 60,
    description: 'Everyday phone with a 6.1" display, 64 GB storage and two-day battery life.',
    specifications: { color: 'blue', storage: '64 GB', ram: '4 GB' }, keywords: ['phone', 'budget', 'mobile'] },
  { name: 'Nova Book 14 Laptop', category: 'Laptops', brand: 'Nova', MRP: 64999, price: 57999, stock: 15,
    description: '14" full-HD thin-and-light laptop, 16 GB RAM, 512 GB SSD, 12-hour battery.',
    specifications: { color: 'silver', ram: '16 GB', storage: '512 GB SSD' }, keywords: ['laptop', 'notebook', 'work'] },
  { name: 'Sonique Pods Pro', category: 'Audio', brand: 'Sonique', MRP: 7999, price: 5499, stock: 80,
    description: 'Wireless earbuds with active noise cancellation, 30-hour total playback and wireless charging case.',
    specifications: { color: 'white' }, keywords: ['earbuds', 'wireless', 'anc', 'audio'] },
  { name: 'Sonique Boom Speaker', category: 'Audio', brand: 'Sonique', MRP: 4999, price: 3299, stock: 35,
    description: 'Portable waterproof Bluetooth speaker with deep bass and 12-hour battery.',
    specifications: { color: 'red' }, keywords: ['speaker', 'bluetooth', 'portable'] },
  { name: 'Sonique Studio Headphones', category: 'Audio', brand: 'Sonique', MRP: 9999, price: 7999, stock: 20,
    description: 'Over-ear wireless headphones with studio-tuned sound and 40-hour battery.',
    specifications: { color: 'black' }, keywords: ['headphones', 'wireless', 'audio'] },
  { name: 'Threadline Oxford Shirt', category: 'Men\'s Clothing', brand: 'Threadline', MRP: 1999, price: 1299, stock: 100,
    description: 'Slim-fit 100% cotton Oxford shirt, breathable and wrinkle-resistant.',
    specifications: { size: 'M', color: 'white' }, keywords: ['shirt', 'formal', 'cotton'] },
  { name: 'Threadline Denim Jacket', category: 'Men\'s Clothing', brand: 'Threadline', MRP: 3499, price: 2499, stock: 45,
    description: 'Classic washed denim jacket with button front and chest pockets.',
    specifications: { size: 'L', color: 'blue' }, keywords: ['jacket', 'denim', 'casual'] },
  { name: 'UrbanStep Runner Sneakers', category: 'Footwear', brand: 'UrbanStep', MRP: 3999, price: 2799, stock: 70,
    description: 'Lightweight running sneakers with cushioned sole and breathable mesh upper.',
    specifications: { size: '9', color: 'black' }, keywords: ['shoes', 'sneakers', 'running'] },
  { name: 'UrbanStep Leather Loafers', category: 'Footwear', brand: 'UrbanStep', MRP: 4499, price: 3599, stock: 25,
    description: 'Genuine leather slip-on loafers for office and occasions.',
    specifications: { size: '8', color: 'brown' }, keywords: ['shoes', 'loafers', 'formal'] },
  { name: 'Brewly Pour-Over Coffee Kit', category: 'Home & Kitchen', brand: 'Brewly', MRP: 2499, price: 1899, stock: 30,
    description: 'Glass pour-over brewer, reusable steel filter and a 600 ml server.',
    specifications: { color: 'clear' }, keywords: ['coffee', 'kitchen', 'brewing'] },
  { name: 'Brewly Electric Kettle', category: 'Home & Kitchen', brand: 'Brewly', MRP: 1799, price: 1299, stock: 50,
    description: '1.5 L stainless-steel kettle with auto shut-off and boil-dry protection.',
    specifications: { color: 'steel' }, keywords: ['kettle', 'kitchen', 'appliance'] },
];

const postalCodes = [
  { district: 'Bhopal', subordinate: 'Huzur', branch: 'MANIT', ZipCode: '462003' },
  { district: 'Mumbai', subordinate: 'Andheri', branch: 'Andheri East', ZipCode: '400069' },
  { district: 'Bengaluru', subordinate: 'Bengaluru South', branch: 'Koramangala', ZipCode: '560034' },
  { district: 'New Delhi', subordinate: 'Connaught Place', branch: 'Connaught Place', ZipCode: '110001' },
];

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI);

  // Categories (parents first)
  const catIds = {};
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate(
      { name: c.name },
      { name: c.name, parent: c.parent ? catIds[c.parent] : null, image: img(c.name.toLowerCase().replace(/\W+/g, '-'), 400, 400) },
      { upsert: true, new: true }
    );
    catIds[c.name] = doc._id;
  }

  // Brands
  const brandIds = {};
  for (const name of brands) {
    const doc = await Brand.findOneAndUpdate({ name }, { name, image: img(`brand-${name.toLowerCase()}`, 200, 200) }, { upsert: true, new: true });
    brandIds[name] = doc._id;
  }

  // Products
  const productIds = {};
  for (const p of products) {
    const slug = p.name.toLowerCase().replace(/\W+/g, '-');
    const doc = await Product.findOneAndUpdate(
      { name: p.name },
      {
        name: p.name,
        description: p.description,
        category: catIds[p.category],
        brand: brandIds[p.brand],
        MRP: p.MRP,
        price: p.price,
        stock: p.stock,
        isActive: p.stock > 0,
        images: [img(slug), img(`${slug}-2`)],
        // The selling price is `price`; derive the discount from it so all three fields agree.
        discount: { percentage: Math.round(((p.MRP - p.price) / p.MRP) * 100) },
        discountedPrice: p.price,
        specifications: p.specifications,
        keywords: p.keywords,
      },
      { upsert: true, new: true }
    );
    productIds[p.name] = doc._id;
  }

  // Storefront home page (single document)
  await HomePage.findOneAndUpdate(
    {},
    {
      banners: [
        { name: 'Big Electronics Sale', text: 'Up to 35% off phones, laptops and audio', image: img('banner-electronics', 1200, 500),
          buttonText: 'Shop Electronics', buttonLink: `/category/${catIds['Electronics']}`, isActive: true },
        { name: 'New Season Fashion', text: 'Fresh styles for every day', image: img('banner-fashion', 1200, 500),
          buttonText: 'Shop Fashion', buttonLink: `/category/${catIds['Fashion']}`, isActive: true },
      ],
      topCategories: ['Mobiles', 'Audio', 'Footwear', 'Home & Kitchen'].map(name => ({
        name, categoryId: catIds[name], image: img(name.toLowerCase().replace(/\W+/g, '-'), 400, 400), isActive: true,
      })),
      bestSellingProducts: ['Nova X5 Smartphone', 'Sonique Pods Pro', 'UrbanStep Runner Sneakers', 'Threadline Oxford Shirt'].map(n => productIds[n]),
    },
    { upsert: true, new: true }
  );

  // Notification and postal codes
  await Notification.findOneAndUpdate(
    { title: 'Welcome to Cartzy' },
    { title: 'Welcome to Cartzy', message: 'Get 10% off your first order with code WELCOME10.', type: 'deal', audience: 'all', isActive: true },
    { upsert: true }
  );
  for (const pc of postalCodes) {
    await PostalCode.findOneAndUpdate({ ZipCode: pc.ZipCode, branch: pc.branch }, pc, { upsert: true });
  }

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products, home page, 1 notification, ${postalCodes.length} postal codes.`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('Seed failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
