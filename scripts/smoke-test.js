/**
 * End-to-end smoke test for the Cartzy API.
 *
 * Usage:  node scripts/smoke-test.js            (against http://localhost:5000)
 *         BASE_URL=https://your-api.example node scripts/smoke-test.js
 *
 * Needs ADMIN_KEY in .env (or the environment) to create a test admin.
 * Creates its own test admin, user, brand, category, product and order,
 * and cleans up the catalog items it created at the end.
 */
require('dotenv').config();

const BASE = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
const run = Date.now().toString(36);
const results = [];

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

async function check(name, method, path, opts, expect) {
  let r;
  try {
    r = await call(method, path, opts);
  } catch (e) {
    results.push({ name, ok: false, detail: `request failed: ${e.message}` });
    return { status: 0, data: null };
  }
  const expected = Array.isArray(expect) ? expect : [expect];
  const ok = expected.includes(r.status);
  const msg = r.data && (r.data.message || r.data.error);
  results.push({ name, ok, detail: `${method} ${path} -> ${r.status}${ok ? '' : ` (expected ${expected.join('/')})`}${msg ? ` "${msg}"` : ''}` });
  return r;
}

(async () => {
  console.log(`Testing ${BASE}\n`);

  // ---------- Auth ----------
  const adminEmail = `admin.${run}@example.com`;
  const userEmail = `user.${run}@example.com`;
  const pw = `Test-${run}-pass`;

  await check('Admin signup rejects wrong key', 'POST', '/api/admin/auth/signup',
    { body: { name: 'X', email: `bad.${run}@example.com`, password: pw, adminKey: 'wrong' } }, 403);
  await check('Admin signup', 'POST', '/api/admin/auth/signup',
    { body: { name: 'Test Admin', email: adminEmail, password: pw, adminKey: process.env.ADMIN_KEY } }, 201);
  const aLogin = await check('Admin login', 'POST', '/api/admin/auth/login', { body: { email: adminEmail, password: pw } }, 200);
  const A = aLogin.data && aLogin.data.token;

  await check('User signup', 'POST', '/api/user/signup', { body: { name: 'Test User', email: userEmail, password: pw } }, 201);
  await check('User signup rejects duplicate email', 'POST', '/api/user/signup', { body: { name: 'Dup', email: userEmail, password: pw } }, 400);
  await check('User login rejects wrong password', 'POST', '/api/user/login', { body: { email: userEmail, password: 'nope' } }, 401);
  const uLogin = await check('User login', 'POST', '/api/user/login', { body: { email: userEmail, password: pw } }, 200);
  const U = uLogin.data && uLogin.data.token;
  const userId = uLogin.data && uLogin.data.user && uLogin.data.user._id;

  await check('Protected route without token is rejected', 'GET', '/api/user/cart', {}, 401);
  await check('Protected route with bad token is rejected', 'GET', '/api/user/cart', { token: 'not-a-token' }, 403);

  // ---------- Security: role checks ----------
  await check('SECURITY: normal user cannot list all users (admin route)', 'GET', '/api/admin/user-management/users', { token: U }, [401, 403]);
  const hack = await check('SECURITY: normal user cannot add products (admin route)', 'POST', '/api/admin/products/add',
    { token: U, body: { name: `hack ${run}`, description: 'x', category: '000000000000000000000000', MRP: 1, price: 1 } }, [401, 403]);
  const hackId = hack.data && hack.data.product && hack.data.product._id; // only set if the check failed

  // ---------- Admin catalog ----------
  const brand = await check('Admin add brand', 'POST', '/api/admin/brands/add', { token: A, body: { name: `Brand ${run}` } }, 201);
  const brandId = brand.data && brand.data.brand && brand.data.brand._id;
  const cat = await check('Admin add category', 'POST', '/api/admin/category/add', { token: A, body: { name: `Category ${run}` } }, 201);
  const catId = cat.data && cat.data.category && cat.data.category._id;
  await check('Admin list categories', 'GET', '/api/admin/category', { token: A }, 200);

  const prodBody = {
    name: `Test Shoe ${run}`, description: 'Smoke test product', category: catId, brand: brandId,
    MRP: 2000, price: 1500, stock: 10, specifications: { size: '9', color: 'black' }, keywords: ['shoe', 'test'],
  };
  const prod = await check('Admin add product', 'POST', '/api/admin/products/add', { token: A, body: prodBody }, 201);
  const prodId = prod.data && prod.data.product && prod.data.product._id;
  const prod2 = await check('Admin add second product', 'POST', '/api/admin/products/add',
    { token: A, body: { ...prodBody, name: `Test Sneaker ${run}` } }, 201);
  const prod2Id = prod2.data && prod2.data.product && prod2.data.product._id;

  await check('Admin edit product', 'PUT', `/api/admin/products/edit/${prodId}`, { token: A, body: { price: 1400 } }, 200);
  await check('Admin set stock', 'PATCH', `/api/admin/products/set-stock/${prodId}`, { token: A, body: { stock: 20 } }, 200);
  const disc = await check('Admin assign discount', 'PATCH', `/api/admin/products/assign-discount/${prodId}`, { token: A, body: { percentage: 10 } }, 200);
  if (disc.data && disc.data.product) {
    const dp = disc.data.product.discountedPrice;
    results.push({ name: 'Discount price is MRP - 10%', ok: dp === 1800, detail: `discountedPrice = ${dp} (expected 1800)` });
  }
  await check('Admin list products', 'GET', '/api/admin/products/all', { token: A }, 200);
  await check('Admin search products', 'GET', `/api/admin/products/search?query=Shoe%20${run}`, { token: A }, 200);

  await check('Admin add notification', 'POST', '/api/admin/notifications/add',
    { token: A, body: { title: 'Sale', message: 'Smoke test notification', type: 'deal', audience: 'all' } }, [200, 201]);
  await check('Admin add postal code', 'POST', '/api/admin/postal-codes/create',
    { token: A, body: { district: 'Pune', subordinate: 'Pune City', branch: 'Aundh', ZipCode: '411007' } }, [200, 201]);

  // ---------- Public catalog ----------
  await check('Public: all brands', 'GET', '/api/user/brands/all', {}, 200);
  await check('Public: all categories', 'GET', '/api/user/categories/all', {}, 200);
  await check('Public: all products', 'GET', '/api/user/products/all', {}, 200);
  await check('Public: product by id', 'GET', `/api/user/products/id/${prodId}`, {}, 200);
  await check('Public: products by category', 'GET', `/api/user/products/category/${catId}`, {}, 200);
  await check('Public: keyword search', 'GET', `/api/user/products/search?query=shoe`, {}, 200);
  await check('Public: similar products', 'GET', `/api/user/products/similar/${prodId}`, {}, 200);
  await check('Public: filter by color', 'POST', '/api/user/products/filter/color', { body: { colors: ['black'] } }, 200);
  await check('Public: home banners', 'GET', '/api/user/home-page/banners', {}, 200);
  await check('Public: home top categories', 'GET', '/api/user/home-page/top-categories', {}, 200);
  await check('Public: home best sellers', 'GET', '/api/user/home-page/best-selling-products', {}, 200);
  await check('Public: notifications', 'GET', '/api/user/notifications/notifications', {}, 200);

  // ---------- User account ----------
  await check('User update details', 'PUT', '/api/user/update', { token: U, body: { name: 'Test User Updated', phone: '9876543210' } }, 200);
  const addr = await check('User add address', 'POST', '/api/user/address/add', {
    token: U, body: { street: '1 Test Lane, Aundh', city: 'Pune', district: 'Pune', subordinate: 'Pune City', branch: 'Aundh', state: 'Maharashtra', zipCode: '411007', country: 'India' },
  }, 201);
  const addresses = addr.data && addr.data.addresses;
  const addressId = addresses && addresses.length && addresses[addresses.length - 1]._id;

  // ---------- Wishlist & cart ----------
  await check('Wishlist add', 'POST', '/api/user/wishlist/add', { token: U, body: { productId: prod2Id } }, [200, 201]);
  await check('Wishlist get', 'GET', '/api/user/wishlist', { token: U }, 200);
  await check('Wishlist move to cart', 'POST', `/api/user/wishlist/move-to-cart/${prod2Id}`, { token: U }, 200);
  await check('Cart add', 'POST', '/api/user/cart/add', { token: U, body: { productId: prodId } }, 200);
  const upd = await check('Cart update quantity', 'PUT', '/api/user/cart/update', { token: U, body: { productId: prodId, quantity: 2 } }, 200);
  if (upd.data && upd.data.cart) {
    const total = upd.data.cart.totalPrice;
    results.push({ name: 'Cart total = 2 x 1400 + 1 x 1500', ok: total === 4300, detail: `totalPrice = ${total} (expected 4300)` });
  }
  await check('Cart get', 'GET', '/api/user/cart', { token: U }, 200);
  await check('Cart recommendations', 'GET', '/api/user/cart/recommendations', { token: U }, 200);
  await check('Cart checkout', 'GET', '/api/user/cart/checkout', { token: U }, 200);

  // ---------- Orders ----------
  const order = await check('Place order (COD)', 'POST', '/api/user/orders/place',
    { token: U, body: { addressId, paymentMethod: 'COD', name: 'Test User', phone: '9876543210' } }, 201);
  const orderId = order.data && order.data.order && order.data.order._id;
  await check('Cart is empty after order', 'GET', '/api/user/cart/checkout', { token: U }, 400);
  await check('User list orders', 'GET', '/api/user/orders', { token: U }, 200);
  await check('User order details', 'GET', `/api/user/orders/${orderId}`, { token: U }, 200);
  await check('Verify shipping address against postal codes', 'GET', `/api/user/orders/${orderId}/verify-shipping`, { token: U }, 200);

  await check('Admin list orders', 'GET', '/api/admin/orders/orders', { token: A }, 200);
  await check('Admin update order status', 'PUT', `/api/admin/orders/orders/${orderId}/status`, { token: A, body: { status: 'Shipped' } }, 200);
  await check('Admin set tracking (delivered today)', 'PUT', `/api/admin/orders/orders/${orderId}/tracking`,
    { token: A, body: { shippedDate: new Date(), deliveredDate: new Date() } }, 200);
  await check('Admin mark paid', 'PUT', `/api/admin/orders/orders/${orderId}/payment-status`, { token: A, body: { paymentStatus: 'Paid' } }, 200);
  await check('User track order', 'GET', `/api/user/tracking/track/${orderId}`, { token: U }, 200);
  await check('User cannot cancel a shipped order', 'PUT', `/api/user/orders/cancel/${orderId}`, { token: U }, 400);

  // ---------- Returns ----------
  const ret = await check('User request return', 'POST', '/api/user/return-exchange/return-exchange',
    { token: U, body: { orderId, productId: prodId, type: 'Return', reason: 'Wrong size', refundMethod: 'Original Payment Method' } }, 201);
  const reqId = ret.data && ret.data.request && ret.data.request._id;
  await check('User list return requests', 'GET', '/api/user/return-exchange/return-exchange', { token: U }, 200);
  await check('Admin approve return', 'PUT', `/api/admin/return-exchange/return-exchange/${reqId}`, { token: A, body: { status: 'Approved' } }, 200);

  // ---------- Rating ----------
  await check('User rate product', 'POST', `/api/user/products/rate/${prodId}`, { token: U, body: { rating: 5, review: 'Great' } }, [200, 201]);
  await check('Product overall rating', 'GET', `/api/user/products/rating/${prodId}`, {}, 200);

  // ---------- Admin user management ----------
  await check('Admin list users', 'GET', '/api/admin/user-management/users', { token: A }, 200);
  await check('Admin disable user', 'PUT', `/api/admin/user-management/users/${userId}/disable`, { token: A }, 200);
  await check('SECURITY: disabled user cannot log in', 'POST', '/api/user/login', { body: { email: userEmail, password: pw } }, [401, 403]);
  await check('Admin enable user', 'PUT', `/api/admin/user-management/users/${userId}/enable`, { token: A }, 200);

  // ---------- Public demo account (only if it has been seeded) ----------
  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@cartzy.app';
  const demoPw = process.env.DEMO_USER_PASSWORD || 'demo1234';
  const demo = await call('POST', '/api/user/login', { body: { email: demoEmail, password: demoPw } });
  if (demo.status === 200) {
    await check('SECURITY: demo account password cannot be changed', 'PUT', '/api/user/change-password',
      { token: demo.data.token, body: { oldPassword: demoPw, newPassword: `changed-${run}` } }, 403);
  }

  // ---------- Cleanup catalog test data ----------
  for (const id of [prodId, prod2Id, hackId]) if (id) await call('DELETE', `/api/admin/products/delete/${id}`, { token: A });
  if (catId) await call('DELETE', `/api/admin/category/delete/${catId}`, { token: A });
  if (brandId) await call('DELETE', `/api/admin/brands/delete/${brandId}`, { token: A });

  // ---------- Report ----------
  const failed = results.filter(r => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.detail}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
