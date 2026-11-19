require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Express
const app = express();

// CORS: the API authenticates with a Bearer token in the Authorization header (no cookies),
// so any web client may call it. Set CORS_ORIGINS (comma-separated) to restrict browser origins.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));


// Middleware
app.use(express.json());

// Importing Admin Routes
const adminAuthRoutes = require('./routes/admin/authRoutes');
const categoryRoutes = require('./routes/admin/categoryRoutes');
const productRoutes = require('./routes/admin/productRoutes');
const notificationRoutes = require('./routes/admin/notificationRoutes');
const homePageRoutes = require('./routes/admin/homePageRoutes');
const adminOrderRoutes = require('./routes/admin/orderRoutes');
const profileRoutes = require('./routes/admin/profileRoutes');
const adminReturnExchangeRoutes = require('./routes/admin/returnExchangeRoutes');
const userManagementRoutes = require('./routes/admin/userManageRoutes');
const adminBrandRoutes = require('./routes/admin/brandRoutes');
const postalCodeRoutes = require('./routes/admin/postalCodeRoutes');

// Importing User Routes
const userRoutes = require('./routes/user/userRoutes');
const userHomePageRoutes = require('./routes/user/homePageRoutes');
const userCategoryRoutes = require('./routes/user/categoryRoutes');
const userProductRoutes = require('./routes/user/productRoutes');
const wishlistRoutes = require('./routes/user/wishlistRoutes');
const cartRoutes = require('./routes/user/cartRoutes');
const userOrderRoutes = require('./routes/user/orderRoutes');
const trackingRoutes = require('./routes/user/orderTrackingRoutes');
const userReturnExchangeRoutes = require('./routes/user/returnExchangeRoutes');
const userNotificationRoutes = require('./routes/user/notificationRoutes');
const userBrandRoutes = require('./routes/user/brandRoutes');


// Admin Routes
// Signup/login are public; every other admin route requires a valid token with role "admin".
const authenticate = require('./middlewares/authMiddleware');
const requireRole = require('./middlewares/requireRole');
const adminOnly = [authenticate, requireRole('admin')];

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/category', adminOnly, categoryRoutes);
app.use('/api/admin/products', adminOnly, productRoutes);
app.use('/api/admin/home-page', adminOnly, homePageRoutes);
app.use('/api/admin/notifications', adminOnly, notificationRoutes);
app.use('/api/admin/orders', adminOnly, adminOrderRoutes);
app.use('/api/admin/return-exchange', adminOnly, adminReturnExchangeRoutes);
app.use('/api/admin/user-management', adminOnly, userManagementRoutes);
app.use('/api/admin/brands', adminOnly, adminBrandRoutes);
app.use('/api/admin/postal-codes', adminOnly, postalCodeRoutes);
app.use('/api/admin', adminOnly, profileRoutes);

// User Routes
app.use('/api/user', userRoutes);
app.use('/api/user/home-page', userHomePageRoutes);
app.use('/api/user/categories', userCategoryRoutes);
app.use('/api/user/products', userProductRoutes);
app.use('/api/user/wishlist', wishlistRoutes);
app.use('/api/user/cart', cartRoutes);
app.use('/api/user/orders', userOrderRoutes);
app.use('/api/user/tracking', trackingRoutes);
app.use('/api/user/return-exchange', userReturnExchangeRoutes);
app.use('/api/user/notifications', userNotificationRoutes);
app.use('/api/user/brands', userBrandRoutes);

// Connect to Database
connectDB();


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
