// Builds the OpenAPI 3 spec from the routers that index.js mounts, so the docs
// always match the real routes. Hand-written details (request bodies, query
// parameters, examples) live in the `details` map below.
const fs = require('fs');
const path = require('path');

const ADDRESS_EXAMPLE = {
  street: '12B, Green Park Society, Baner Road',
  city: 'Pune',
  district: 'Pune',
  subordinate: 'Pune City',
  branch: 'Baner',
  state: 'Maharashtra',
  zipCode: '411045',
  country: 'India',
};

// "METHOD /full/path" -> extra OpenAPI fields for that operation
const details = {
  'POST /api/user/signup': { body: { name: 'Rahul Patil', email: 'rahul@example.com', password: 'secret123' } },
  'POST /api/user/login': {
    description: 'Try it with the public demo shopper, then copy the returned token into **Authorize**.',
    body: { email: 'demo@cartzy.app', password: 'demo1234' },
  },
  'PUT /api/user/update': { body: { name: 'Rahul Patil', phone: '9876543210' } },
  'POST /api/user/address/add': { body: ADDRESS_EXAMPLE },
  'PUT /api/user/address/edit/{addressId}': { body: ADDRESS_EXAMPLE },
  'PUT /api/user/change-password': { body: { oldPassword: 'old-password', newPassword: 'new-password' } },
  'POST /api/admin/auth/signup': { body: { name: 'Store Admin', email: 'admin@example.com', password: 'secret123', adminKey: '<ADMIN_SIGNUP_KEY>' } },
  'POST /api/admin/auth/login': { body: { email: 'admin@example.com', password: 'secret123' } },
  'GET /api/user/products/search': { query: { query: 'phone' } },
  'GET /api/user/products/search-ecommerce': { query: { query: 'shoes' } },
  'GET /api/user/products/filter': { query: { category: '<categoryId>', brand: '<brandId>' } },
  'POST /api/user/products/filter/brand': { body: { brands: ['<brandId>'] } },
  'POST /api/user/products/filter/category': { body: { categories: ['<categoryId>'] } },
  'POST /api/user/products/filter/size': { body: { sizes: ['M', 'L'] } },
  'POST /api/user/products/filter/color': { body: { colors: ['black'] } },
  'POST /api/user/products/rate/{id}': { body: { rating: 5, review: 'Great value for money.' } },
  'POST /api/user/cart/add': { body: { productId: '<productId>' } },
  'PUT /api/user/cart/update': { body: { productId: '<productId>', quantity: 2 } },
  'POST /api/user/wishlist/add': { body: { productId: '<productId>' } },
  'POST /api/user/orders/place': { body: { addressId: '<addressId>', paymentMethod: 'COD', name: 'Rahul Patil', phone: '9876543210' } },
  'POST /api/user/return-exchange/return-exchange': {
    body: { orderId: '<orderId>', productId: '<productId>', type: 'Return', reason: 'Size does not fit', refundMethod: 'Original Payment Method' },
  },
};

// Map every exported controller function to its export name (route handlers are anonymous arrow functions).
function controllerNames(dir) {
  const names = new Map();
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js')) {
        for (const [name, fn] of Object.entries(require(p))) if (typeof fn === 'function') names.set(fn, name);
      }
    }
  };
  walk(dir);
  return names;
}

const sentence = (name) => {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function buildOpenApiSpec(mounts) {
  const names = controllerNames(path.join(__dirname, '..', 'controllers'));
  const paths = {};
  const tags = [];

  for (const { path: base, router, tag, admin } of mounts) {
    if (!tags.some((t) => t.name === tag)) tags.push({ name: tag });
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const route = layer.route;
      const fullPath = (base + (route.path === '/' ? '' : route.path)).replace(/:(\w+)/g, '{$1}');
      const handlers = route.stack.map((l) => l.handle);
      const secured = admin || handlers.some((h) => h.name === 'authenticate');
      const multipart = handlers.some((h) => h.name === 'multerMiddleware');
      const controller = handlers[handlers.length - 1];
      const opName = names.get(controller);

      for (const method of Object.keys(route.methods)) {
        const key = `${method.toUpperCase()} ${fullPath}`;
        const extra = details[key] || {};
        const op = {
          tags: [tag],
          summary: opName ? sentence(opName) : key,
          operationId: opName ? `${opName}_${method}_${fullPath.replace(/\W+/g, '_')}` : undefined,
          responses: { 200: { description: 'Success' }, 400: { description: 'Invalid request' } },
        };
        if (extra.description) op.description = extra.description;

        const params = [...fullPath.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
          name, in: 'path', required: true, schema: { type: 'string' },
        }));
        for (const [name, example] of Object.entries(extra.query || {})) {
          params.push({ name, in: 'query', required: false, schema: { type: 'string' }, example });
        }
        if (params.length) op.parameters = params;

        if (multipart) {
          op.requestBody = {
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } }, additionalProperties: true } } },
          };
        } else if (extra.body) {
          op.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object' }, example: extra.body } } };
        } else if (['post', 'put', 'patch'].includes(method)) {
          op.requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };
        }

        if (secured) {
          op.security = [{ bearerAuth: [] }];
          op.responses[401] = { description: 'Missing token' };
          op.responses[403] = { description: admin ? 'Invalid token or not an admin' : 'Invalid or expired token' };
        }
        (paths[fullPath] ||= {})[method] = op;
      }
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Cartzy E-commerce API',
      version: '1.0.0',
      description: [
        'REST API behind the Cartzy shopping app: catalog, cart, wishlist, checkout, orders, returns and a full admin API.',
        '',
        '**Try it:** run `POST /api/user/login` with the demo shopper (`demo@cartzy.app` / `demo1234`), copy the `token`, click **Authorize** and paste it.',
        'Admin endpoints need an admin token and are shown for reference.',
      ].join('\n'),
    },
    servers: [{ url: '/' }],
    tags,
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    paths,
  };
}

module.exports = { buildOpenApiSpec };
