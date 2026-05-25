---
title: PRD — Prodigy Glasses Remake
project: prodigy-glasses-remake
status: final
created: 2026-05-24
updated: 2026-05-24
author: Jarvis
intent: create
---

# PRD — Prodigy Glasses Remake

> Status: 🟢 FINAL — Reviewer Gate passed (PASS-WITH-FIXES, all autofixed), editorial polish applied.
>
> **Reading order**: This PRD inherits from `brief.md` (status=complete) and `project-context.md` (legacy snapshot, 27 anomalies #A1–#A27). The brief carries the _why_ and the strategic shape; the PRD carries the _what_ and the testable acceptance criteria.
>
> **Bilingual style**: Section headers and FR/AC/NFR content in English (technical discipline). Explanatory commentary in Vietnamese where it earns its place. Implementation depth lives in the Architecture phase, not here.

---

## 1. Overview

### 1.1 Product summary

Prodigy Glasses Remake là greenfield rewrite của hệ MERN cũ thành **modular monolith production-grade** — NestJS + TypeORM + MySQL + Redis ở backend, Next.js App Router + RSC ở frontend. Sản phẩm đầu ra là một e-commerce cửa hàng kính mắt đầy đủ tính năng (auth, catalog, cart, checkout PayPal sandbox + COD, reviews, admin module) với security baseline, observability, và CI quality gate ở mức portfolio. Audience chính là recruiter / engineering hiring manager review CV của Jarvis; audience phụ là 2 lớp user nghiệp vụ (customer "Mai" + admin "anh Tuấn") để giữ business logic sát thực tế.

### 1.2 Goals

1. Showcase fullstack depth (frontend-focus) đủ thuyết phục senior reviewer trong 5-15 phút lướt repo.
2. Đạt functional parity với hệ MERN cũ trên 5 domain chính (Auth, Catalog, Cart/Order, Payment, Admin) — không pretend làm production e-commerce.
3. Đóng được 24 trong 27 legacy anomalies bằng commit có thể truy vết (xem brief Section 3.3 table) — security awareness signal.
4. Đạt non-functional quality bar có thể đo: Lighthouse ≥90 trên PLP/PDP, coverage ≥70% service layer, 7 E2E flows green trong CI.
5. Sản xuất artifact phụ recruiter-facing chất lượng: ≥6 ADRs, ≥3 architecture diagrams, animated GIF demos, README "run locally <5 phút".

### 1.3 Non-goals

Tham chiếu trực tiếp brief Section 8 (Out-of-scope) cho danh sách đầy đủ. Bốn nhóm chính:

- **Architecture-level**: Microservices, gRPC, Kafka, Saga, Outbox, Strangler/dual-write — defer to "future work".
- **Operational**: CD, multi-environment, secret management — defer post-MVP.
- **Product-level**: i18n, multi-currency, search engine, recommendations, wishlist, coupons, product variants, returns, social auth, 2FA, mobile apps.
- **Frontend-specific**: Dark mode, PWA, pixel-perfect Figma, WCAG AAA audit, RTL.

PRD không repeat lý do skip — brief Section 8 đã document đầy đủ.

### 1.4 Success criteria

Tham chiếu brief Section 5.3 (Exit gate). Project tuyên bố hoàn thành khi cả 8 điều kiện đều ✅:

1. 7/7 E2E Playwright flows green trong CI.
2. Coverage ≥70% trên service layer (Auth, Catalog, Order, Payment).
3. Lighthouse ≥90 trên PLP và PDP.
4. 24 in-scope anomalies fixed với commit linked.
5. ≥6 ADRs published trong `docs/ADRs/`.
6. README có đủ 8 thành phần (pitch, badges, run-local, architecture diagram, anomalies table, GIFs, future work, test/coverage badges).
7. External developer test: clone → `docker compose up` → browse PLP < 5 phút.
8. `bmad-code-review` + `bmad-review-edge-case-hunter` clean (hoặc known issues documented).

Targets cụ thể từng metric ở brief Section 5.1 + 5.2.

---

## 2. Personas

> Personas đầy đủ (motivation, anti-JTBD, profile depth) ở brief Section 2. PRD chỉ giữ summary để FRs có anchor.

### 2.1 Recruiter / Engineering hiring manager (PRIMARY)

Senior engineer hoặc EM, time budget 5-15 phút lướt GitHub. Đã review hàng trăm portfolio cargo-cult; radar bén với code mỏng và README đẹp nhưng commit thưa.

**Key JTBDs**

- Verify nhanh trade-off awareness, không chỉ pattern names → addressed bởi ADRs + decision log.
- Đánh giá frontend depth: RSC patterns đúng chỗ, không `'use client'` everywhere → addressed bởi RSC matrix + ISR + Suspense.
- Đánh giá backend solid: security baseline, không CORS open → addressed bởi 24 anomaly fixes + JWT rotation + webhook verify.

### 2.2 Mai — Customer (SECONDARY, 25-35 tuổi, mua online)

Mua kính online vì không có thời gian ra cửa hàng, đọc reviews kỹ trước khi quyết định.

**Key JTBDs**

- Browse catalog với filter category + price + rating, kết quả nhanh.
- Xem PDP với multi-image, reviews, stock real-time để tin tưởng.
- Checkout PayPal hoặc COD, nhận confirm email tức thì.
- Track order qua "My Orders" page.

### 2.3 Anh Tuấn — Admin (SECONDARY, owner/staff)

Quản lý cửa hàng hàng ngày: cập nhật catalog, xử lý đơn, trả lời comment.

**Key JTBDs**

- Thêm product mới với ảnh, category, discount, validate stock.
- Thấy đơn mới realtime, mark delivered, nhìn KPI dashboard.
- Delete comment xấu nhanh nhưng có audit trail.

---

## 3. Functional Requirements

> **Stable IDs**: FR-NN. Once assigned, never renumber. Sequential trong group, leave gaps cho future additions.
>
> **Format**: Mỗi FR có `Capability` (1 sentence what user can do), `Acceptance Criteria` (testable, concrete), `Dependencies` (FRs blocking this), `Anomaly fix` (legacy #A reference if applicable), `Notes` (edge cases / constraints).
>
> **Granularity rule**: Mỗi FR phải small enough để là 1 story candidate trong sprint plan, big enough để không fragment. Implementation depth (which class, which decorator) lives in Architecture phase, NOT here.

### 3.1 Authentication & Identity (FR-01..FR-09)

#### FR-01: User sign-up

- **Capability**: Khách (chưa đăng nhập) tạo tài khoản mới bằng email + password + tên + số điện thoại.
- **Acceptance Criteria**:
  - AC1: `POST /api/auth/sign-up` với body `{ email, password, name, phone }` hợp lệ → 201 trả về `{ user: { id, email, name, role: 'USER' }, accessToken }`. `password` KHÔNG xuất hiện trong response.
  - AC2: Email format invalid (regex fail) → 400 với error `email` field. Password <8 ký tự → 400 với error `password` field.
  - AC3: Email đã tồn tại → 409 conflict với message `email_already_registered`, KHÔNG leak thông tin user hiện hữu.
  - AC4: `phone` được lưu dưới dạng `string` (giữ leading zeros, hỗ trợ format `+84...`).
  - AC5: Password hash bằng bcrypt với cost ≥10 trước khi persist; raw password không bao giờ được log.
  - AC6: Refresh token được set qua `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`. KHÔNG có refresh token trong JSON body.
- **Dependencies**: FR-09.
- **Anomaly fix**: `#A4` (phone as String), `#A12` (refresh token httpOnly cookie ONLY), `#A23` (DTO projection — no password hash).
- **Notes**: Validation qua class-validator + Zod; shared schema export từ `packages/shared-types`.

#### FR-02: User sign-in

- **Capability**: User đã đăng ký đăng nhập bằng email + password.
- **Acceptance Criteria**:
  - AC1: `POST /api/auth/sign-in` với credentials đúng → 200 trả về `{ user, accessToken }` + Set-Cookie refresh token (httpOnly).
  - AC2: Email không tồn tại HOẶC password sai → 401 với message generic `invalid_credentials` (không phân biệt 2 case → tránh user enumeration).
  - AC3: Access token TTL ~15 phút; refresh token TTL 7 ngày (configurable via env).
  - AC4: JWT payload chỉ chứa `{ sub: userId, role }` — không bao giờ chứa email, name, password hash.
- **Dependencies**: FR-01, FR-04.
- **Anomaly fix**: `#A12`, `#A13` (no localStorage on FE), `#A24` (request validation).
- **Notes**: Frontend lưu access token trong React state/memory only; refresh qua cookie.

#### FR-03: User sign-out

- **Capability**: User đăng nhập thoát phiên hiện tại.
- **Acceptance Criteria**:
  - AC1: `POST /api/auth/sign-out` với valid access token → 204. Server thêm access token JTI vào Redis blacklist với TTL = remaining token lifetime.
  - AC2: `Set-Cookie: refresh_token=; Max-Age=0` clear refresh cookie.
  - AC3: Refresh token family bị revoke trong DB.
  - AC4: Sau sign-out, dùng access token cũ → 401 `token_revoked`.
- **Dependencies**: FR-02, FR-04.
- **Anomaly fix**: none (legacy chỉ clear cookie, không blacklist).
- **Notes**: Blacklist namespace `auth:blacklist:{jti}`.

#### FR-04: JWT access + refresh rotation

- **Capability**: Refresh access token bằng refresh token cookie với rotation discipline.
- **Acceptance Criteria**:
  - AC1: `POST /api/auth/refresh` (no body, refresh token đọc từ httpOnly cookie) → 200 trả về `{ accessToken }` + Set-Cookie refresh token mới.
  - AC2: Mỗi lần rotate: refresh token cũ bị mark `rotated`, token mới được issue với `parent_id` link tạo refresh token family.
  - AC3: Refresh token expired → 401 `refresh_expired`. Cookie missing → 401 `refresh_missing`.
  - AC4: Access token middleware chấp nhận token chỉ khi `exp > now` VÀ `jti` không trong blacklist.
- **Dependencies**: FR-02.
- **Anomaly fix**: `#A12`, `#A13`, `#A14` (proper user attachment to request).
- **Notes**: Refresh token table có columns `id, user_id, family_id, parent_id, status (active|rotated|revoked), created_at, expires_at`.

#### FR-05: Refresh token reuse detection

- **Capability**: Phát hiện refresh token đã rotate được dùng lại → revoke toàn bộ family.
- **Acceptance Criteria**:
  - AC1: Refresh request với token có `status=rotated` → server detect reuse, set tất cả tokens cùng `family_id` thành `status=revoked`, response 401 `refresh_reuse_detected`.
  - AC2: User tiếp theo gọi refresh với bất kỳ token nào trong family đó → 401 `family_revoked`. User phải sign-in lại.
  - AC3: Audit log entry: `event=refresh_reuse_detected, user_id, family_id, ip, user_agent`.
- **Dependencies**: FR-04.
- **Anomaly fix**: none (legacy không có rotation).
- **Notes**: Đây là 1 trong 7 E2E flows test. ADR-required.

#### FR-06: Get current user (`me`)

- **Capability**: User đăng nhập lấy profile của chính mình.
- **Acceptance Criteria**:
  - AC1: `GET /api/auth/me` với valid access token → 200 trả về `{ id, email, name, phone, address, city, avatar, role }`. KHÔNG bao gồm `password`, `refreshTokens[]`.
  - AC2: No token / invalid token → 401.
  - AC3: Response time p50 <50ms (cached query).
- **Dependencies**: FR-02, FR-09.
- **Anomaly fix**: `#A7` (PII leak — projection enforced), `#A23`.
- **Notes**: Implement DTO mapper hoặc TypeORM `select: false` cho password.

#### FR-07: Update own profile

- **Capability**: User đăng nhập cập nhật name, phone, address, city, avatar URL.
- **Acceptance Criteria**:
  - AC1: `PATCH /api/users/me` với body subset → 200 trả về user đã update (no password).
  - AC2: Email và role KHÔNG thể update qua endpoint này (admin-only flow).
  - AC3: Phone validation: regex E.164 hoặc local VN format, max 20 chars.
  - AC4: Explicit null vs undefined: `{ phone: null }` clear field; `{}` không touch field. Falsy values như `""` hoặc `0` được treat đúng (không silent skip).
- **Dependencies**: FR-06.
- **Anomaly fix**: `#A19` (falsy skip semantics), `#A24` (validation).
- **Notes**: Avatar URL được validate là valid URL; không upload binary.

#### FR-08: RBAC enforcement (USER vs ADMIN)

- **Capability**: System reject non-admin requests đến admin-only endpoints; reject anonymous requests đến authenticated endpoints.
- **Acceptance Criteria**:
  - AC1: `@Roles('admin')` decorator + `RolesGuard` áp dụng tất cả endpoints dưới `/api/admin/*`.
  - AC2: Non-admin user (role=USER) gọi admin endpoint → 403 `forbidden`. Anonymous → 401 `unauthorized`.
  - AC3: `req.userId` và `req.role` được populate đúng từ JWT claims (không còn `===` bug).
  - AC4: E2E test #6 verify: non-admin với valid token bị 403 trên cả 5 admin namespaces (users, products, categories, orders, comments).
  - AC5: Admin endpoint list được gate explicit, không có endpoint admin nào không có `@Roles`.
- **Dependencies**: FR-04.
- **Anomaly fix**: `#A6` (admin getAll), `#A8` (product create), `#A14` (assignment bug), `#A22` (CORS — handled in NFR-Security but RBAC is layer-2).
- **Notes**: Default-deny pattern: nếu route không có `@Public()` hoặc `@Roles()` thì authenticated user-required.

#### FR-09: Password hashing & DTO projection discipline

- **Capability**: Password hash đúng, response payload không bao giờ leak sensitive fields.
- **Acceptance Criteria**:
  - AC1: Bcrypt cost ≥10 cho mọi password hash.
  - AC2: User entity TypeORM column `password` định nghĩa `select: false` HOẶC mọi response qua DTO mapper loại bỏ `password`, `refreshTokens`.
  - AC3: Integration test: scrape mọi endpoint trả về User-shaped object, assert KHÔNG có `password` field xuất hiện trong JSON response.
  - AC4: Pino redact rule: log không in `password`, `accessToken`, `refreshToken`, `Authorization`, `Cookie`.
- **Dependencies**: none (foundational).
- **Anomaly fix**: `#A7`, `#A23`.
- **Notes**: ADR documenting "DTO projection over implicit serialization" decision.

### 3.2 Catalog (FR-10..FR-19)

#### FR-10: Browse product list (PLP) with filter, sort, pagination

- **Capability**: Customer xem danh sách products với filter (category, price range, rating min), sort (price asc/desc, rating, newest), pagination.
- **Acceptance Criteria**:
  - AC1: `GET /api/products?categoryId=&minPrice=&maxPrice=&minRating=&sort=&page=&pageSize=` → 200 trả về `{ items: Product[], total, page, pageSize, totalPages }`.
  - AC2: `pageSize` default 20, max 100; `page` 1-indexed; `page` hoặc `pageSize` invalid → 400.
  - AC3: `sort` ∈ `{price_asc, price_desc, rating_desc, newest}`; default `newest`. Invalid → 400.
  - AC4: `minPrice/maxPrice` validation: số ≥0, `minPrice ≤ maxPrice`. Negative → 400.
  - AC5: `minRating` ∈ [0, 5]. Out of range → 400.
  - AC6: Nếu không có filter, response ≤500ms p50 với 30+ products seed (cache hit) hoặc ≤1500ms cold (cache miss).
- **Dependencies**: FR-12, FR-15.
- **Anomaly fix**: `#A24` (validation), `#A25` (bounded fields).
- **Notes**: Pagination cursor-based là future work; offset/limit đủ cho seed scale.

#### FR-11: Search products by name

- **Capability**: Customer search products bằng substring trên name, case-insensitive.
- **Acceptance Criteria**:
  - AC1: `GET /api/products?q=<term>` → 200 trả về products có `LOWER(name) LIKE '%<term>%'`.
  - AC2: `q` được combine với các filter khác (category, price, rating).
  - AC3: `q` empty string → behaves như no `q` (không filter).
  - AC4: `q` length ≤100 chars; >100 → 400.
  - AC5: SQL injection safe: query qua TypeORM parameterized query, KHÔNG string concat.
- **Dependencies**: FR-10.
- **Anomaly fix**: `#A24`.
- **Notes**: MySQL `LIKE` đủ cho ≤100 products; full-text search là future work.

#### FR-12: View Product Details Page (PDP)

- **Capability**: Customer xem chi tiết 1 product: multi-image, description, stock, rating, reviews, related products.
- **Acceptance Criteria**:
  - AC1: `GET /api/products/:id` → 200 trả về `{ id, name, price, discount, image, imageHover, imageDetail, description, countInStock, rating, category: {id, name, slug}, reviewCount, selled }`.
  - AC2: Product không tồn tại → 404 `product_not_found`.
  - AC3: `category` được populate qua JOIN (FK relationship), không phải free-form string.
  - AC4: Frontend PDP page render qua RSC + ISR `revalidate=60`.
  - AC5: Multi-image: ít nhất 3 image fields displayed (primary, hover, detail).
- **Dependencies**: FR-13.
- **Anomaly fix**: `#A5` (FK to Category), `#A26` (image as URL only).
- **Notes**: Reviews populate qua FR-50; related products qua simple "same category" query.

#### FR-13: Cache-aside read for catalog

- **Capability**: GET endpoints catalog đọc từ Redis cache trước, fallback DB, rồi populate cache.
- **Acceptance Criteria**:
  - AC1: `GET /api/products/:id` cache key `catalog:product:{id}` TTL 60s. Cache hit → return ngay; miss → query DB, set cache, return.
  - AC2: `GET /api/products?...` cache key compose từ query params hash, TTL 30s.
  - AC3: `GET /api/categories` cache key `catalog:categories:all` TTL 300s.
  - AC4: Cache hit ratio ≥80% sau warmup (đo trên `/metrics` endpoint với Prometheus-style counter).
  - AC5: Trace span trong Jaeger phải show `cache.hit` hoặc `cache.miss` attribute cho dev to verify.
- **Dependencies**: FR-12, FR-14, FR-15.
- **Anomaly fix**: none (legacy không có cache).
- **Notes**: Cache key namespace strategy chính thức ở Architecture phase ([OQ-02]).

#### FR-14: Cache invalidation on admin write

- **Capability**: Admin update/delete product/category → cache invalidate ngay lập tức để PDP/PLP reflect new data.
- **Acceptance Criteria**:
  - AC1: Admin `PUT /api/admin/products/:id` → service xoá `catalog:product:{id}` và toàn bộ list cache pattern `catalog:products:list:*` (SCAN + DEL hoặc tag-based).
  - AC2: Admin `DELETE /api/admin/products/:id` → tương tự AC1.
  - AC3: Admin update category → invalidate `catalog:categories:all` + invalidate tất cả product caches thuộc category đó.
  - AC4: E2E test #4 (cache invalidation): admin PATCH product → public PDP fetch ngay sau đó phải thấy data mới (không stale).
- **Dependencies**: FR-13, FR-72.
- **Anomaly fix**: none.
- **Notes**: ADR documenting "scan-and-delete vs tag-based" choice.

#### FR-15: List categories

- **Capability**: Customer / admin lấy danh sách categories cho filter UI.
- **Acceptance Criteria**:
  - AC1: `GET /api/categories` → 200 trả về `Category[] = { id, name, slug, productCount }`.
  - AC2: Sort by `name asc` mặc định.
  - AC3: Cached aggressive (TTL 300s).
- **Dependencies**: FR-13.
- **Anomaly fix**: `#A5`.
- **Notes**: `productCount` denormalized hoặc COUNT JOIN — quyết định ở Architecture.

### 3.3 Cart & Checkout (FR-20..FR-29)

#### FR-20: Add item to cart

- **Capability**: User đăng nhập add product (qty) vào cart, persist server-side.
- **Acceptance Criteria**:
  - AC1: `POST /api/cart/items` body `{ productId, amount }` → 200 trả về cart đầy đủ. Anonymous → 401.
  - AC2: Nếu product đã có trong cart, `amount` được cộng dồn (không tạo dòng mới).
  - AC3: `amount` integer ≥1, ≤ `product.countInStock`. Vượt stock → 400 `insufficient_stock` với message chứa stock hiện tại.
  - AC4: Product không tồn tại / soft-deleted → 404.
- **Dependencies**: FR-02, FR-12.
- **Anomaly fix**: `#A20` (correct field name `countInStock`), `#A24`, `#A25`.
- **Notes**: Cart persist DB, không phải localStorage/redux-persist như legacy.

#### FR-21: Update cart item quantity

- **Capability**: User thay đổi số lượng item trong cart.
- **Acceptance Criteria**:
  - AC1: `PATCH /api/cart/items/:productId` body `{ amount }` → 200 trả về cart. `amount=0` → remove item.
  - AC2: `amount > countInStock` → 400 `insufficient_stock`.
  - AC3: Item không có trong cart → 404 `cart_item_not_found`.
- **Dependencies**: FR-20.
- **Anomaly fix**: `#A20`, `#A25`.
- **Notes**: none.

#### FR-22: Remove cart item

- **Capability**: User xoá item khỏi cart.
- **Acceptance Criteria**:
  - AC1: `DELETE /api/cart/items/:productId` → 200 trả về cart sau khi remove. Item không có → 404.
- **Dependencies**: FR-20.
- **Anomaly fix**: none.
- **Notes**: none.

#### FR-23: Get current cart

- **Capability**: User lấy cart hiện tại.
- **Acceptance Criteria**:
  - AC1: `GET /api/cart` → 200 trả về `{ items: CartItem[], itemsPrice, totalQuantity }`.
  - AC2: Mỗi `CartItem` chứa `{ productId, name, image, price, discount, amount, lineTotal, countInStock }` — snapshot fields current từ Product entity (không stale).
  - AC3: Nếu product đã bị admin soft-delete, item bị skip + flag `unavailable: true` để UI hiển thị warning.
- **Dependencies**: FR-20.
- **Anomaly fix**: none.
- **Notes**: Stock check là eventual; final validation trong checkout transaction (FR-25).

#### FR-24: Initiate checkout (compute totals + validate)

- **Capability**: Trước khi tạo order, system validate cart và compute totals (items + shipping).
- **Acceptance Criteria**:
  - AC1: `POST /api/checkout/preview` body `{ shippingAddress, deliveryMethod, paymentMethod }` → 200 trả về `{ items, itemsPrice, shippingPrice, totalPrice, currency: 'VND' }`.
  - AC2: `deliveryMethod` ∈ `{fast, economical}`; shipping price `fast=30000`, `economical=15000`.
  - AC3: `paymentMethod` ∈ `{COD, PAYPAL}`.
  - AC4: Stock check: nếu bất kỳ item nào `amount > countInStock` → 409 `insufficient_stock` với chi tiết product nào fail.
  - AC5: Cart empty → 400 `cart_empty`.
- **Dependencies**: FR-23.
- **Anomaly fix**: `#A24`, `#A25`.
- **Notes**: Total computed server-side; client claim ignored.

#### FR-25: Create order in atomic transaction

- **Capability**: User submit order → server tạo Order + OrderItems + decrement stock trong 1 ACID transaction.
- **Acceptance Criteria**:
  - AC1: `POST /api/orders` body `{ shippingAddress, deliveryMethod, paymentMethod }` → 201 trả về `{ orderId, status: 'PENDING' | 'AWAITING_PAYMENT', totalPrice, paymentIntent? }`.
  - AC2: TypeORM transaction wraps: SELECT product với pessimistic lock → check stock → UPDATE Product.countInStock decremented → INSERT Order → INSERT OrderItems (snapshot price/name/image/discount). All-or-nothing.
  - AC3: Concurrent request cùng product với insufficient combined stock: chỉ 1 thành công, request còn lại 409 `insufficient_stock`. Stock không bị over-decrement.
  - AC4: Order status: COD → `PENDING`; PayPal → `AWAITING_PAYMENT` với `paymentIntent` chứa PayPal order ID.
  - AC5: Cart bị clear sau khi order tạo thành công.
  - AC6: Failed transaction (DB error, stock fail, PayPal SDK error) → rollback. Stock KHÔNG bị decrement, Order KHÔNG được tạo.
- **Dependencies**: FR-24, FR-30.
- **Anomaly fix**: `#A18` (no auto-deliver cron — order starts as PENDING/AWAITING_PAYMENT), `#A25`.
- **Notes**: ADR documenting "single-DB transaction over Saga" decision. Pessimistic lock vs optimistic — chọn ở Architecture.

#### FR-26: Cancel pending order

- **Capability**: User cancel order của chính mình khi status = PENDING (COD chưa giao) hoặc AWAITING_PAYMENT (chưa pay).
- **Acceptance Criteria**:
  - AC1: `DELETE /api/orders/:id` → 200 trả về order với `status='CANCELLED'`. Stock được restore atomic transaction (UPDATE Product.countInStock += amount).
  - AC2: Order owner != current user AND user không phải admin → 403.
  - AC3: Order status ∉ `{PENDING, AWAITING_PAYMENT}` (ví dụ PAID, DELIVERED) → 409 `cannot_cancel`.
  - AC4: Cancellation trong transaction; stock restore và status update atomic.
- **Dependencies**: FR-25.
- **Anomaly fix**: `#A9` (owner-or-admin guard).
- **Notes**: Refund logic out of scope (returns workflow là future work).

#### FR-27: COD order acceptance

- **Capability**: COD order được tạo với `isPaid=false`; admin manual mark paid sau khi giao hàng.
- **Acceptance Criteria**:
  - AC1: COD order tạo có `paymentMethod='COD'`, `isPaid=false`, `status='PENDING'`.
  - AC2: Email confirmation (FR-60) được enqueue async (BullMQ), KHÔNG block response.
  - AC3: Admin (FR-78) có thể mark `isDelivered=true` AND `isPaid=true` đồng thời cho COD orders.
- **Dependencies**: FR-25, FR-60.
- **Anomaly fix**: `#A17` (async email), `#A18` (no auto-deliver).
- **Notes**: Auto-deliver cron của legacy đã loại bỏ; COD requires manual admin action.

### 3.4 Payment (PayPal sandbox + COD) (FR-30..FR-39)

#### FR-30: PayPal create-order endpoint

- **Capability**: Frontend gọi backend để tạo PayPal order (qua PayPal SDK), nhận lại PayPal order ID để render `<PayPalButtons>`.
- **Acceptance Criteria**:
  - AC1: `POST /api/payment/paypal/create-order` body `{ orderId }` (internal order ID) → 200 trả về `{ paypalOrderId }`. Order phải ở status `AWAITING_PAYMENT`, owned by current user.
  - AC2: Server call PayPal Orders API v2 với `intent=CAPTURE`, `currency=USD` (PayPal sandbox limitation: full sandbox flow runs in USD; VND-stored prices converted to USD at fixed rate 1 USD = 24,000 VND for the PayPal session). Frontend checkout UI displays both VND amount (canonical) and USD equivalent (PayPal session).
  - AC3: Response của PayPal lưu `paypal_order_id` vào Order entity field. Order entity also stores `paypal_currency='USD'` and `paypal_amount` for audit trail.
  - AC4: PayPal SDK error → 502 `payment_provider_error`. Internal order không tồn tại / wrong owner → 404 / 403.
  - AC5: PayPal client ID và secret đọc từ env (validated qua Zod schema), KHÔNG hard-code.
  - AC6: Conversion rate `USD_VND_RATE` đọc từ env (default 24000), centralized trong PaymentService — không scatter magic numbers.
- **Dependencies**: FR-25, FR-09.
- **Anomaly fix**: `#A3` (single SDK provider), `#A15` (env-driven URL), `#A16` (server-side flow).
- **Notes**: Decision: PayPal sandbox runs entirely in USD; VND remains canonical store currency. README + ADR document this clearly so recruiter sees intentional choice, not bug.

#### FR-31: PayPal webhook receiver with signature verification

- **Capability**: Server nhận webhook từ PayPal sau khi capture, verify signature, update order paid status.
- **Acceptance Criteria**:
  - AC1: `POST /api/payment/paypal/webhook` (no auth) → 200 với empty body sau khi xử lý thành công.
  - AC2: Signature verification: dùng PayPal Webhook ID + transmission headers (`paypal-transmission-id`, `paypal-transmission-time`, `paypal-cert-url`, `paypal-auth-algo`, `paypal-transmission-sig`). Verify failure → 401 `webhook_signature_invalid`.
  - AC3: Event type `PAYMENT.CAPTURE.COMPLETED` → tìm order qua `paypal_order_id`, update `isPaid=true`, `paidAt=now`, `status='PAID'`.
  - AC4: Event type khác (REFUNDED, DENIED) → handler placeholder log + return 200 (no-op trong scope).
  - AC5: Webhook handler completes ≤2s; longer work (email enqueue) là async via BullMQ.
- **Dependencies**: FR-30, FR-32.
- **Anomaly fix**: `#A16` (signature verify), `#A22` (webhook endpoint exempt từ CORS — accepts từ PayPal IP range only).
- **Notes**: ADR-required. Webhook test E2E #2 verify end-to-end.

#### FR-32: Webhook idempotency (deduplication)

- **Capability**: Replay cùng webhook event ID → second invocation no-op (không double-process).
- **Acceptance Criteria**:
  - AC1: Table `processed_webhook_events` với PK = PayPal `event_id` (UUID-like). Insert with `ON CONFLICT DO NOTHING` semantics.
  - AC2: Trước khi process, check existence; nếu đã có → 200 với log `event_already_processed=true`, KHÔNG mutate Order.
  - AC3: Insert event ID + process Order trong cùng transaction; rollback khi process fail.
  - AC4: E2E test #4 (idempotency replay): replay same webhook payload → 2nd attempt phải no-op (Order chỉ ghi nhận 1 lần paid).
- **Dependencies**: FR-31.
- **Anomaly fix**: `#A16`.
- **Notes**: ADR-required.

#### FR-33: Mark order paid (server-authoritative)

- **Capability**: Order chỉ được mark `isPaid=true` sau khi server verify successful PayPal capture.
- **Acceptance Criteria**:
  - AC1: KHÔNG có public endpoint nào cho phép client claim "isPaid". Mark paid chỉ qua webhook handler (FR-31) hoặc admin manual mark COD paid (FR-78).
  - AC2: Frontend onApprove callback chỉ trigger UI redirect; không gửi `isPaid=true` body lên server.
  - AC3: Integration test: thử POST `/api/orders` với `isPaid: true` trong body → field bị stripped (DTO whitelist) hoặc 400.
- **Dependencies**: FR-31.
- **Anomaly fix**: `#A16`.
- **Notes**: This FR is more a **constraint** than an action; AC enforces by-design.

#### FR-34: COD payment flow (no PayPal)

- **Capability**: COD orders skip PayPal entirely; flow is order-create-then-deliver.
- **Acceptance Criteria**:
  - AC1: `paymentMethod='COD'` → FR-25 tạo order với `status='PENDING'`, `isPaid=false`.
  - AC2: Frontend không render `<PayPalButtons>`; chỉ hiển thị "Place order" button.
  - AC3: Email confirmation enqueued ngay sau create.
- **Dependencies**: FR-25, FR-60.
- **Anomaly fix**: `#A17`.
- **Notes**: none.

### 3.5 Order Management — Customer view (FR-40..FR-49)

#### FR-40: List my orders

- **Capability**: User đăng nhập xem danh sách orders của chính mình với filter status.
- **Acceptance Criteria**:
  - AC1: `GET /api/orders/me?status=&page=&pageSize=` → 200 trả về `{ items: Order[], total, page, pageSize }`.
  - AC2: `status` ∈ `{PENDING, AWAITING_PAYMENT, PAID, DELIVERED, CANCELLED}` (single value); omit để return all.
  - AC3: Response sort by `createdAt desc` mặc định.
  - AC4: Anonymous → 401. Endpoint chỉ trả orders với `user_id = current_user_id`, không filter qua param (tránh #A6 lặp lại).
  - AC5: Pagination default 20, max 50.
- **Dependencies**: FR-02, FR-25.
- **Anomaly fix**: `#A6`.
- **Notes**: Frontend "My Orders" page consume FR này.

#### FR-41: View order detail

- **Capability**: User xem chi tiết 1 order (chỉ owner hoặc admin).
- **Acceptance Criteria**:
  - AC1: `GET /api/orders/:id` → 200 trả về `{ id, status, items, shippingAddress, deliveryMethod, paymentMethod, itemsPrice, shippingPrice, totalPrice, isPaid, paidAt, isDelivered, deliveredAt, createdAt, updatedAt }`.
  - AC2: Order owner != current user AND user.role != ADMIN → 403 `forbidden`.
  - AC3: Order không tồn tại → 404 (không phân biệt vs 403 để tránh enumeration).
  - AC4: Items snapshot fields (name, price, image, discount) reflect giá tại thời điểm tạo order, KHÔNG live values.
- **Dependencies**: FR-25, FR-08.
- **Anomaly fix**: `#A9` (owner-or-admin guard — critical fix).
- **Notes**: One của 7 E2E flows verify owner-only access (negative test).

### 3.6 Reviews / Comments (FR-50..FR-59)

#### FR-50: List reviews for a product

- **Capability**: Bất kỳ ai (anonymous OK) xem reviews của 1 product.
- **Acceptance Criteria**:
  - AC1: `GET /api/products/:id/reviews?page=&pageSize=` → 200 trả về `{ items: Review[], total, page, pageSize, averageRating }`.
  - AC2: Review payload: `{ id, content, star, userName, createdAt }` where `userName = User.name` snapshot at submission time. KHÔNG expose `userId` hoặc `email`.
  - AC3: Sort `createdAt desc` default. Pagination default 10, max 50.
  - AC4: Product không tồn tại → 404.
- **Dependencies**: FR-12.
- **Anomaly fix**: `#A23` (no PII in review response).
- **Notes**: Reviewer display name = full name as registered (`User.name`). Email và userId không expose. Decision logged.

#### FR-51: Submit review (verified-purchase only)

- **Capability**: User đăng nhập có order DELIVERED chứa product có thể submit review.
- **Acceptance Criteria**:
  - AC1: `POST /api/products/:id/reviews` body `{ content, star }` → 201 trả về review created. Anonymous → 401.
  - AC2: User chưa có order DELIVERED chứa product này → 403 `purchase_required`.
  - AC3: User đã review product này → 409 `already_reviewed` (1 review per user per product).
  - AC4: `content` 1-1000 chars; `star` integer 1-5. Vi phạm → 400.
  - AC5: Sau khi review submit, product `rating` được recompute (avg star) và cache invalidate cho `catalog:product:{id}`.
  - AC6: E2E test #7: user without DELIVERED order containing product cố submit review → 403.
- **Dependencies**: FR-02, FR-25, FR-78 (admin mark delivered for the verified-purchase chain), FR-14.
- **Anomaly fix**: `#A10` (auth required + verified-purchase), `#A11` (no factory bug), `#A24`.
- **Notes**: Verified-purchase logic ADR-required.

#### FR-52: Delete own review

- **Capability**: User xoá review của chính mình.
- **Acceptance Criteria**:
  - AC1: `DELETE /api/reviews/:id` → 200. Owner != current user AND user.role != ADMIN → 403.
  - AC2: Review không tồn tại → 404.
  - AC3: Sau khi xoá, product rating recompute, cache invalidate.
- **Dependencies**: FR-51.
- **Anomaly fix**: none.
- **Notes**: Audit log cho admin delete (FR-79).

### 3.7 Notifications — Email (FR-60..FR-69)

#### FR-60: Send order confirmation email (async via BullMQ)

- **Capability**: Sau khi tạo order thành công, system enqueue email confirmation; worker consumer gửi qua SMTP (Mailhog dev / Gmail sandbox).
- **Acceptance Criteria**:
  - AC1: Order create handler enqueue job `email:order-confirmed` với payload `{ orderId, userEmail, items, totalPrice }` ngay sau commit transaction.
  - AC2: Enqueue thành công <50ms p95 (Redis push); HTTP response trả về user KHÔNG block trên SMTP.
  - AC3: Worker (NestJS BullMQ Processor) consume job, render template, send qua Nodemailer (Mailhog cho dev).
  - AC4: Job retry policy: 3 attempts, exponential backoff (1s, 5s, 25s).
  - AC5: Failed sau 3 attempts → job moved to failed queue + log error với correlation ID.
  - AC6: E2E verify: tạo order → Mailhog UI hiển thị email trong <5s.
- **Dependencies**: FR-25.
- **Anomaly fix**: `#A17` (no inline SMTP).
- **Notes**: Email template trong `apps/api/templates/order-confirmed.hbs` hoặc inline string.

#### FR-61: Send order paid notification (PayPal flow)

- **Capability**: Sau khi webhook xác nhận PayPal capture, enqueue email notification.
- **Acceptance Criteria**:
  - AC1: Webhook handler enqueue `email:order-paid` job sau khi mark Order paid.
  - AC2: Tương tự FR-60 về retry policy + observable trong Mailhog.
- **Dependencies**: FR-31, FR-60.
- **Anomaly fix**: `#A17`.
- **Notes**: none.

#### FR-62: Send order delivered notification

- **Capability**: Sau khi admin mark order delivered, enqueue email notification.
- **Acceptance Criteria**:
  - AC1: Admin action FR-78 trigger enqueue `email:order-delivered` job.
  - AC2: Tương tự FR-60.
- **Dependencies**: FR-78.
- **Anomaly fix**: `#A17`.
- **Notes**: none.

### 3.8 Admin Module (FR-70..FR-79)

#### FR-70: Admin dashboard with KPIs

- **Capability**: Admin xem dashboard với KPI tiles: today orders count, today revenue, top products, low-stock alerts.
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/dashboard` (admin only) → 200 trả về `{ todayOrders, todayRevenue, topProducts: Product[5], lowStockProducts: Product[] }`.
  - AC2: `lowStockProducts` = products với `countInStock < 5` (threshold configurable).
  - AC3: `topProducts` sort by `selled desc` limit 5.
  - AC4: Frontend admin dashboard render KPI tiles + bar chart cho top products (recharts hoặc shadcn chart).
- **Dependencies**: FR-08.
- **Anomaly fix**: none.
- **Notes**: Aggregation query cached 60s.

#### FR-71: Admin user management (CRUD)

- **Capability**: Admin list users với filter, view detail, update role, delete (single + bulk).
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/users?q=&role=&page=&pageSize=` → 200 paginated. Search bằng email substring.
  - AC2: `GET /api/admin/users/:id` → 200 trả về user detail (no password).
  - AC3: `PATCH /api/admin/users/:id` body `{ role, name, phone, address, city }` → 200. Email và password KHÔNG update qua endpoint này.
  - AC4: `DELETE /api/admin/users/:id` → 204. User có orders → soft-delete (mark `deletedAt`); không có orders → hard-delete OK.
  - AC5: `POST /api/admin/users/delete-many` body `{ ids: string[] }` → 200 với `{ deletedCount }`. Confirmation required ở UI layer.
  - AC6: Admin KHÔNG thể self-delete (delete own account) → 400 `cannot_delete_self`.
- **Dependencies**: FR-08, FR-09.
- **Anomaly fix**: `#A6`, `#A7`, `#A23`.
- **Notes**: Soft-delete strategy ADR.

#### FR-72: Admin product management (CRUD)

- **Capability**: Admin list, create, update, delete products (single + bulk).
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/products?q=&categoryId=&page=&pageSize=` → 200 paginated.
  - AC2: `POST /api/admin/products` body `{ name, image, imageHover, imageDetail, categoryId, price, countInStock, description, discount }` → 201. Validation: name unique; price ≥0; countInStock ≥0; rating range 0-5; discount 0-100.
  - AC3: `PUT /api/admin/products/:id` → 200. Trigger cache invalidation FR-14.
  - AC4: `DELETE /api/admin/products/:id` → 204. Soft-delete nếu product trong active orders; hard-delete OK nếu không.
  - AC5: `POST /api/admin/products/delete-many` body `{ ids }` → 200.
  - AC6: Image fields validate là valid URL; không upload binary trong scope.
- **Dependencies**: FR-08, FR-14, FR-15.
- **Anomaly fix**: `#A8` (admin-only create), `#A24`, `#A25` (bounded fields), `#A26` (URL validation).
- **Notes**: none.

#### FR-73: Admin category management (CRUD)

- **Capability**: Admin list, create, update, delete categories.
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/categories` / `POST` / `PUT/:id` / `DELETE/:id` standard CRUD.
  - AC2: `name` unique; `slug` auto-generated từ name (kebab-case), unique.
  - AC3: Delete category với products còn associated → 409 `category_has_products`. User phải reassign hoặc delete products trước.
  - AC4: Cache invalidation FR-14 trigger trên write.
- **Dependencies**: FR-08, FR-14.
- **Anomaly fix**: `#A5` (real category entity).
- **Notes**: none.

#### FR-74: Admin order list and filter

- **Capability**: Admin list tất cả orders với filter (status, user, date range, payment method).
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/orders?status=&userId=&from=&to=&paymentMethod=&page=&pageSize=` → 200 paginated.
  - AC2: Sort by `createdAt desc` default.
  - AC3: Response include user summary `{ userId, userEmail, userName }` để admin grep.
- **Dependencies**: FR-08.
- **Anomaly fix**: none (legacy đã có endpoint, fix là wrap trong admin guard).
- **Notes**: none.

#### FR-75: Admin order detail

- **Capability**: Admin xem chi tiết bất kỳ order nào.
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/orders/:id` → 200 với order full detail. (Phân biệt với FR-41: admin endpoint không có owner check.)
  - AC2: Response include audit history (status changes timeline) nếu có audit log entries.
- **Dependencies**: FR-08, FR-41.
- **Anomaly fix**: `#A9`.
- **Notes**: Audit log entity scope is intentionally minimal (order status changes only); full audit log infrastructure là future work nhưng skeleton table create trong scope.

#### FR-76: Admin comment management

- **Capability**: Admin list, view, delete comments với audit trail.
- **Acceptance Criteria**:
  - AC1: `GET /api/admin/comments?productId=&userId=&page=` → 200 paginated.
  - AC2: `DELETE /api/admin/comments/:id` → 204. Audit log entry `{ event: 'comment_deleted_by_admin', commentId, adminId, reason?, deletedAt }` được tạo.
  - AC3: `POST /api/admin/comments/delete-many` → 200.
  - AC4: Sau delete, product rating recompute + cache invalidate.
- **Dependencies**: FR-08, FR-50.
- **Anomaly fix**: `#A11` (proper middleware factory), `#A22`.
- **Notes**: none.

#### FR-77: Admin realtime new-orders feed

- **Capability**: Admin layout subscribe WebSocket; khi có order mới, hiển thị badge + toast.
- **Acceptance Criteria**:
  - AC1: WebSocket gateway namespace `/admin/orders` chỉ accept connections từ admin (auth handshake — see [OQ-03]).
  - AC2: Sau khi order create thành công (FR-25), server emit event `order.created` với payload `{ orderId, userEmail, totalPrice, createdAt }`.
  - AC3: Admin layout (Next.js client component trong `(admin)`) subscribe và update Zustand store; badge "n new orders" tăng.
  - AC4: Connection drop reconnect strategy and polling fallback: see FR-91 AC2 (client-side authoritative spec).
  - AC5: Non-admin user cố connect → handshake reject với 401-equivalent close code.
- **Dependencies**: FR-08, FR-25.
- **Anomaly fix**: none.
- **Notes**: ADR required cho WebSocket handshake mechanism. [OQ-03].

#### FR-78: Admin mark order delivered/paid

- **Capability**: Admin manually update order status (chủ yếu cho COD: mark delivered + paid).
- **Acceptance Criteria**:
  - AC1: `PATCH /api/admin/orders/:id` body `{ isDelivered?, isPaid? }` → 200. Allowed transitions: PENDING→PAID (COD), PAID→DELIVERED, PENDING→DELIVERED+PAID (COD shortcut).
  - AC2: Disallowed transition (e.g., DELIVERED→PENDING) → 409 `invalid_transition`.
  - AC3: Trigger email notification FR-62 khi mark delivered.
  - AC4: Audit log entry: `{ event, fromStatus, toStatus, adminId, at }`.
  - AC5: Cancelled orders KHÔNG thể mark delivered → 409.
- **Dependencies**: FR-08, FR-25, FR-62.
- **Anomaly fix**: `#A18` (replace cron with manual action).
- **Notes**: State machine documented trong Architecture.

#### FR-79: Admin audit trail (lightweight)

- **Capability**: Admin actions destructive (delete user, delete comment, mark order delivered) có audit log entry persistable.
- **Acceptance Criteria**:
  - AC1: Table `audit_log` columns: `{ id, event, actor_id, actor_role, target_type, target_id, payload (jsonb), ip, user_agent, created_at }`.
  - AC2: 5 events tối thiểu được log: `user_deleted`, `product_deleted`, `comment_deleted_by_admin`, `order_status_changed`, `refresh_reuse_detected`.
  - AC3: `GET /api/admin/audit-log?event=&from=&to=&page=` → 200 paginated (admin-only).
  - AC4: Audit entry write KHÔNG block business response (async OK với best-effort log).
- **Dependencies**: FR-08.
- **Anomaly fix**: `#A11` (audit context for comment delete).
- **Notes**: Full audit UI là future work; PRD chỉ require backend logging + read endpoint.

### 3.9 Frontend Craft — RSC, ISR, Performance (FR-80..FR-89)

#### FR-80: Next.js App Router structure with route groups

- **Capability**: Frontend organize bằng 3 route groups: `(public)`, `(auth)`, `(admin)`.
- **Acceptance Criteria**:
  - AC1: Folder structure `apps/web/src/app/(public)/...`, `(auth)/...`, `(admin)/...`.
  - AC2: Mỗi group có `layout.tsx` riêng với header/footer/nav phù hợp.
  - AC3: `(admin)` layout có client-side auth guard: nếu user.role != ADMIN, redirect `/sign-in?from=/admin`.
  - AC4: Route group `(auth)` không apply default layout (no header/footer cho sign-in/sign-up).
  - AC5: `loading.tsx`, `error.tsx`, `not-found.tsx` defined per group.
- **Dependencies**: FR-08.
- **Anomaly fix**: none (legacy không có App Router).
- **Notes**: ADR documenting route group strategy.

#### FR-81: RSC vs Client Component matrix

- **Capability**: Pages đúng phân biệt RSC (default) vs Client Components (`'use client'` chỉ khi cần interactivity).
- **Acceptance Criteria**:
  - AC1: Document `docs/architecture.md` chứa RSC matrix table: mỗi page (PLP, PDP, Cart, Checkout, MyOrders, OrderDetail, AdminDashboard, AdminUsers, AdminProducts, AdminOrders, AdminComments, AdminCategories, SignIn, SignUp) listed với column `Render: RSC | Client | Mixed`.
  - AC2: Default = RSC. `'use client'` chỉ trên: filter UI, cart mutations, form components, admin tables (interactive).
  - AC3: Counter check (lint rule hoặc audit script): không có `'use client'` ở root layout files trừ `(admin)` (client guard required).
  - AC4: PLP page: filter sidebar là Client Component nested trong RSC parent.
- **Dependencies**: FR-80.
- **Anomaly fix**: none.
- **Notes**: One của 6 ADRs.

#### FR-82: ISR for product detail pages

- **Capability**: PDP render với ISR `revalidate=60` để giảm DB load + tăng LCP.
- **Acceptance Criteria**:
  - AC1: `app/(public)/products/[id]/page.tsx` export `revalidate = 60`.
  - AC2: After admin update product (FR-72), trigger on-demand revalidation `revalidatePath('/products/[id]')` qua server action hoặc admin endpoint hook.
  - AC3: Initial PDP cold render <2s LCP local; warm <1s.
  - AC4: 404 cho non-existent product được serve qua `not-found.tsx`.
- **Dependencies**: FR-12.
- **Anomaly fix**: none.
- **Notes**: ADR.

#### FR-83: Streaming + Suspense for PLP

- **Capability**: PLP page stream parts (filter sidebar, product grid) độc lập với Suspense boundary.
- **Acceptance Criteria**:
  - AC1: Skeleton loading shown <100ms cho product grid khi RSC fetch chưa xong.
  - AC2: Filter sidebar render ngay (cached categories), grid stream sau.
  - AC3: Lighthouse Performance ≥90.
- **Dependencies**: FR-10, FR-15.
- **Anomaly fix**: none.
- **Notes**: none.

#### FR-84: Image optimization with next/image

- **Capability**: Tất cả product images render qua `<Image />` với placeholder blur, responsive `sizes`, lazy loading.
- **Acceptance Criteria**:
  - AC1: `next.config.js` configure remote image domains allowlist.
  - AC2: Mọi `<Image />` instance có explicit `width/height` hoặc `fill`, `sizes`, `placeholder='blur'` (với base64 blurDataURL hoặc dynamic).
  - AC3: PLP image grid: CLS <0.1.
  - AC4: PDP hero image: priority loading.
- **Dependencies**: FR-10, FR-12.
- **Anomaly fix**: `#A26`.
- **Notes**: Image source seed image strategy ở [OQ-04].

#### FR-85: Web Vitals — LCP/INP/CLS budgets

- **Capability**: Production-grade Web Vitals trên PLP và PDP đo trong CI.
- **Acceptance Criteria**:
  - AC1: LCP <2.5s on PLP, PDP (local Lighthouse).
  - AC2: INP <200ms.
  - AC3: CLS <0.1.
  - AC4: Lighthouse CI job trong GitHub Actions chạy trên main branch sau merge; thresholds enforce trong `.lighthouserc.json`.
  - AC5: Bundle size: initial JS gzipped <250KB cho PLP route.
  - AC6: Web Vitals reporter (`useReportWebVitals` hook) log values to console + future endpoint.
- **Dependencies**: FR-83, FR-84.
- **Anomaly fix**: none.
- **Notes**: [OQ-01] exact LCP/INP/CLS thresholds finalized at Architecture.

#### FR-86: TanStack Query for client mutations + optimistic updates

- **Capability**: Cart add/remove, review submit, admin mark delivered dùng TanStack Query mutation với optimistic update + rollback on error.
- **Acceptance Criteria**:
  - AC1: Cart "Add to cart" button: optimistic UI update <50ms; rollback nếu mutation fail (4xx/5xx).
  - AC2: Review submit form: optimistic add to list; rollback on error.
  - AC3: Admin mark delivered: optimistic status update trong table row; rollback on error.
  - AC4: Error case: toast notification hiển thị server error message.
- **Dependencies**: FR-20, FR-51, FR-78.
- **Anomaly fix**: none.
- **Notes**: TanStack Query setup ADR.

#### FR-87: Server Actions for admin form submits

- **Capability**: Admin CRUD forms (create product, update user) dùng Server Actions thay vì client fetch.
- **Acceptance Criteria**:
  - AC1: Form `<form action={createProductAction}>` với `'use server'` directive.
  - AC2: Validation qua Zod schema shared với backend (`packages/shared-types`).
  - AC3: On success: revalidate path / redirect.
  - AC4: On error: return error state, form preserves user input.
- **Dependencies**: FR-72, FR-71, FR-73.
- **Anomaly fix**: none.
- **Notes**: ADR documenting Server Actions vs API routes choice.

#### FR-88: React Hook Form + Zod for client-side forms

- **Capability**: Tất cả forms (sign-up, sign-in, profile edit, address, review submit, checkout) dùng React Hook Form + Zod resolver với schema shared FE↔BE.
- **Acceptance Criteria**:
  - AC1: Schema export từ `packages/shared-types/src/schemas/` (single source of truth).
  - AC2: Validation messages tiếng Việt trên UI; error keys consistent giữa FE/BE.
  - AC3: Submit disabled khi `formState.isSubmitting` hoặc `!formState.isValid`.
  - AC4: Required indicator (\*) trên label cho required fields.
- **Dependencies**: FR-01, FR-02, FR-07, FR-25, FR-51.
- **Anomaly fix**: `#A24`.
- **Notes**: none.

#### FR-89: UI library boundary — shadcn (admin) + vanilla Tailwind (public)

- **Capability**: `(admin)` route group dùng shadcn/ui (DataTable, Sheet, Dialog, Form); `(public)` dùng vanilla Tailwind custom components, optional GSAP/Framer Motion.
- **Acceptance Criteria**:
  - AC1: `apps/web/src/components/ui/` chứa shadcn primitives, chỉ import từ `(admin)` pages.
  - AC2: `apps/web/src/components/public/` chứa custom Tailwind components (Card, Button, Input variants), import từ `(public)` pages.
  - AC3: Lint rule (custom hoặc convention check trong CI) verify shadcn primitives KHÔNG được import từ `(public)/*`.
  - AC4: `(admin)` không dùng MUI, AntD, styled-components.
  - AC5: Animation library (GSAP hoặc Framer Motion) optional cho `(public)`; ADR tài liệu nếu có dùng.
- **Dependencies**: FR-80.
- **Anomaly fix**: `#A27` (mixed UI libraries removed).
- **Notes**: ADR-required.

### 3.10 Realtime — WebSocket Admin Notifications (FR-90..FR-91)

> FR-92..FR-99 reserved for future realtime channels (e.g., low-stock alerts, customer order tracking).

#### FR-90: WebSocket gateway server-side

- **Capability**: NestJS WebSocket gateway với Socket.IO adapter, namespace `/admin/orders`.
- **Acceptance Criteria**:
  - AC1: `@WebSocketGateway({ namespace: '/admin/orders' })` với handshake auth (xem [OQ-03]).
  - AC2: Connection accept chỉ khi user.role = ADMIN; otherwise emit error event và disconnect.
  - AC3: Server emit `order.created` event sau khi `OrderService.create` commit thành công.
  - AC4: Connected client count metric exposed `/metrics` endpoint.
- **Dependencies**: FR-08, FR-25.
- **Anomaly fix**: none.
- **Notes**: [OQ-03] handshake mechanism (cookie vs query token vs first-message auth) finalized at Architecture.

#### FR-91: WebSocket client integration in admin layout

- **Capability**: `(admin)/layout.tsx` (client component) connect Socket.IO client, listen events, update Zustand store.
- **Acceptance Criteria**:
  - AC1: Connection establish on mount; disconnect on unmount.
  - AC2: Reconnect strategy: exponential backoff (1s, 5s, 25s, max 5 attempts), then fallback polling FR-74 every 30s.
  - AC3: Toast notification hiển thị khi receive `order.created`; badge counter increment.
  - AC4: Connection state visualized: green dot (connected) / yellow (reconnecting) / red (failed).
- **Dependencies**: FR-90.
- **Anomaly fix**: none.
- **Notes**: none.

---

## 4. Non-Functional Requirements

> **Stable IDs**: NFR-NN. Cross-reference brief Section 5.2 (technical quality bar) + Section 6.3 (quality non-negotiables) + Section 6.4 (tooling).
>
> **Format**: Mỗi NFR có `Statement` (testable claim), `Acceptance Criteria` (concrete + measurable), `Verification` (cách đo / kiểm chứng).

### NFR-01: Performance

- **Statement**: Catalog (PLP, PDP) đạt portfolio-grade Core Web Vitals.
- **Acceptance Criteria**:
  - AC1: Lighthouse Performance ≥90 trên PLP và PDP (production build, simulated 3G mobile slow).
  - AC2: LCP <2.5s local (broadband + cache warm).
  - AC3: INP <200ms.
  - AC4: CLS <0.1.
  - AC5: Cache hit rate ≥80% trên catalog reads sau warmup window (~5 min steady traffic).
  - AC6: Initial JS bundle gzipped <250KB cho PLP route.
  - AC7: API response p50 <100ms cho cached catalog reads, p95 <300ms cold.
- **Verification**: Lighthouse CI in GitHub Actions; Web Vitals reporter; `/metrics` endpoint với cache hit counter; manual Jaeger inspection.

### NFR-02: Security

- **Statement**: Security baseline portfolio-grade với toàn bộ 24 in-scope legacy anomalies fixed + defensive defaults.
- **Acceptance Criteria**:
  - AC1: JWT access token TTL ≤15 min; refresh token rotation với reuse detection (FR-04, FR-05).
  - AC2: Refresh token chỉ delivered qua `Set-Cookie` httpOnly + Secure + SameSite=Strict (`#A12`).
  - AC3: RBAC: `@Roles('admin')` enforce trên 100% admin endpoints; default-deny pattern.
  - AC4: PayPal webhook signature verification active; idempotency table dedup theo `event_id` (`#A16`).
  - AC5: CORS allowlist explicit (env-driven `CORS_ALLOWED_ORIGINS`); NO wildcard `*` (`#A22`).
  - AC6: Password bcrypt cost ≥10; raw password không bao giờ log hoặc response.
  - AC7: Pino logger redact rules cho: `password`, `accessToken`, `refreshToken`, `Authorization`, `Cookie`, PayPal API keys.
  - AC8: Env validation Zod schema; missing required env → app fail-fast on boot với clear error.
  - AC9: Request validation 100% via class-validator + Zod; `whitelist: true, forbidNonWhitelisted: true` ở Validation Pipe (`#A24`).
  - AC10: Error response không leak stack traces trong production mode; only sanitized message + correlation ID.
  - AC11: Rate limiting trên auth endpoints (sign-in, refresh, sign-up): max 10 req/min/IP. Vượt → 429.
- **Verification**: Integration tests cho rotation reuse, RBAC bypass, webhook signature, CORS reject. ESLint custom rule cho banned patterns. ADR-Security view.

### NFR-03: Reliability

- **Statement**: Critical writes (order create, payment process, refresh rotation) idempotent và transactional.
- **Acceptance Criteria**:
  - AC1: Order create transaction atomic (FR-25 AC2-AC3-AC6); concurrent stock decrement không over-sell.
  - AC2: PayPal webhook idempotent (FR-32); replay test PASS.
  - AC3: BullMQ email jobs retry 3 lần với exponential backoff; failed jobs queued cho manual reprocess.
  - AC4: TypeORM migrations versioned; rollback path documented per migration.
  - AC5: Health endpoint `/health` returns 200 only khi MySQL + Redis + queue reachable; 503 khi degraded.
  - AC6: Graceful shutdown: SIGTERM → finish in-flight requests <30s; close DB pool và queue connections.
- **Verification**: Integration test cho transaction rollback, webhook replay, BullMQ retry. Chaos test (out of scope manual): kill Redis mid-request.

### NFR-04: Observability

- **Statement**: Distributed tracing và structured logging operational, không decorative.
- **Acceptance Criteria**:
  - AC1: OpenTelemetry SDK instrument HTTP (NestJS), TypeORM, ioredis, BullMQ, fetch.
  - AC2: Traces export sang Jaeger local (docker-compose service).
  - AC3: Trace ID + Span ID propagate vào Pino log entries.
  - AC4: Pino structured JSON logs với fields: `level`, `time`, `msg`, `requestId`, `userId?`, `traceId`, `spanId`, `service`.
  - AC5: README screenshot Jaeger UI cho 2 critical flows: order create (DB + cache + queue spans visible), PayPal webhook (signature verify + idempotency check + DB transaction visible).
  - AC6: `/metrics` endpoint expose Prometheus-format counters: `http_requests_total`, `cache_hits_total`, `cache_misses_total`, `bullmq_jobs_completed_total`, `bullmq_jobs_failed_total`.
- **Verification**: Jaeger UI inspection; log inspection in Mailhog/console; metrics endpoint curl test.

### NFR-05: Quality / Testing

- **Statement**: Tests portfolio-grade vượt happy path; CI là quality gate.
- **Acceptance Criteria**:
  - AC1: Unit test coverage ≥70% trên service layer (Auth, Catalog, Order, Payment, Notification services).
  - AC2: Integration tests dùng testcontainers (MySQL 8 + Redis 7) cho repository + service interaction.
  - AC3: Integration test cases đặc biệt: cache invalidation propagation, idempotency replay, transaction rollback, RBAC bypass attempt.
  - AC4: Playwright E2E ≥7 flows (xem brief Section 3.1) green trong CI.
  - AC5: CI gate: PR fail nếu coverage drop, lint error, typecheck fail, hoặc E2E fail. Branch protection enforce CI green trên main.
  - AC6: TypeScript strict mode = true; `0 any` trong service layer (custom ESLint rule banning `any` trong `apps/api/src/**/services/**`).
  - AC7: ESLint `--max-warnings 0` cấp build; warnings là errors.
  - AC8: No `console.log` trong production code (lint rule); chỉ Pino.
  - AC9: No commented-out code trong commits (PR review check; legacy có rất nhiều).
- **Verification**: Jest coverage report + badge; Playwright report; CI workflow logs; ESLint + tsc CI step.

### NFR-06: Maintainability

- **Statement**: Code và artifact quality cho recruiter senior review từng commit.
- **Acceptance Criteria**:
  - AC1: Conventional commits enforce qua commitlint + Husky `commit-msg` hook.
  - AC2: ADR count ≥6 trong `docs/ADRs/` covering: modular monolith decision, cache-aside, JWT rotation, webhook idempotency, RSC matrix, single-DB transaction over Saga.
  - AC3: README portfolio-grade với 8 sections: pitch, badges, run-local-<5min, architecture diagram, anomalies fixed table, animated GIFs, future work, test/coverage badges.
  - AC4: Architecture document `docs/architecture.md` với ≥3 diagrams (component view, data ERD, sequence diagram cho PayPal webhook).
  - AC5: Per-anomaly commit traceability: 24 fixes đều có commit message format `fix(security): ... (#A<N>)` hoặc reference qua PR description.
  - AC6: Husky pre-commit hook: lint + typecheck staged files.
  - AC7: Prettier config + auto-format on save / pre-commit.
- **Verification**: Visual review of README; commit history scan; ADR count; lint hooks active.

### NFR-07: Compatibility

- **Statement**: Modern browsers + responsive design.
- **Acceptance Criteria**:
  - AC1: Hỗ trợ Chrome, Edge, Firefox, Safari latest 2 versions.
  - AC2: Mobile responsive: PLP, PDP, Cart, Checkout usable trên viewport ≥360px width (Tailwind responsive utilities).
  - AC3: Admin UI ưu tiên desktop (≥1024px); mobile admin out-of-scope nhưng KHÔNG broken (no horizontal scroll trên mobile).
  - AC4: WCAG AA-ish baseline: semantic HTML, alt text trên product images, keyboard navigation cho forms, focus indicators visible.
  - AC5: KHÔNG dùng experimental APIs require flags.
- **Verification**: Manual browser smoke test; Lighthouse Accessibility ≥90.

### NFR-08: Localization

- **Statement**: Vietnamese-only UI; English cho code/log/error/commit.
- **Acceptance Criteria**:
  - AC1: Tất cả UI text (labels, buttons, error messages user-facing) tiếng Việt hardcoded.
  - AC2: Log messages, error codes, commit messages, code comments tiếng Anh.
  - AC3: Currency displayed VND với format `₫1.234.567` (vi-VN locale).
  - AC4: Date displayed format `DD/MM/YYYY HH:mm` (date-fns vi-VN locale).
  - AC5: i18n library KHÔNG required; nếu sau này cần multi-language là future work.
- **Verification**: Visual UI review; grep cho hardcoded English UI strings.

---

## 5. Dependencies & Sequencing

### 5.1 Inter-FR dependencies (high-level)

```
Foundational (no deps):
  FR-09 (password+DTO discipline)
  FR-15 (categories list — though uses FR-13 cache)

Auth core:
  FR-01 → FR-02 → FR-04 → FR-05
                        ↘ FR-03 (sign-out, depends on FR-04)
  FR-08 (RBAC) ← FR-04
  FR-06 (me) ← FR-02
  FR-07 (update profile) ← FR-06

Catalog read:
  FR-15 → FR-13 (cache) → FR-10 (PLP), FR-12 (PDP)
                        → FR-11 (search) ← FR-10
  FR-14 (invalidate) ← FR-13, FR-72 (admin write)

Cart → Order → Payment:
  FR-20 → FR-21, FR-22, FR-23
  FR-23 → FR-24 → FR-25
  FR-25 → FR-26, FR-27, FR-30
  FR-30 → FR-31 → FR-32 → FR-33
  FR-25 → FR-60 (email enqueue)
  FR-31 → FR-61

Order management:
  FR-25 → FR-40, FR-41

Reviews:
  FR-12 → FR-50
  FR-25 → FR-51 (verified-purchase chain)
  FR-78 → FR-51 (delivered status pre-req for verified-purchase)
  FR-51 → FR-52

Admin (each gated by FR-08):
  FR-71, FR-72, FR-73, FR-74, FR-75, FR-76, FR-78
  FR-72 → FR-14 (cache invalidation hooks)
  FR-78 → FR-62 (delivered email)
  FR-77 (websocket) ← FR-25
  FR-79 (audit) cross-cuts admin destructive actions

Frontend craft (foundation for UX):
  FR-80 → FR-81, FR-82, FR-83, FR-89
  FR-83 ← FR-10, FR-15
  FR-86 ← FR-20, FR-51, FR-78
  FR-87 ← FR-71, FR-72, FR-73
  FR-88 ← all forms (FR-01, FR-02, FR-07, FR-24, FR-25, FR-51)
```

### 5.2 Mapping to brief 5-week sprint plan

| Week | Goal                              | FRs delivered (primary)                                                                             |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | Foundation + CI baseline          | (no FR delivered; setup only) — health endpoint, docker-compose stack, repo structure, NFR-05 setup |
| 2    | Auth + Catalog read               | FR-01..FR-09 (Auth), FR-10..FR-15 (Catalog), FR-80, FR-81, FR-82, FR-89                             |
| 3    | Cart, Order, Payment, Email queue | FR-20..FR-27 (Cart+Order), FR-30..FR-34 (Payment), FR-60..FR-62 (Email)                             |
| 4    | Frontend depth + Admin module     | FR-40, FR-41 (My Orders), FR-50..FR-52 (Reviews), FR-70..FR-79 (Admin), FR-83..FR-88, FR-90, FR-91  |
| 5    | Tests + observability + polish    | NFR-01..NFR-06 verification + ADR write-up + animated GIFs + README finalization                    |

### 5.3 Critical path

Critical path through FRs (longest dependency chain): `FR-01 → FR-02 → FR-04 → FR-08 → FR-25 → FR-31 → FR-32` plus parallel `FR-13 → FR-10 → FR-12 → FR-50 → FR-51` chain. Sprint 2 và 3 là risk windows nếu auth hoặc payment trượt.

---

## 6. Open Items

> Genuine uncertainties — most product decisions decided in brief; remaining items defer to Architecture phase per brief Section 7.3.

- **[OQ-01]** Exact Lighthouse CI threshold values (per route, per metric). Brief Section 5.2 sets headline targets; Architecture phase finalizes per-route thresholds in `.lighthouserc.json`. — Decision deadline: Architecture phase.
- **[OQ-02]** Redis cache key namespace strategy: flat (`catalog:product:{id}`) vs versioned (`catalog:product:{id}:v{version}`) vs tag-based. Affects cache invalidation FR-14 implementation. — Decision deadline: Architecture phase.
- **[OQ-03]** WebSocket auth handshake mechanism for FR-77/FR-90: query param token vs cookie vs first-message auth. Affects security posture. — Decision deadline: Architecture phase.
- **[OQ-04]** Image source for seed data (FR-12, FR-84): free stock images (Unsplash API) vs AI-generated vs Cloudinary asset. Brief defers; Architecture or seed-script implementation decides. — Decision deadline: Week 2 (sprint 2 seed task).
- **[OQ-05]** Audit log table scope (FR-79): minimal 5-event scope confirmed; full unified audit infrastructure (with retention policy, querying UI) remains future work. — Decision deadline: post-MVP.
- **[OQ-06]** ~~PayPal sandbox currency~~ — RESOLVED: full USD sandbox flow, fixed env-configured conversion rate (default 24,000 VND/USD).
- **[OQ-07]** Refresh token cookie path scope: `/api/auth/refresh` only vs `/`. Affects CSRF surface. — Decision deadline: Architecture phase.
- **[OQ-08]** State machine for order status transitions (FR-78): exhaustive transition table needs validation against business rules (refund, partial refund out of scope but state machine should be extensible). — Decision deadline: Architecture phase.

---

## 7. Assumptions Made During Drafting

> All 4 assumptions from initial draft have been resolved by user at finalize prep:
>
> - ✅ PayPal currency → switched fully to USD in sandbox (rate 1 USD = 24,000 VND configurable env). Decision applied to FR-30. [OQ-06] closed.
> - ✅ Reviewer name → full name as registered (no masking). Decision applied to FR-50.
> - ✅ Audit log scope → 5 events confirmed (FR-79).
> - ✅ Rate limit thresholds → 10 req/min/IP confirmed (NFR-02 AC11).
>
> No outstanding `[ASSUMPTION]` tags remain in prd.md.

---

## 8. Anomaly Coverage Verification

> Cross-check: 24 in-scope anomalies từ brief Section 3.3 phải có ít nhất 1 FR/NFR reference.

| Anomaly | Severity | Closed by                                                      |
| ------- | -------- | -------------------------------------------------------------- |
| `#A3`   | Med      | FR-30                                                          |
| `#A4`   | Med      | FR-01                                                          |
| `#A5`   | High     | FR-12, FR-15, FR-73                                            |
| `#A6`   | Critical | FR-08, FR-40, FR-71                                            |
| `#A7`   | Critical | FR-06, FR-08, FR-09, FR-71                                     |
| `#A8`   | Critical | FR-08, FR-72                                                   |
| `#A9`   | Critical | FR-26, FR-41, FR-75                                            |
| `#A10`  | High     | FR-51                                                          |
| `#A11`  | High     | FR-51, FR-76, FR-79                                            |
| `#A12`  | Critical | FR-01, FR-02, FR-04, NFR-02                                    |
| `#A13`  | High     | FR-02, FR-04                                                   |
| `#A14`  | Critical | FR-04, FR-08                                                   |
| `#A15`  | Med      | FR-30                                                          |
| `#A16`  | Critical | FR-30, FR-31, FR-32, FR-33, NFR-02                             |
| `#A17`  | High     | FR-27, FR-34, FR-60, FR-61, FR-62                              |
| `#A18`  | High     | FR-25, FR-27, FR-78                                            |
| `#A19`  | Med      | FR-07                                                          |
| `#A20`  | Low      | FR-20, FR-21                                                   |
| `#A22`  | High     | FR-31, FR-76, NFR-02                                           |
| `#A23`  | High     | FR-01, FR-06, FR-09, FR-50, FR-71, NFR-02                      |
| `#A24`  | High     | FR-01, FR-10, FR-11, FR-20, FR-24, FR-51, FR-72, FR-88, NFR-02 |
| `#A25`  | Med      | FR-10, FR-20, FR-21, FR-24, FR-25, FR-72                       |
| `#A26`  | Med      | FR-12, FR-72, FR-84                                            |
| `#A27`  | High     | FR-89                                                          |

Total: **24 anomalies**, all referenced. (`#A1`, `#A2`, `#A21` cosmetic, naturally cleaned by greenfield rewrite per brief Section 3.3.)

---

## 9. References

- **Brief**: `documents/planning-artifacts/briefs/brief-prodigy-glasses-remake-2026-05-24/brief.md` — strategic shape, personas, success criteria, non-goals.
- **Brief decision log**: `documents/planning-artifacts/briefs/brief-prodigy-glasses-remake-2026-05-24/.decision-log.md` — canonical audit of brief discovery decisions.
- **Project context (legacy)**: `documents/knowledge/project-context.md` — legacy MERN baseline, 27 anomalies #A1–#A27, API inventory, data model.
- **Migration master plan**: `documents/planning-artifacts/migration-master-plan.md` — BMad roadmap (PRD = Phase 2 of 5).
- **PRD decision log**: `./.decision-log.md` — canonical audit of PRD drafting decisions.
