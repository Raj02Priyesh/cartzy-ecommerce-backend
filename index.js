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


// Route table: used both to mount the routers and to generate the API docs.
// Admin signup/login are public; every other admin route requires a token with role "admin".
const authenticate = require('./middlewares/authMiddleware');
const requireRole = require('./middlewares/requireRole');
const adminOnly = [authenticate, requireRole('admin')];

const mounts = [
  { path: '/api/user', router: userRoutes, tag: 'Shopper · Account' },
  { path: '/api/user/products', router: userProductRoutes, tag: 'Shopper · Products' },
  { path: '/api/user/categories', router: userCategoryRoutes, tag: 'Shopper · Categories' },
  { path: '/api/user/brands', router: userBrandRoutes, tag: 'Shopper · Brands' },
  { path: '/api/user/home-page', router: userHomePageRoutes, tag: 'Shopper · Home page' },
  { path: '/api/user/wishlist', router: wishlistRoutes, tag: 'Shopper · Wishlist' },
  { path: '/api/user/cart', router: cartRoutes, tag: 'Shopper · Cart' },
  { path: '/api/user/orders', router: userOrderRoutes, tag: 'Shopper · Orders' },
  { path: '/api/user/tracking', router: trackingRoutes, tag: 'Shopper · Order tracking' },
  { path: '/api/user/return-exchange', router: userReturnExchangeRoutes, tag: 'Shopper · Returns' },
  { path: '/api/user/notifications', router: userNotificationRoutes, tag: 'Shopper · Notifications' },
  { path: '/api/admin/auth', router: adminAuthRoutes, tag: 'Admin · Auth' },
  { path: '/api/admin/products', router: productRoutes, tag: 'Admin · Products', admin: true },
  { path: '/api/admin/category', router: categoryRoutes, tag: 'Admin · Categories', admin: true },
  { path: '/api/admin/brands', router: adminBrandRoutes, tag: 'Admin · Brands', admin: true },
  { path: '/api/admin/orders', router: adminOrderRoutes, tag: 'Admin · Orders', admin: true },
  { path: '/api/admin/return-exchange', router: adminReturnExchangeRoutes, tag: 'Admin · Returns', admin: true },
  { path: '/api/admin/user-management', router: userManagementRoutes, tag: 'Admin · Customers', admin: true },
  { path: '/api/admin/home-page', router: homePageRoutes, tag: 'Admin · Home page', admin: true },
  { path: '/api/admin/notifications', router: notificationRoutes, tag: 'Admin · Notifications', admin: true },
  { path: '/api/admin/postal-codes', router: postalCodeRoutes, tag: 'Admin · Postal codes', admin: true },
  { path: '/api/admin', router: profileRoutes, tag: 'Admin · Profile', admin: true },
];

for (const { path, router, admin } of mounts) {
  if (admin) app.use(path, adminOnly, router);
  else app.use(path, router);
}

// API docs: OpenAPI spec generated from the route table, browsable with Swagger UI
const swaggerUi = require('swagger-ui-express');
const { buildOpenApiSpec } = require('./docs/openapi');
const openApiSpec = buildOpenApiSpec(mounts);
app.get('/api-docs.json', (req, res) => res.json(openApiSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Cartzy API docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: undefined, displayRequestDuration: true },
}));
app.get('/', (req, res) => res.redirect('/api-docs'));

// Connect to Database
connectDB();


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
