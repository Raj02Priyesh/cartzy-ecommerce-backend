# Cartzy - E-commerce REST API

A production-style backend for an online store: product catalog, cart, wishlist, orders with tracking, returns/exchanges, ratings, and a full admin panel API.

**Live API:** https://cartzy-ecommerce-backend.onrender.com
Try it: [`GET /api/user/products/all`](https://cartzy-ecommerce-backend.onrender.com/api/user/products/all)

> Hosted on Render's free tier - the first request after ~15 minutes idle can take up to a minute while the server wakes up.

**Demo shopper login:** `demo@cartzy.app` / `demo1234` - a public sample account (shopper role only; its password can't be changed).

**Client app:** this API powers the [Cartzy Flutter shopping app](https://github.com/Raj02Priyesh/cartzy-shop-app) - [try it in your browser](https://raj02priyesh.github.io/cartzy-shop-app/).

---

## Features

**Shoppers**
- Sign up / log in with JWT authentication (bcrypt-hashed passwords)
- Browse products by category, brand, keyword, size or colour; similar-product suggestions
- Wishlist (with "move to cart"), cart with live totals and recommendations
- Multiple saved addresses, checkout, cash-on-delivery or prepaid orders
- Order history, order tracking (processing → shipped → out for delivery → delivered)
- Return / exchange requests within 14 days of delivery
- Product ratings and reviews

**Admins**
- Product management: add/edit/delete, stock, discounts, availability, image upload (AWS S3)
- Categories (with sub-categories) and brands
- Order management: status, delivery agent, tracking dates, payment status, cancellation
- Return/exchange processing
- Customer management: search, edit, disable/enable accounts
- Storefront content: home-page banners, top categories, best sellers, notifications
- Serviceable postal-code management and shipping-address verification

**Security**
- Role-based access control - every admin route requires an `admin` token
- Disabled accounts cannot log in
- Admin registration protected by a secret key
- No secrets in the repo (`.env` is git-ignored; see `.env.example`)

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Database | MongoDB Atlas with Mongoose |
| Auth | JSON Web Tokens, bcrypt |
| File uploads | Multer + AWS S3 (optional) |
| Hosting | Render (API), MongoDB Atlas (database) |

## Project structure

```
config/        database connection
controllers/   request handlers (admin/ and user/)
helpers/       AWS S3 upload helper
middlewares/   authentication and role checks
models/        Mongoose schemas
routes/        route definitions (admin/ and user/)
scripts/       end-to-end smoke test
docs/          Postman collection
```

## API overview

All endpoints are prefixed with `/api`. Shopper endpoints need an `Authorization: Bearer <token>` header; admin endpoints need an **admin** token.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/user/signup` | Register a shopper |
| POST | `/user/login` | Log in, returns a JWT |
| POST | `/admin/auth/signup` | Register an admin (requires `adminKey`) |
| POST | `/admin/auth/login` | Admin log in |

### Catalog (public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/user/products/all` | All products |
| GET | `/user/products/id/:id` | Product details |
| GET | `/user/products/search?query=` | Keyword search |
| GET | `/user/products/category/:categoryId` | Products in a category |
| GET | `/user/products/similar/:id` | Similar products |
| POST | `/user/products/filter/{brand,category,size,color}` | Filter products |
| GET | `/user/categories/all` | All categories |
| GET | `/user/brands/all` | All brands |
| GET | `/user/home-page/{banners,top-categories,best-selling-products}` | Storefront content |

### Shopper (login required)
| Method | Endpoint | Description |
|---|---|---|
| PUT | `/user/update` | Update name / phone |
| POST · PUT · DELETE | `/user/address/{add, edit/:id, remove/:id}` | Manage addresses |
| GET · POST · DELETE | `/user/wishlist`, `/user/wishlist/add`, `/user/wishlist/move-to-cart/:productId` | Wishlist |
| GET · POST · PUT | `/user/cart`, `/user/cart/add`, `/user/cart/update` | Cart |
| GET | `/user/cart/checkout` | Checkout summary |
| POST | `/user/orders/place` | Place an order |
| GET | `/user/orders`, `/user/orders/:orderId` | Order history / details |
| PUT | `/user/orders/cancel/:orderId` | Cancel a pending order |
| GET | `/user/tracking/track/:orderId` | Track an order |
| POST · GET | `/user/return-exchange/return-exchange` | Request / list returns |
| POST | `/user/products/rate/:id` | Rate a product |

### Admin (admin token required)
| Area | Base path |
|---|---|
| Products | `/admin/products` - `add`, `edit/:id`, `delete/:id`, `set-stock/:id`, `assign-discount/:id`, `all`, `search` |
| Categories | `/admin/category` |
| Brands | `/admin/brands` |
| Orders | `/admin/orders/orders` - `:id/status`, `:id/tracking`, `:id/payment-status`, `:id/delivery-agent`, `:id/cancel` |
| Returns | `/admin/return-exchange/return-exchange/:requestId` |
| Customers | `/admin/user-management/users` - search, update, `disable`, `enable` |
| Home page | `/admin/home-page` - banners, top categories, best sellers |
| Notifications | `/admin/notifications` |
| Postal codes | `/admin/postal-codes` |

A complete **Postman collection** with example requests is in [`docs/`](docs/Ecommerce_Nodejs.postman_collection.json). Set the collection variables `baseUrl`, `adminToken` and `userToken` after logging in.

## Run locally

```bash
git clone https://github.com/Raj02Priyesh/cartzy-ecommerce-backend.git
cd cartzy-ecommerce-backend
npm install
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET and ADMIN_KEY
npm run dev            # http://localhost:5000
```

AWS S3 variables are only needed for image uploads; everything else works without them.

To load demo data (8 categories, 5 brands, 12 products, home-page banners, best sellers and the demo shopper account):

```bash
npm run seed
```

The seed is idempotent - running it again updates the demo items instead of duplicating them. Product photos are free-licence images from [Unsplash](https://unsplash.com/license).

## Testing

An end-to-end smoke test exercises **68 checks** across the whole shopping flow - sign-up, catalog, cart maths, checkout, order tracking, returns, ratings, and security (role checks, disabled accounts, demo-account lock):

```bash
npm run test:smoke                                             # against localhost
BASE_URL=https://cartzy-ecommerce-backend.onrender.com npm run test:smoke   # against the live API
```

It creates its own test users and data, and removes the catalog items it created when it finishes.

**Continuous integration:** every push and pull request runs `npm audit` and the full smoke test on GitHub Actions against a fresh MongoDB instance ([workflow](.github/workflows/ci.yml)).

## License

[MIT](LICENSE) © Priyesh Raj
