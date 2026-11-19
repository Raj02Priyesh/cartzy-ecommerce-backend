/**
 * Seed the database with demo catalog data so the live API has something to show.
 *
 * Usage:  node scripts/seed-demo.js        (uses MONGO_URI from .env)
 *
 * Idempotent: categories, brands, products and the demo shopper are matched by
 * name/email and updated, never duplicated.
 *
 * Also creates a PUBLIC demo shopper account (role "user", never admin) so anyone
 * can try the apps without signing up. Its credentials are intentionally public;
 * the API blocks password changes for it. Override with DEMO_USER_EMAIL / DEMO_USER_PASSWORD.
 *
 * Product photos are free-licence images from Unsplash (https://unsplash.com/license).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const { DEMO_USER_EMAIL } = require('../config/demo');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
const HomePage = require('../models/homePageModel');
const Notification = require('../models/notificationModel');
const PostalCode = require('../models/postalCodeModel');

const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'demo1234';

// Unsplash photo ids, served cropped as JPEG by the Unsplash image CDN.
const photo = (id, w = 600, h = 600) => `https://images.unsplash.com/${id}?fm=jpg&q=80&w=${w}&h=${h}&fit=crop`;

const categoryPhotos = {
  'Electronics': 'photo-1498049794561-7780e7231661',
  'Mobiles': 'photo-1480694313141-fce5e697ee25',
  'Laptops': 'photo-1531297484001-80022131f5a1',
  'Audio': 'photo-1505740420928-5e560c06d30e',
  'Fashion': 'photo-1441984904996-e0b6ba687e04',
  'Men\'s Clothing': 'photo-1532453288672-3a27e9be9efd',
  'Footwear': 'photo-1709258228137-19a8c193be39',
  'Home & Kitchen': 'photo-1556911220-bff31c812dba',
};

const productPhotos = {
  'Nova X5 Smartphone': ['photo-1480694313141-fce5e697ee25', 'photo-1640936343842-268f9d87e764'],
  'Nova Lite 3 Smartphone': ['photo-1634403665443-81dc4d75843a', 'photo-1511707171634-5f897ff02aa9'],
  'Nova Book 14 Laptop': ['photo-1531297484001-80022131f5a1', 'photo-1611186871348-b1ce696e52c9'],
  'Sonique Pods Pro': ['photo-1590658268037-6bf12165a8df', 'photo-1606841837239-c5a1a4a07af7'],
  'Sonique Boom Speaker': ['photo-1589003077984-894e133dabab', 'photo-1608043152269-423dbba4e7e1'],
  'Sonique Studio Headphones': ['photo-1505740420928-5e560c06d30e', 'photo-1618366712010-f4ae9c647dcb'],
  'Threadline Oxford Shirt': ['photo-1603252109612-24fa03d145c8', 'photo-1612541122840-bf7071c968a2'],
  'Threadline Denim Jacket': ['photo-1611312449408-fcece27cdbb7', 'photo-1543076447-215ad9ba6923'],
  'UrbanStep Runner Sneakers': ['photo-1709258228137-19a8c193be39', 'photo-1542291026-7eec264c27ff'],
  'UrbanStep Leather Loafers': ['photo-1616406432452-07bc5938759d', 'photo-1662541089338-c7d53b88be70'],
  'Brewly Pour-Over Coffee Kit': ['photo-1758221052634-33f352d1318b', 'photo-1442512595331-e89e73853f31'],
  'Brewly Electric Kettle': ['photo-1594213114663-d94db9b17125', 'photo-1643114786355-ff9e52736eab'],
};

// Brand images reuse a representative product photo.
const brandPhotos = {
  Nova: 'photo-1480694313141-fce5e697ee25',
  Sonique: 'photo-1505740420928-5e560c06d30e',
  UrbanStep: 'photo-1709258228137-19a8c193be39',
  Threadline: 'photo-1611312449408-fcece27cdbb7',
  Brewly: 'photo-1594213114663-d94db9b17125',
};

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
      { name: c.name, parent: c.parent ? catIds[c.parent] : null, image: photo(categoryPhotos[c.name], 400, 400) },
      { upsert: true, new: true }
    );
    catIds[c.name] = doc._id;
  }

  // Brands
  const brandIds = {};
  for (const name of brands) {
    const doc = await Brand.findOneAndUpdate({ name }, { name, image: photo(brandPhotos[name], 200, 200) }, { upsert: true, new: true });
    brandIds[name] = doc._id;
  }

  // Products
  const productIds = {};
  for (const p of products) {
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
        images: productPhotos[p.name].map(id => photo(id)),
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
        { name: 'Big Electronics Sale', text: 'Up to 35% off phones, laptops and audio', image: photo('photo-1498049794561-7780e7231661', 1200, 500),
          buttonText: 'Shop Electronics', buttonLink: `/category/${catIds['Electronics']}`, isActive: true },
        { name: 'New Season Fashion', text: 'Fresh styles for every day', image: photo('photo-1441986300917-64674bd600d8', 1200, 500),
          buttonText: 'Shop Fashion', buttonLink: `/category/${catIds['Fashion']}`, isActive: true },
      ],
      topCategories: ['Mobiles', 'Audio', 'Footwear', 'Home & Kitchen'].map(name => ({
        name, categoryId: catIds[name], image: photo(categoryPhotos[name], 400, 400), isActive: true,
      })),
      bestSellingProducts: ['Nova X5 Smartphone', 'Sonique Pods Pro', 'UrbanStep Runner Sneakers', 'Threadline Oxford Shirt'].map(n => productIds[n]),
    },
    { upsert: true, new: true }
  );

  // Notification and postal codes
  await Notification.findOneAndUpdate(
    { title: 'Welcome to Cartzy' },
    { title: 'Welcome to Cartzy', message: 'Free delivery and cash on delivery on every order. This is a demo store - no real payments are taken.', type: 'announcement', audience: 'all', isActive: true },
    { upsert: true }
  );
  for (const pc of postalCodes) {
    await PostalCode.findOneAndUpdate({ ZipCode: pc.ZipCode, branch: pc.branch }, pc, { upsert: true });
  }

  // Public demo shopper (role "user" only). Resets name/password/address on every run.
  await User.findOneAndUpdate(
    { email: DEMO_USER_EMAIL },
    {
      name: 'Demo Shopper',
      email: DEMO_USER_EMAIL,
      password: await bcrypt.hash(DEMO_USER_PASSWORD, 10),
      role: 'user',
      phone: '9876543210',
      isDisabled: false,
      addresses: [{
        street: '12B, Lake View Apartments, 80 Feet Road', city: 'Bengaluru', district: 'Bengaluru Urban',
        subordinate: 'Bengaluru South', branch: 'Koramangala', state: 'Karnataka', zipCode: '560034', country: 'India',
      }],
    },
    { upsert: true, new: true }
  );

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products, home page, 1 notification, ${postalCodes.length} postal codes, demo shopper ${DEMO_USER_EMAIL}.`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('Seed failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
