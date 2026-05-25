---
project_name: prodigy-glasses-remake
user_name: Jarvis
date: 2026-05-22
sections_completed:
  - legacy_overview
  - technology_stack
  - data_model
  - api_inventory
  - auth_flow
  - payment_flow
  - background_jobs
  - frontend_architecture
  - environment_variables
  - dependencies
  - legacy_anomalies
status: complete
scope: legacy_brownfield_baseline
optimized_for_llm: true
---

# Project Context — Prodigy Glasses (Legacy MERN → Remake)

> **Vietnamese summary (cho người đọc):**
> File này là bản chụp nhanh (snapshot) của hệ thống legacy `Prodigy-glasses-MERN`
> — đầu vào cho dự án `prodigy-glasses-remake`. Mục tiêu là cung cấp đủ ngữ cảnh
> cho các skill phía sau (`bmad-product-brief`, `bmad-prd`,
> `bmad-create-architecture`, `bmad-create-ux-design`) mà không cần đọc lại toàn bộ
> codebase cũ. Nội dung kỹ thuật bên dưới giữ ở dạng tiếng Anh để khớp với code.
> Phần "Legacy anomalies" liệt kê các vấn đề bảo mật / dead code / mơ hồ
> mà Architect cần biết khi thiết kế hệ thống mới.

> **Scope note:** Unlike a typical "rules for AI agents" project context, this
> document captures the **legacy system** that the new `prodigy-glasses-remake`
> project is migrating away from. The new stack (target architecture) is
> intentionally **not** specified here — it is decided by `bmad-create-architecture`
> downstream. Treat every fact below as describing the _source_ system only.

---

## 1. Legacy System Overview

- **Repo on disk:** `/Users/trituyen/additional-folders/vscode/Prodigy-glasses-MERN/`
- **Domain:** E-commerce storefront for eyeglasses ("Prodigy Readers"). Sells
  glasses, supports cart/checkout, PayPal + Cash-on-Delivery, customer reviews,
  and an admin back office (users, products, orders, comments, categories).
- **Layout:** Two-package monorepo (no workspace tool — independent
  `package.json` files, no root manifest).
  - `client/` — Vite + React 19 SPA, Redux Toolkit, Ant Design, Tailwind v4.
  - `server/` — Node + Express 5, MongoDB via Mongoose, JWT auth, Nodemailer.
- **Local dev wiring:**
  - Backend listens on `process.env.PORT || 3001` and connects to a
    **hard-coded** `mongodb://localhost:27017/pgdglass` (env var read but
    overridden — see anomaly #A1).
  - Frontend Vite dev server is also configured to port `3001`
    (`client/vite.config.js`) — **port collision** with backend (anomaly #A2).
  - Frontend talks to backend via `import.meta.env.VITE_API_URL_BACKEND`
    (path prefix `/api`).
- **No tests.** No `test` script in either `package.json`. No `__tests__` or
  `*.test.*` files. Test libraries are installed (`@testing-library/*`) but
  unused.
- **No TypeScript.** Both packages are plain JS/JSX.
- **No CI/CD config** in the legacy repo (no `.github/`, no Dockerfile).
- **Deployment hint:** `@vercel/analytics` and `@vercel/speed-insights` are
  imported in `App.jsx`, suggesting the frontend was deployed to Vercel.

---

## 2. Technology Stack & Versions

### 2.1 Backend (`server/package.json`)

| Package                         | Version | Role                                             |
| ------------------------------- | ------- | ------------------------------------------------ |
| express                         | ^5.2.1  | HTTP framework (note: Express **5**, not 4)      |
| mongoose                        | ^9.6.1  | MongoDB ODM                                      |
| jsonwebtoken                    | ^9.0.3  | JWT signing & verification                       |
| bcrypt                          | ^6.0.0  | Password hashing (10 salt rounds)                |
| cors                            | ^2.8.6  | CORS middleware (open by default)                |
| cookie-parser                   | ^1.4.7  | Reads `refresh_token` cookie                     |
| body-parser                     | ^2.2.2  | Installed but **unused** (commented out)         |
| dotenv                          | ^17.4.2 | `.env` loading                                   |
| nodemailer                      | ^8.0.7  | Order confirmation emails (Gmail SMTP, port 465) |
| nodemailer-plugin-inline-base64 | ^2.1.1  | Inline base64 attachments in emails              |
| node-cron                       | ^4.2.1  | One scheduled job; runs every 1 minute           |
| nodemon                         | ^3.1.14 | Dev runner (used as `npm start`)                 |

- **Node version:** not pinned (`engines` missing).
- **Module system:** CommonJS (`require/module.exports`).
- **Lint/format:** none configured on the server.

### 2.2 Frontend (`client/package.json`)

| Package                               | Version | Role                                                                  |
| ------------------------------------- | ------- | --------------------------------------------------------------------- |
| react / react-dom                     | ^19.2.5 | UI runtime (React 19)                                                 |
| react-router-dom                      | ^7.14.2 | Routing (uses `BrowserRouter`)                                        |
| @reduxjs/toolkit                      | ^2.11.2 | State management                                                      |
| react-redux                           | ^9.2.0  | React bindings                                                        |
| redux-persist                         | ^6.0.0  | Persists `order` slice to localStorage (blacklist=`product,user`)     |
| @tanstack/react-query                 | 5.74.4  | Server-state caching (admin lists, product feeds)                     |
| antd                                  | ^6.3.7  | Forms, tables, modals, menus across admin                             |
| @mui/material + @emotion/\*           | ^9.0.0  | A few mixed MUI components (Linear/Circular Progress)                 |
| styled-components                     | ^6.4.1  | Some legacy styled components                                         |
| tailwindcss + @tailwindcss/postcss    | ^4.2.4  | Primary styling (via PostCSS)                                         |
| sass                                  | ^1.99.0 | A handful of `style.scss` files                                       |
| swiper / react-slick / slick-carousel | various | Sliders & carousels                                                   |
| recharts                              | ^3.8.1  | Admin dashboard charts                                                |
| react-helmet-async                    | ^3.0.0  | Per-route page titles                                                 |
| react-icons / @ant-design/icons       | various | Icon sets                                                             |
| react-loading-skeleton                | ^3.5.0  | Loading states                                                        |
| @paypal/react-paypal-js               | ^9.2.0  | PayPal SDK provider (installed but **bypassed** — see #A3)            |
| axios                                 | ^1.16.0 | HTTP client (`axiosJWT` instance with token interceptor)              |
| jwt-decode                            | ^4.0.0  | Decode JWT in browser                                                 |
| react-cookie                          | ^8.1.2  | Installed; not actively used in scanned code                          |
| date-fns                              | ^4.1.0  | Date formatting                                                       |
| lodash                                | ^4.18.1 | Utility functions                                                     |
| antd-table-saveas-excel               | ^2.2.1  | Export admin tables to Excel                                          |
| @vercel/analytics, /speed-insights    | ^2.0.x  | Vercel telemetry                                                      |
| dotenv                                | ^17.4.2 | Installed in client; Vite has its own env handling (likely redundant) |
| web-vitals                            | ^5.2.0  | Web vitals reporting                                                  |
| @testing-library/\*                   | various | Installed; **no tests written**                                       |

- **Build:** Vite ^5.4.19 with `@vitejs/plugin-react`.
- **Lint:** `.eslintrc.cjs` (legacy ESLint, but `eslint@^9.7.0` installed — config style mismatch).
  - Rules: double quotes, semicolons required, **`linebreak-style: windows`** (CRLF — will trip macOS/Linux contributors).
  - `react/prop-types` disabled.

---

## 3. Data Model (Mongoose → input for relational ERD)

All models live in `server/src/models/`. Each schema sets `{ timestamps: true }`,
so `createdAt` / `updatedAt` are implicit on every collection.

### 3.1 `User` (`UserModel.js`)

| Field    | Type    | Constraints                                                 |
| -------- | ------- | ----------------------------------------------------------- |
| name     | String  | optional                                                    |
| email    | String  | **required**, **unique**                                    |
| password | String  | **required** (bcrypt hash, 10 rounds)                       |
| isAdmin  | Boolean | **required**, default `false`                               |
| phone    | Number  | optional (stored as `Number`, **not String** — anomaly #A4) |
| address  | String  | optional                                                    |
| avatar   | String  | optional (URL or base64 — never validated)                  |
| city     | String  | optional                                                    |

### 3.2 `Product` (`ProductModel.js`)

| Field        | Type   | Constraints                                |
| ------------ | ------ | ------------------------------------------ |
| name         | String | **required**, **unique**                   |
| image        | String | required                                   |
| imageHover   | String | required                                   |
| imageDetail  | String | required                                   |
| type         | String | required (functions as category — see #A5) |
| price        | Number | required                                   |
| countInStock | Number | required                                   |
| rating       | Number | required (no min/max enforced)             |
| description  | String | optional                                   |
| discount     | Number | optional (percentage, 0–100)               |
| selled       | Number | optional (running tally)                   |

### 3.3 `ProductCategory` (`ProductCategory.js`)

| Field | Type   | Constraints              |
| ----- | ------ | ------------------------ |
| name  | String | required                 |
| slug  | String | **required**, **unique** |

> **Anomaly #A5 (important for ERD):** `Product.type` is a free-form string and
> is **NOT** a foreign key to `ProductCategory`. The legacy admin UI exposes
> Categories, but the catalog filters by `type` string match. Architect should
> decide whether to consolidate into a real FK in the new model.

### 3.4 `Order` (`OrderProduct.js` — collection `orders`)

| Field                    | Type                         | Constraints                                            |
| ------------------------ | ---------------------------- | ------------------------------------------------------ |
| orderItems               | Array of subdocs (see below) | required                                               |
| shippingAddress.fullName | String                       | required                                               |
| shippingAddress.address  | String                       | required                                               |
| shippingAddress.city     | String                       | required                                               |
| shippingAddress.phone    | Number                       | required (Number again — see #A4)                      |
| paymentMethod            | String                       | required (`"Cash on delivery"` \| `"Paypal E-Wallet"`) |
| itemsPrice               | Number                       | required                                               |
| shippingPrice            | Number                       | required                                               |
| totalPrice               | Number                       | required                                               |
| user                     | ObjectId → `User`            | required                                               |
| isPaid                   | Boolean                      | default `false`                                        |
| paidAt                   | Date                         | optional                                               |
| isDelivered              | Boolean                      | default `false`                                        |
| deliveredAt              | Date                         | optional                                               |
| scheduledDelivery        | Boolean                      | default `false` (cron-flag, see §6)                    |

`orderItems[]` subdocument:

| Field    | Type                 | Constraints                                 |
| -------- | -------------------- | ------------------------------------------- |
| name     | String               | required (denormalized snapshot of product) |
| amount   | Number               | required (quantity)                         |
| image    | String               | required (snapshot)                         |
| price    | Number               | required (snapshot)                         |
| discount | Number               | optional (snapshot)                         |
| type     | String               | required (snapshot)                         |
| product  | ObjectId → `Product` | required                                    |

> Order snapshots product fields at create time — change in `Product` afterward
> does not propagate. Architect: decide retain-snapshot vs FK-only.

### 3.5 `Comment` (`CommentModel.js` — product reviews)

| Field   | Type                 | Constraints                |
| ------- | -------------------- | -------------------------- |
| content | String               | required                   |
| star    | Number               | required, min `1`, max `5` |
| product | ObjectId → `Product` | required                   |
| user    | ObjectId → `User`    | required                   |

### 3.6 Indexes

- Implicit unique indexes on `User.email`, `Product.name`, `ProductCategory.slug`.
- **No other indexes declared.** Order/Comment lookups by `user` and `product`
  rely on collection scans + sort on `createdAt` — performance debt for
  Architect to address.

### 3.7 Implicit relationships (for ERD)

```
User 1───* Order      (Order.user)
User 1───* Comment    (Comment.user)
Product 1───* OrderItem (Order.orderItems[*].product, embedded)
Product 1───* Comment   (Comment.product)
ProductCategory ─/─ Product   (NO FK in legacy — see #A5)
```

---

## 4. Express API Inventory

Mounted in `server/src/index.js` via `routes(app)`; base prefix is `/api`.

Legend for **Auth**:

- `none` — no middleware.
- `admin` — `authMiddleWare` (requires JWT + `isAdmin === true`).
- `self|admin` — `authUserMiddleWare(false)` (JWT must match `:id` param OR be admin).
- `any-auth` — `authUserMiddleWare(true)` (JWT just needs to verify).

### 4.1 `/api/user` (`UserRouter.js`)

| Method | Path               | Auth        | Controller                                |
| ------ | ------------------ | ----------- | ----------------------------------------- |
| POST   | `/sign-up`         | none        | `createUser`                              |
| POST   | `/sign-in`         | none        | `loginUser`                               |
| POST   | `/log-out`         | none        | `logoutUser`                              |
| PUT    | `/update-user/:id` | self\|admin | `updateUser`                              |
| DELETE | `/delete-user/:id` | admin       | `deleteUser`                              |
| GET    | `/getAll`          | self\|admin | `getAllUser` (see #A6)                    |
| GET    | `/get-details/:id` | self\|admin | `getDetailsUser`                          |
| POST   | `/refresh-token`   | none\*      | `refreshToken` (token in `headers.token`) |
| POST   | `/delete-many`     | admin       | `deleteMany`                              |
| GET    | `/get-user/:id`    | **none**    | `getUserById` (see #A7)                   |

### 4.2 `/api/product` (`ProductRouter.js`)

| Method | Path               | Auth     | Controller                                                   |
| ------ | ------------------ | -------- | ------------------------------------------------------------ |
| GET    | `/get-all-type`    | none     | `getAllType`                                                 |
| GET    | `/get-all`         | none     | `getAllProduct` (supports `limit`, `page`, `sort`, `filter`) |
| GET    | `/get-details/:id` | none     | `getDetailsProduct`                                          |
| POST   | `/create`          | **none** | `createProduct` (see #A8)                                    |
| PUT    | `/update/:id`      | admin    | `updateProduct`                                              |
| DELETE | `/delete/:id`      | admin    | `deleteProduct`                                              |
| POST   | `/delete-many`     | admin    | `deleteMany`                                                 |

### 4.3 `/api/order` (`OrderRouter.js`)

| Method | Path                     | Auth        | Controller              |
| ------ | ------------------------ | ----------- | ----------------------- |
| POST   | `/create/:id`            | self\|admin | `createOrder`           |
| GET    | `/get-all-order/:id`     | self\|admin | `getAllOrderDetails`    |
| GET    | `/get-details-order/:id` | **none**    | `getDetailsOrder` (#A9) |
| DELETE | `/cancel-order/:id`      | self\|admin | `cancelOrderDetails`    |
| GET    | `/get-all-order`         | admin       | `getAllOrder`           |

### 4.4 `/api/comment` (`CommentRouter.js`)

| Method | Path                  | Auth        | Controller                                                          |
| ------ | --------------------- | ----------- | ------------------------------------------------------------------- |
| POST   | `/create`             | **none**    | `create` (#A10)                                                     |
| GET    | `/get-all`            | none        | `getAllComment`                                                     |
| DELETE | `/delete-comment/:id` | any-auth    | `deleteComment`                                                     |
| GET    | `/get-details/:id`    | malformed\* | `getDetailsComment` (passes middleware factory directly — see #A11) |
| POST   | `/delete-many`        | admin       | `deleteManyComment`                                                 |

### 4.5 `/api/payment` (`PaymentRouter.js`)

| Method | Path      | Auth | Behavior                                           |
| ------ | --------- | ---- | -------------------------------------------------- |
| GET    | `/config` | none | Returns `process.env.CLIENT_ID` (PayPal client ID) |

There is **no PayPal capture/webhook endpoint**. Payment success is determined
client-side only (see §5).

---

## 5. Authentication & Payment Flows

### 5.1 Auth flow

1. **Sign-up / sign-in** (`UserService` server):
   - Email regex validated client + server.
   - Server hashes password with `bcrypt.hashSync(password, 10)` and stores it.
   - On sign-in: server issues
     - `access_token` — `jwt.sign(payload, process.env.ACCESS_TOKEN, { expiresIn: '2h' })`
     - `refresh_token` — `jwt.sign(payload, process.env.REFRESH_TOKEN, { expiresIn: '365d' })`
     - Sets `refresh_token` as `httpOnly` cookie **and** also returns it in JSON
       body (anomaly #A12 — defeats httpOnly).
   - JWT payload: `{ id, isAdmin }`.
2. **Client-side token handling** (`client/src/App.jsx`):
   - Reads `access_token` and `refresh_token` from `localStorage`
     (stored as JSON-stringified strings — see #A13).
   - On boot: decodes access token, fetches user details, hydrates Redux
     `user` slice.
   - `axiosJWT` (custom axios instance) has a request interceptor that, if
     `access_token` is expired but `refresh_token` is valid, calls
     `/api/user/refresh-token` and rewrites the `token` header.
3. **Server middleware** (`authMiddleware.js`):
   - All requests must send header `token: "Bearer <access_token>"`.
   - `authMiddleWare` — verifies, requires `isAdmin === true`. Returns `404`
     (not `401/403`) on failure.
   - `authUserMiddleWare(isAuthMe)` factory — passes if `user.isAdmin` OR
     `user.id === req.params.id` OR `isAuthMe === true`. **Two assignment
     bugs** inside (`req.userId === user?.id` uses `===` instead of `=` —
     never actually attaches user to request → see #A14).
4. **Logout:** clears the `refresh_token` cookie only. The access token stays
   valid for up to 2h on the client; no server-side blocklist.

### 5.2 Payment flow (PaymentPage)

`client/src/pages/PaymentPage/PaymentPage.jsx` is the checkout page.

- User picks a delivery method (`fast` 30,000₫ / `economical` 15,000₫) and
  payment method (`Cash on delivery` / `Paypal E-Wallet`).
- COD path: clicks "Place order" → `OrderService.createOrder` → server
  decrements `Product.countInStock` (atomic `$inc` guard:
  `countInStock: { $gte: order.amount }`), creates `Order`, and triggers
  `EmailService.sendEmailCreateOrder` (Nodemailer over Gmail SMTP).
- PayPal path:
  - On mount, `PaymentService.getConfig()` calls `GET /api/payment/config`
    (note: hard-coded URL `http://localhost:3000` in code — anomaly #A15).
  - A `<script>` tag is appended manually to `document.body` to load the
    PayPal SDK using the returned client ID (despite `<PayPalScriptProvider>`
    already wrapping the app in `main.jsx` — duplicated and conflicting; see #A3).
  - On `onApprove` of `<PayPalButtons>`: client calls the same
    `OrderService.createOrder` with `isPaid: true, paidAt: new Date()`.
  - **No server-side verification of PayPal payment.** Client just claims
    "isPaid" and the server trusts it (anomaly #A16 — critical for Architect).
- Email side-effect on order create: `EmailService.sendEmailCreateOrder`
  awaits Gmail SMTP send inside the request lifecycle (no queue, blocks the
  HTTP response — anomaly #A17).

---

## 6. Background Jobs (`node-cron`)

Defined inside `server/src/models/OrderProduct.js` (file-side-effect at
`require` time, runs once per process).

- **Active job:** `cron.schedule("*/1 * * * *", ...)` — every minute.
- Logic: any order whose `createdAt` is older than `3 * 40 * 1000` ms (= 120s)
  and that is still `isDelivered: false, scheduledDelivery: false` is
  bulk-updated to `{ isDelivered: true, scheduledDelivery: true, isPaid: true,
deliveredAt: now, paidAt: now }`.
- Two earlier variants of this job (5-minute and 24h cadence) are commented
  out above.
- **Purpose appears to be a demo "auto-deliver" simulation, not real
  fulfillment.** Architect should treat as throwaway and design real
  state machine (anomaly #A18).
- **Cron lives in a model file**, which means importing the model from a
  test or script will spin up the scheduler unintentionally.

---

## 7. Frontend Architecture

### 7.1 Route map (`client/src/routes/index.js`)

All routes registered in a single `routes` array consumed by `App.jsx`.
`isShowHeader: true` wraps the page in `<DefaultComponent>` (header + footer).
`isPrivated` is set on `/system/admin` but the prop is **not enforced by the
router** — admin guard is done inside the page (`localStorage.getItem("isAdmin")`).

| Path                   | Page Component       | Layout  | Notes                              |
| ---------------------- | -------------------- | ------- | ---------------------------------- |
| `/`                    | `HomePage`           | Default | Landing                            |
| `/products`            | `ProductsPage`       | Default | All products + search              |
| `/product/:type`       | `TypeProductPage`    | Default | Filtered by `Product.type` string  |
| `/product-details/:id` | `ProductDetailsPage` | Default | PDP + reviews                      |
| `/payment`             | `PaymentPage`        | Default | Checkout (see §5.2)                |
| `/orderSuccess`        | `OrderSuccess`       | Bare    | Receives data via `location.state` |
| `/my-order`            | `MyOrder`            | Default | User order history                 |
| `/details-order/:id`   | `DetailsOrderPage`   | Default | Single order view                  |
| `/sign-in`             | `SignInPage`         | Default | Eagerly imported (rest are lazy)   |
| `/sign-up`             | `SignUpPage`         | Default | Lazy                               |
| `/profile-user`        | `ProfilePage`        | Default | Lazy                               |
| `/system/admin`        | `AdminPage`          | Bare    | Lazy; client-side admin guard only |
| `*`                    | `NotFoundPage`       | (none)  | 404                                |

### 7.2 Redux store shape (`client/src/redux/store.js`)

```
store
├── product   → { search: string }                              (productSlide)
├── user      → { id, name, email, phone, address, avatar,      (userSlide)
│                 city, isAdmin, access_token, refreshToken }
└── order     → { orderItems[], orderItemsSelected[],           (orderSlide)
                  shippingAddress, paymentMethod,
                  itemsPrice, shippingPrice, taxPrice, totalPrice,
                  user, isPaid, paidAt, isDelivered, deliveredAt,
                  isSucessOrder }
```

- Persisted with `redux-persist` to localStorage, **blacklist** = `['product','user']`
  → only `order` slice is persisted across reloads.
- `userSlide.updateUser` reducer treats falsy fields as "no-op" — so passing
  `isAdmin: false` after a previous `true` will silently fail to clear it
  (anomaly #A19).
- `orderSlide.addOrderProduct` checks `itemOrder.amount <= itemOrder.countInstock`
  — note typo `countInstock` vs schema `countInStock` (anomaly #A20).

### 7.3 Major frontend folders

```
client/src/
├── App.jsx                routing + JWT bootstrap + axios interceptor
├── main.jsx               React root, PayPalScriptProvider, RTK Provider
├── routes/index.js        route table (above)
├── redux/
│   ├── store.js           persistReducer wiring
│   └── slides/            user, product, order slices
├── services/              axios wrappers per domain
│   ├── UserService.js     exports `axiosJWT` (shared instance)
│   ├── ProductService.js
│   ├── OrderService.js
│   ├── CommentService.js
│   └── PaymentService.js
├── hooks/
│   ├── useDebounce.js
│   └── useMutationHook.js (thin wrapper over @tanstack/react-query useMutation)
├── pages/                 13 page directories (see §7.1)
├── components/            ~50 component folders
│   ├── AdminUser, AdminProduct, AdminOrder, AdminComment,
│   │ AdminCategory, AdminDashboard
│   ├── DefaultComponent (layout shell — header + footer)
│   ├── Header, NavbarComponent, HeaderSearchResult, AwwMenu
│   ├── CardProduct, ProductDetails, RandomProduct, TypeChart,
│   │ TypeProductBanner, TypeProductHeader, TypesWrap, WrapProductRoute
│   ├── OrderCart, OrderAdmin, ResultProductSearch
│   ├── CommentsComponent, ReviewForm, VerifyRemoveComment, LikeButtonComponent
│   ├── ButtonComponent, ButtonOutline, ButtonSolid, InputComponent, InputForm
│   ├── DrawerComponent, ModalComponent, TableComponent
│   ├── LoadingComponent, Notification, Message
│   ├── LinearProgressWithLabel, LinearWithValueLabel,
│   │ CircularProgressWithLabel, CircularWithValueLabel
│   ├── SlideShow, SlideShowProDetail, SwiperWrapper, Marquee, Picture
│   ├── ScrollBarPercent, ScrollToTop, ToTopWhenChangeRoute, StepConponent (sic)
│   └── Test
├── layout/                Footer, Section
├── assets/images/         images
└── scss/, App.css, index.css
```

### 7.4 Notable conventions

- API calls use `import.meta.env.VITE_API_URL_BACKEND` as base; `/api` prefix
  is part of the env value, not added in code.
- Auth header convention: `token: "Bearer <jwt>"` (custom header — **not**
  `Authorization`; matches `req.headers.token.split(" ")[1]` on server).
- Error handling pattern: every service `try/catch`es and `console.log`s;
  some swallow errors silently (e.g. `CommentService.deleteComment` returns
  `undefined` on failure).
- The codebase contains **a lot of commented-out alternate implementations**
  (3+ MongoDB connection strings, multiple cron variants, alt route imports).
  Treat them as historical noise, not active code.

---

## 8. Environment Variables

> Values are **not** echoed; only key names are listed.

### 8.1 `server/.env`

| Key             | Used by                              | Notes                                                                                                                 |
| --------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `PORT`          | `index.js`                           | Defaults to 3001 if unset                                                                                             |
| `MONGOOSE_DB`   | (unused — see #A1)                   | Code path that reads it is commented out; actual connection string is hard-coded `mongodb://localhost:27017/pgdglass` |
| `ACCESS_TOKEN`  | `JwtService.js`, `authMiddleware.js` | JWT secret for access token                                                                                           |
| `REFRESH_TOKEN` | `JwtService.js`                      | JWT secret for refresh token                                                                                          |
| `CLIENT_ID`     | `PaymentRouter.js` `/config`         | PayPal client ID (sent to browser)                                                                                    |
| `MAIL_ACCOUNT`  | `EmailService.js`                    | Gmail address (note trailing space in key — see #A21)                                                                 |
| `MAIL_PASSWORD` | `EmailService.js`                    | Gmail app password (trailing space in key)                                                                            |

### 8.2 `client/.env`

| Key                    | Used by                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `VITE_API_URL_BACKEND` | All `services/*.js` axios calls                                         |
| `VITE_CLIENT_ID`       | `<PayPalScriptProvider>` in `main.jsx` (parallel to server `CLIENT_ID`) |

> Note: the variable name in the **server** `.env` file actually reads
> `MONGOOSE_DB`, but `server/src/index.js` reads `process.env.MONGO_DB` in a
> commented-out line. Neither is currently active. The live value is
> hard-coded.

---

## 9. Build / Run Scripts

### 9.1 Server (`server/package.json`)

```
"scripts": {
  "start": "nodemon src/index.js"
}
```

- No `build`, no `test`, no `lint`, no `dev` separate from `start`.
- Production deployment would need a different entrypoint (no `node`-only script).

### 9.2 Client (`client/package.json`)

```
"scripts": {
  "dev":     "vite",
  "build":   "vite build",
  "lint":    "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview"
}
```

- Vite default outputs to `client/dist/` (already present in repo).
- Note: ESLint config (`.eslintrc.cjs`) targets ESLint 8 style; package
  installs ESLint 9. Linting may fail without flat config migration.

---

## 10. Legacy Anomalies (must-read for Architect)

Tagged so the downstream Architect skill can reference them.

- **#A1** — **Hard-coded Mongo URI.** `server/src/index.js` ignores
  `process.env.MONGO_DB`/`MONGOOSE_DB` and connects to
  `mongodb://localhost:27017/pgdglass`. Move to env in remake.
- **#A2** — **Port collision.** `server/src/index.js` defaults to `3001`
  and `client/vite.config.js` also sets `server.port = 3001`. Cannot run both
  locally without override.
- **#A3** — **Double PayPal SDK load.** `<PayPalScriptProvider>` wraps the
  app in `main.jsx`, AND `PaymentPage` also injects a `<script>` tag manually.
  Two SDK instances; behavior depends on which loads first.
- **#A4** — **Phone stored as `Number`.** Loses leading zeros; cannot store
  international format. Should be `String` in remake.
- **#A5** — **`Product.type` is a string, not FK to `ProductCategory`.** The
  Category collection exists but is not referenced from products. Decide on
  consolidation in the new model.
- **#A6** — **`/api/user/getAll` is gated by `authUserMiddleWare(false)` with
  `:id`-style logic but the route has no `:id`.** Effectively any logged-in
  user can list all users (the `user.id === undefined` branch falls through).
- **#A7** — **`GET /api/user/get-user/:id` has no auth.** Anyone can fetch any
  user record (including hashed password — `User.findOne` returns the full
  doc). Critical PII leak.
- **#A8** — **`POST /api/product/create` has no auth.** Any unauthenticated
  client can create products.
- **#A9** — **`GET /api/order/get-details-order/:id` has no auth.** Any caller
  with an order id can read a stranger's order.
- **#A10** — **`POST /api/comment/create` has no auth.** Anyone can post a
  review attributed to any `userId` they pass in the body.
- **#A11** — **CommentRouter `get-details/:id` passes `authUserMiddleWare`
  (the factory) instead of `authUserMiddleWare(true)`** — middleware is a
  function-returning-function, so Express receives a factory and the route is
  effectively unguarded / behaves erratically.
- **#A12** — **Refresh token leaked in JSON body** (in addition to httpOnly
  cookie), and the client stores it in `localStorage`. Defeats httpOnly.
- **#A13** — **Tokens stored in `localStorage` as JSON-stringified strings**,
  retrieved with `JSON.parse(localStorage.getItem(...))`. Vulnerable to XSS.
- **#A14** — **Bug in `authUserMiddleWare`**: `req.userId === user?.id;` and
  `req.isAdmin === true;` use `===` (comparison, not assignment). Downstream
  `req.userId` / `req.isAdmin` are always `undefined`.
- **#A15** — **`PaymentService.getConfig` hard-codes `http://localhost:3000`**
  as the backend URL (rest of the app uses port 3001 via env). Will fail in
  production.
- **#A16** — **No server verification of PayPal capture.** Client claims
  `isPaid: true`. Trivially forgeable. Critical security gap for remake.
- **#A17** — **Order email sent inline.** Blocks the response on Gmail SMTP;
  any SMTP failure surfaces as an order failure.
- **#A18** — **Cron auto-marks orders delivered/paid every minute after
  ~120 s.** This is a demo simulation, not real fulfillment. Lives inside
  a model file.
- **#A19** — **`userSlide.updateUser` skips falsy values**, so demoting an
  admin (`isAdmin: false`) silently fails until `resetUser` is called.
- **#A20** — **Casing typo `countInstock` vs `countInStock`** in
  `orderSlide.addOrderProduct` — the stock check is always `undefined <= undefined`
  → effectively no client-side guard.
- **#A21** — **Trailing spaces in `.env` keys** (`ACCESS_TOKEN `,
  `MAIL_ACCOUNT `, `MAIL_PASSWORD `). Some loaders strip them; safer to
  re-key on rewrite.
- **#A22** — **CORS wide open.** `app.use(cors())` accepts any origin.
- **#A23** — **`getDetailsUser` returns the full user doc including hashed
  password.** Even though hashed, it should be projected out.
- **#A24** — **No request validation library** (no joi/zod). All validation
  is hand-rolled, mostly client-side, easily bypassed.
- **#A25** — **`countInStock`, `selled`, `discount` are unbounded.** Negative
  or absurdly large values are accepted; `discount` has no 0–100 enforcement.
- **#A26** — **Product image fields are arbitrary strings.** Some are URLs,
  some appear to be base64 (`50mb` body limit suggests base64 uploads). No
  storage strategy.
- **#A27** — **Mixed UI libraries** (Ant Design + MUI + styled-components +
  Tailwind v4 + SCSS). Visual consistency depends on the page. UX designer
  should pick one design system for the remake.

---

## 11. Open questions / unknowns (need human input)

- **Target stack for the remake** — explicitly out of scope for this file;
  expected to come from `bmad-create-architecture`. The user's
  `migration-draft-plan.md` mentions MySQL and Architect-driven ERD, but no
  decision is recorded yet.
- **Whether the PayPal flow must be preserved** (vs. swap to a different
  gateway) — unknown; PRD/product brief should answer.
- **Whether `Product.type` consolidates into `ProductCategory`** in the new
  schema — unknown; needs Architect call.
- **Production deployment topology of the legacy app** — only Vercel
  analytics imports hint at frontend hosting; backend host unknown.
- **Whether COD orders must remain manual** — unknown.
- **Whether reviews require purchase verification** — currently any
  unauthenticated user can post a review (#A10).
- **Inventory of categories actually populated** — `ProductCategory`
  collection contents not inspected; cron / admin UI suggest at least a few.
- **Exact list of product `type` values used in production** — would be
  useful for migration; not enumerated in code.

---

## 12. Usage guidelines

**For downstream BMad skills:**

- `bmad-product-brief` — read §1, §10, §11.
- `bmad-prd` — read §1, §4 (feature surface), §5 (auth + payment),
  §7.1 (page/feature inventory), §10 (issues to fix), §11.
- `bmad-create-architecture` — read §3 (data model), §4 (API), §6
  (background jobs), §10 (anomalies), §11.
- `bmad-create-ux-design` — read §7 (frontend), §10 (#A27 mixed libraries),
  §1 (domain).

**Maintenance:** This document describes the **legacy** baseline. Once the
remake is underway, update §1 and §10 only when scope changes; do **not**
overwrite legacy facts here — record new-stack rules in a separate
`project-context.md`-style file scoped to the new codebase.

Last Updated: 2026-05-22
