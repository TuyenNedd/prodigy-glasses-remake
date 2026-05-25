---
title: Epics & Stories — Prodigy Glasses Remake
project: prodigy-glasses-remake
status: draft
created: 2026-05-25
author: Jarvis
inputDocuments:
  - documents/planning-artifacts/architecture.md
  - documents/planning-artifacts/prds/prd-prodigy-glasses-remake-2026-05-24/prd.md
  - documents/planning-artifacts/briefs/brief-prodigy-glasses-remake-2026-05-24/brief.md
  - documents/test-artifacts/test-design/test-design.md
sprintMapping: '5 epics = 5 weeks (brief §4.3)'
---

# Epics & Stories — Prodigy Glasses Remake

> **Bilingual convention**: Headers, AC, story titles in English. Explanatory notes in Vietnamese.
>
> **Story sizing**: Mỗi story ≤2 ngày solo dev. Nếu lớn hơn → tách.
>
> **Risk linking**: Stories liên quan đến risk trong test-design được tag `[R-NNN]`.
>
> **FR mapping**: Mỗi story reference FR-NN từ PRD.

---

## Epic 1 — Foundation & CI Baseline (Tuần 1)

> **Goal**: Stack chạy local, CI green ở "hello world" level, repo structure production-grade.
> Tuần này không deliver FR nào cho end-user, nhưng tạo nền tảng cho toàn bộ sprint sau.

### Story 1.1 — Monorepo scaffold with npm workspaces

**FR**: N/A (infrastructure)
**Risk**: [R-027] (CI slow if structure wrong from start)
**Size**: 1 day

**Description**: Khởi tạo monorepo structure với npm workspaces, ESLint flat config, Prettier, commitlint + Husky hooks, tsconfig base.

**Acceptance Criteria**:

- AC1: `package.json` root declares workspaces `["apps/*", "packages/*"]`.
- AC2: `npm install` from root resolves all workspace deps without errors.
- AC3: `tsconfig.base.json` with `strict: true` exists; each app/package extends it.
- AC4: Husky `pre-commit` hook runs lint + typecheck on staged files.
- AC5: Husky `commit-msg` hook enforces conventional commit format.
- AC6: Prettier config applied; `npm run format:check` passes on empty project.
- AC7: ESLint flat config with rule banning `any` in `apps/api/src/**/services/**`.

---

### Story 1.2 — NestJS API bootstrap with ConfigModule + health endpoint

**FR**: NFR-03 AC5 (health endpoint)
**Risk**: [R-029] (health false-positive)
**Size**: 1 day

**Description**: Bootstrap `apps/api` NestJS app với Zod env validation, ConfigModule, HealthModule.

**Acceptance Criteria**:

- AC1: `apps/api/src/main.ts` boots NestJS on port from env (default 3001).
- AC2: Zod schema validates required env vars on boot; missing → fail-fast with clear error.
- AC3: `GET /api/health` returns 200 `{ status: 'ok', checks: { db: 'up', redis: 'up', queue: 'up' } }` when all deps healthy.
- AC4: `GET /api/health` returns 503 when MySQL OR Redis unreachable.
- AC5: Pino logger configured with JSON structured output + redact rules for sensitive fields.

---

### Story 1.3 — Docker Compose stack (MySQL + Redis + Jaeger + Mailhog)

**FR**: NFR-03, NFR-04
**Risk**: [R-029], [R-031]
**Size**: 1 day

**Description**: Docker Compose file với MySQL 8, Redis 7, Jaeger all-in-one, Mailhog. Healthchecks cho mỗi service.

**Acceptance Criteria**:

- AC1: `docker compose up` starts all 4 services + API app healthy within 60s.
- AC2: MySQL container has healthcheck (`mysqladmin ping`); Redis has `redis-cli ping`.
- AC3: Jaeger UI accessible at `localhost:16686`.
- AC4: Mailhog UI accessible at `localhost:8025`.
- AC5: `.env.example` documents all required env vars with placeholder values.
- AC6: `docker-compose.test.yml` exists for ephemeral test stack (separate ports).

---

### Story 1.4 — TypeORM data source + initial migrations (empty tables)

**FR**: NFR-06 AC2 (migrations versioned)
**Risk**: [R-026] (migration rollback failure)
**Size**: 2 days

**Description**: TypeORM DataSource config, tất cả 10 initial migrations (up + down reversible), seed admin user.

**Acceptance Criteria**:

- AC1: DataSource config reads from env (host, port, user, password, database).
- AC2: 10 migrations created in order: users, refresh_tokens, categories, products, carts+cart_items, orders+order_items, reviews, processed_webhook_events, audit_logs, seed-admin.
- AC3: `npm run migration:run` executes all migrations without error on fresh DB.
- AC4: `npm run migration:revert` (all) leaves DB in clean state (no tables).
- AC5: Each migration has both `up()` and `down()` methods implemented.
- AC6: Seed admin user created with bcrypt-hashed password from env.
- AC7: All FK constraints, indexes, and CHECK constraints match architecture §5.2.

---

### Story 1.5 — Next.js App Router init + Tailwind + shadcn/ui setup

**FR**: FR-80, FR-89
**Risk**: [R-023] (hydration mismatch if setup wrong)
**Size**: 1 day

**Description**: Bootstrap `apps/web` Next.js App Router với route groups, Tailwind v4, shadcn/ui (admin only), base layouts.

**Acceptance Criteria**:

- AC1: `apps/web/src/app/(public)/layout.tsx`, `(auth)/layout.tsx`, `(admin)/layout.tsx` exist with appropriate shells.
- AC2: Tailwind configured via PostCSS; `globals.css` imports Tailwind layers.
- AC3: shadcn/ui initialized in `components/ui/`; at least Button + Dialog installed.
- AC4: `next.config.js` configures remote image domains: `picsum.photos`, `fastly.picsum.photos`.
- AC5: `npm run build` in `apps/web` succeeds without errors.
- AC6: Home page renders "Prodigy Glasses" placeholder at `localhost:3000`.

---

### Story 1.6 — Shared types package + CI baseline

**FR**: NFR-05, NFR-06
**Risk**: [R-028] (any type leakage)
**Size**: 1 day

**Description**: `packages/shared-types` với Zod schemas placeholder + TS types export. GitHub Actions CI workflow.

**Acceptance Criteria**:

- AC1: `packages/shared-types/src/schemas/` exports at least `userSchema`, `productSchema` placeholders.
- AC2: `packages/shared-types` compiles with `tsc --noEmit` without errors.
- AC3: Both `apps/api` and `apps/web` can import from `@prodigy/shared-types`.
- AC4: GitHub Actions workflow `.github/workflows/ci.yml` runs: lint → typecheck → build.
- AC5: CI passes on main branch (green badge).
- AC6: README skeleton with title, badges, 60-second pitch, "Run locally" section.

---

### Story 1.7 — OpenTelemetry + Redis module bootstrap

**FR**: NFR-04
**Risk**: [R-031] (trace ID gap)
**Size**: 1 day

**Description**: OTel SDK init trước NestJS bootstrap, Redis module (ioredis), traces export sang Jaeger.

**Acceptance Criteria**:

- AC1: `apps/api/src/observability/otel.ts` initializes OTel SDK with HTTP + NestJS + ioredis instrumentations.
- AC2: OTel imported BEFORE NestJS bootstrap in `main.ts`.
- AC3: Redis module (ioredis) connected; health endpoint checks Redis connectivity.
- AC4: `GET /api/health` trace visible in Jaeger UI with spans for HTTP + Redis ping.
- AC5: Trace ID propagated into Pino log entries (`traceId`, `spanId` fields present).

---

## Epic 2 — Auth + Catalog Read (Tuần 2)

> **Goal**: User sign up/in, browse catalog with filters, cache hit observable in Jaeger.
> Đây là sprint risk cao nhất — auth foundation ảnh hưởng toàn bộ sprint sau.

---

### Story 2.1 — User entity + sign-up endpoint

**FR**: FR-01, FR-09
**Risk**: [R-008] (PII leak), [R-009] (token storage)
**Size**: 2 days

**Description**: User entity TypeORM, sign-up endpoint với bcrypt hash, DTO projection, refresh cookie.

**Acceptance Criteria**:

- AC1: `POST /api/auth/sign-up` with valid body → 201 returns `{ user: { id, email, name, role }, accessToken }`.
- AC2: `password` field NEVER appears in any response (TypeORM `select: false` + DTO mapper).
- AC3: Email format invalid → 400; password <8 chars → 400; email exists → 409 `email_already_registered`.
- AC4: Phone stored as string (supports `+84...` format, leading zeros preserved).
- AC5: Password hashed with bcrypt cost ≥10; raw password never logged (Pino redact active).
- AC6: Refresh token set via `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`.
- AC7: NO refresh token in JSON response body.

---

### Story 2.2 — Sign-in + JWT access/refresh token pair

**FR**: FR-02, FR-04
**Risk**: [R-001] (rotation), [R-009] (localStorage)
**Size**: 1.5 days

**Description**: Sign-in endpoint, JWT pair generation, refresh token DB persistence.

**Acceptance Criteria**:

- AC1: `POST /api/auth/sign-in` with correct credentials → 200 returns `{ user, accessToken }` + Set-Cookie refresh.
- AC2: Wrong email OR wrong password → 401 `invalid_credentials` (no user enumeration).
- AC3: Access token TTL = 15min; refresh token TTL = 7 days.
- AC4: JWT access payload: `{ sub, role, jti, iat, exp }` only — no email, no name.
- AC5: Refresh token persisted in `refresh_tokens` table with `family_id`, `status=active`.
- AC6: Rate limit: max 10 req/min/IP on sign-in endpoint; 11th → 429.

---

### Story 2.3 — Refresh token rotation + reuse detection

**FR**: FR-04, FR-05
**Risk**: [R-001], [R-016]
**Size**: 2 days

**Description**: Rotation logic, reuse detection, family revoke, audit log entry.

**Acceptance Criteria**:

- AC1: `POST /api/auth/refresh` (cookie only, no body) → 200 returns `{ accessToken }` + new refresh cookie.
- AC2: Old refresh token marked `status=rotated` in DB; new token has `parent_id = old.jti`.
- AC3: Replaying a `rotated` token → server sets ALL tokens in family to `revoked` + returns 401 `refresh_reuse_detected`.
- AC4: After reuse detection, ANY token in that family → 401 `family_revoked`.
- AC5: Audit log entry created: `event=refresh_reuse_detected, user_id, family_id, ip, user_agent`.
- AC6: Expired refresh token → 401 `refresh_expired`; missing cookie → 401 `refresh_missing`.

---

### Story 2.4 — Sign-out + JWT blacklist + RBAC guards

**FR**: FR-03, FR-08
**Risk**: [R-005] (RBAC bypass), [R-010] (CORS)
**Size**: 1.5 days

**Description**: Sign-out blacklists access JTI in Redis, clears cookie. Global JwtAuthGuard + RolesGuard + @Public decorator.

**Acceptance Criteria**:

- AC1: `POST /api/auth/sign-out` → 204. Access JTI added to Redis `auth:blacklist:{jti}` with TTL = remaining token life.
- AC2: Refresh cookie cleared via `Set-Cookie: refresh_token=; Max-Age=0`.
- AC3: Entire refresh family revoked in DB.
- AC4: After sign-out, using old access token → 401 `token_revoked`.
- AC5: `JwtAuthGuard` registered globally; endpoints without `@Public()` require valid token.
- AC6: `@Roles('ADMIN')` + `RolesGuard`: non-admin user → 403 on admin endpoints.
- AC7: CORS configured with explicit origin allowlist from env; unknown origin → no ACAO header.

---

### Story 2.5 — Get me + update profile

**FR**: FR-06, FR-07
**Risk**: [R-008] (PII leak)
**Size**: 1 day

**Description**: `/api/auth/me` endpoint + `/api/users/me` PATCH with null/undefined semantics.

**Acceptance Criteria**:

- AC1: `GET /api/auth/me` with valid token → 200 returns `{ id, email, name, phone, address, city, avatar, role }`. NO password.
- AC2: No token / invalid → 401.
- AC3: `PATCH /api/users/me` with partial body → 200 returns updated user.
- AC4: Email and role CANNOT be updated via this endpoint (silently ignored or 400).
- AC5: `{ phone: null }` clears field; `{}` touches nothing; `""` is treated as empty string (not skip).
- AC6: Phone validation: E.164 or VN local format, max 20 chars.

---

### Story 2.6 — Category + Product entities + seed script

**FR**: FR-15, FR-12
**Risk**: [R-017] (soft-delete integrity)
**Size**: 1.5 days

**Description**: Category entity (name, slug), Product entity (full schema), seed ≥30 products + ≥6 categories.

**Acceptance Criteria**:

- AC1: Category entity with `name` (unique), `slug` (unique, auto-generated kebab-case).
- AC2: Product entity with all fields per architecture §5.2.4 including `category_id` FK.
- AC3: Product soft-delete via `deletedAt` column; soft-deleted products excluded from public queries.
- AC4: Seed script creates ≥6 categories + ≥30 products with realistic Vietnamese names and Picsum image URLs.
- AC5: Seed script idempotent (can run multiple times without duplicates).
- AC6: `GET /api/categories` → 200 returns `[{ id, name, slug, productCount }]` sorted by name.

---

### Story 2.7 — Catalog read endpoints with cache-aside

**FR**: FR-10, FR-11, FR-12, FR-13
**Risk**: [R-012] (cache stale), [R-019] (cache hit ratio), [R-020] (cold PLP slow)
**Size**: 2 days

**Description**: PLP (filter/sort/paginate/search), PDP, cache-aside Redis pattern.

**Acceptance Criteria**:

- AC1: `GET /api/products?categoryId=&minPrice=&maxPrice=&minRating=&sort=&page=&pageSize=&q=` → 200 paginated.
- AC2: `sort` ∈ `{price_asc, price_desc, rating_desc, newest}`; invalid → 400.
- AC3: `GET /api/products/:id` → 200 with category populated via JOIN; 404 if not found.
- AC4: PDP cached at `catalog:product:{id}` TTL 60s; PLP at `catalog:products:list:{queryHash}` TTL 30s.
- AC5: Categories cached at `catalog:categories:all` TTL 300s.
- AC6: Cache miss → DB query → populate cache → return. Cache hit → return directly.
- AC7: Jaeger trace shows `cache.hit=true` or `cache.miss=true` attribute on catalog spans.
- AC8: Search: `q` param filters by `LOWER(name) LIKE '%term%'`; SQL injection safe (parameterized).

---

### Story 2.8 — Frontend: Auth pages (sign-in, sign-up) with Server Actions

**FR**: FR-80, FR-88
**Risk**: [R-009] (token in localStorage)
**Size**: 1.5 days

**Description**: `(auth)/sign-in` và `(auth)/sign-up` pages dùng Server Actions + RHF + Zod.

**Acceptance Criteria**:

- AC1: `(auth)/layout.tsx` renders minimal layout (no header/footer).
- AC2: Sign-up form validates with Zod schema from `@prodigy/shared-types`; Vietnamese error messages.
- AC3: Sign-in form: on success, access token stored in memory (Zustand singleton), redirect to home.
- AC4: Access token NEVER written to localStorage (assertion: `localStorage.getItem('access_token') === null`).
- AC5: On validation error, form preserves user input + shows field-level errors.
- AC6: Submit button disabled during `isSubmitting`.

---

### Story 2.9 — Frontend: PLP page (RSC + Client filter sidebar)

**FR**: FR-80, FR-81, FR-83, FR-84
**Risk**: [R-018] (Lighthouse regression), [R-023] (hydration mismatch)
**Size**: 2 days

**Description**: PLP page RSC parent + Client FilterSidebar, Suspense skeleton, next/image.

**Acceptance Criteria**:

- AC1: `(public)/products/page.tsx` is RSC; fetches product list server-side.
- AC2: `<FilterSidebar />` is `'use client'` component nested inside RSC parent.
- AC3: Suspense boundary with `loading.tsx` skeleton shown <100ms while data streams.
- AC4: Product cards use `<Image />` with explicit width/height, `sizes`, lazy loading.
- AC5: Filter by category, price range, rating; sort by price/rating/newest — all via URL search params.
- AC6: Pagination component with page numbers; URL-driven (shareable links).
- AC7: CLS <0.1 on PLP (no layout shift from images loading).

---

### Story 2.10 — Frontend: PDP page (RSC + ISR)

**FR**: FR-82, FR-84
**Risk**: [R-021] (ISR stale)
**Size**: 1 day

**Description**: PDP page RSC + ISR revalidate=60, multi-image display, "Add to cart" client island.

**Acceptance Criteria**:

- AC1: `(public)/products/[id]/page.tsx` exports `revalidate = 60`.
- AC2: Displays product name, price (VND formatted ₫), discount badge, description, stock status.
- AC3: Multi-image: primary, hover, detail images displayed with next/image priority on hero.
- AC4: "Add to cart" button is a tiny `'use client'` island (does not make entire page client).
- AC5: Non-existent product → `not-found.tsx` renders 404 page.
- AC6: Category displayed as link (from FK join, not free-form string).

---

## Epic 3 — Cart, Order, Payment & Email Queue (Tuần 3)

> **Goal**: End-to-end purchase flow works (COD + PayPal sandbox). Email confirmation async.
> Sprint này chứa critical path: checkout transaction + PayPal webhook — risk cao nhất về data integrity.

---

### Story 3.1 — Cart module: add/update/remove/get

**FR**: FR-20, FR-21, FR-22, FR-23
**Risk**: [R-013] (cart race condition)
**Size**: 2 days

**Description**: Server-side cart CRUD, merge same product, stock validation.

**Acceptance Criteria**:

- AC1: `POST /api/cart/items` body `{ productId, amount }` → 200 returns full cart. Anonymous → 401.
- AC2: Same product already in cart → amount merged (not duplicate line). UNIQUE constraint `(cart_id, product_id)`.
- AC3: `amount > countInStock` → 400 `insufficient_stock` with current stock in message.
- AC4: `PATCH /api/cart/items/:productId` body `{ amount }` → 200. `amount=0` removes item.
- AC5: `DELETE /api/cart/items/:productId` → 200 returns cart after removal; item not found → 404.
- AC6: `GET /api/cart` → 200 returns `{ items: CartItem[], itemsPrice, totalQuantity }` with current product data.
- AC7: Soft-deleted product in cart → flagged `unavailable: true` in response.

---

### Story 3.2 — Checkout preview + order create (atomic transaction)

**FR**: FR-24, FR-25
**Risk**: [R-011] (stock over-decrement), [R-014] (snapshot drift)
**Size**: 2 days

**Description**: Checkout preview validates stock/totals. Order create in single ACID transaction with pessimistic lock.

**Acceptance Criteria**:

- AC1: `POST /api/checkout/preview` body `{ shippingAddress, deliveryMethod, paymentMethod }` → 200 returns computed totals.
- AC2: `deliveryMethod` ∈ `{fast, economical}`; shipping: fast=30000, economical=15000 VND.
- AC3: Cart empty → 400 `cart_empty`; any item exceeds stock → 409 `insufficient_stock`.
- AC4: `POST /api/orders` → 201 returns `{ orderId, status, totalPrice }`. Transaction wraps: SELECT FOR UPDATE products → check stock → decrement → INSERT order + order_items → clear cart.
- AC5: Concurrent checkout same product (stock=1): only 1 succeeds, other gets 409. Stock never negative.
- AC6: OrderItems snapshot price/name/image/discount at order time (immutable after create).
- AC7: COD → status `PENDING`; PayPal → status `AWAITING_PAYMENT`.

---

### Story 3.3 — Cancel order + stock restore

**FR**: FR-26
**Risk**: [R-011]
**Size**: 1 day

**Description**: Cancel pending/awaiting_payment orders, restore stock atomically.

**Acceptance Criteria**:

- AC1: `DELETE /api/orders/:id` → 200 returns order with `status=CANCELLED`. Stock restored in transaction.
- AC2: Owner != current user AND not admin → 403.
- AC3: Status ∉ `{PENDING, AWAITING_PAYMENT}` → 409 `cannot_cancel`.
- AC4: Stock restore atomic: `UPDATE products SET countInStock = countInStock + amount` per item.
- AC5: Audit log entry: `event=order_cancelled, orderId, userId`.

---

### Story 3.4 — PayPal create-order endpoint

**FR**: FR-30
**Risk**: [R-034] (currency mismatch)
**Size**: 1.5 days

**Description**: Backend creates PayPal order via SDK, stores paypal_order_id, VND→USD conversion.

**Acceptance Criteria**:

- AC1: `POST /api/payment/paypal/create-order` body `{ orderId }` → 200 returns `{ paypalOrderId }`.
- AC2: Order must be `AWAITING_PAYMENT` + owned by current user; otherwise 404/403.
- AC3: PayPal SDK called with `intent=CAPTURE`, `currency=USD`, amount = VND / `USD_VND_RATE` (env, default 24000).
- AC4: `paypal_order_id`, `paypal_amount`, `paypal_currency` stored on Order entity.
- AC5: PayPal SDK error → 502 `payment_provider_error`.
- AC6: PayPal client ID + secret from env (Zod validated); never hard-coded.

---

### Story 3.5 — PayPal webhook receiver + signature verification

**FR**: FR-31, FR-33
**Risk**: [R-002] (signature forgery), [R-004] (isPaid bypass)
**Size**: 2 days

**Description**: Webhook endpoint verifies PayPal signature, marks order paid server-authoritatively.

**Acceptance Criteria**:

- AC1: `POST /api/payment/paypal/webhook` (no auth middleware) → 200 on success.
- AC2: Signature verification using PayPal Webhook ID + transmission headers. Invalid → 401 `webhook_signature_invalid`.
- AC3: Event `PAYMENT.CAPTURE.COMPLETED` → find order by `paypal_order_id` → update `isPaid=true, paidAt=NOW(), status=PAID`.
- AC4: Other event types → log + return 200 (no-op).
- AC5: Raw body preserved for signature digest (middleware before JSON parse).
- AC6: NO public endpoint allows client to set `isPaid=true` (DTO whitelist strips it).
- AC7: Webhook endpoint exempt from CORS and per-IP rate limit.

---

### Story 3.6 — Webhook idempotency (dedup table)

**FR**: FR-32
**Risk**: [R-003] (replay attack)
**Size**: 1 day

**Description**: `processed_webhook_events` table dedup, same-transaction insert + order update.

**Acceptance Criteria**:

- AC1: `processed_webhook_events` table with PK = PayPal `event_id`.
- AC2: Before processing: INSERT event_id in same transaction as Order update.
- AC3: Duplicate event_id → INSERT fails (unique violation) → rollback → return 200 with log `event_already_processed=true`.
- AC4: Fresh event → INSERT + UPDATE order → COMMIT → enqueue email job.
- AC5: E2E replay test: same webhook payload sent twice → order only marked paid once.

---

### Story 3.7 — BullMQ email queue + Nodemailer worker

**FR**: FR-60, FR-61, FR-62
**Risk**: [R-030] (SMTP missing)
**Size**: 1.5 days

**Description**: NotificationModule với BullMQ producer + consumer, Nodemailer → Mailhog, retry policy.

**Acceptance Criteria**:

- AC1: Order create → enqueue `email:order-confirmed` job with `{ orderId, userEmail, items, totalPrice }`.
- AC2: Enqueue completes <50ms (Redis push); HTTP response NOT blocked on SMTP.
- AC3: Worker consumes job, renders template, sends via Nodemailer to Mailhog.
- AC4: Retry policy: 3 attempts, exponential backoff (1s, 5s, 25s).
- AC5: Failed after 3 attempts → job in failed queue + error logged with correlation ID.
- AC6: Webhook paid → enqueue `email:order-paid`. Admin mark delivered → enqueue `email:order-delivered`.
- AC7: Email visible in Mailhog UI within 5s of order creation.

---

### Story 3.8 — Frontend: Cart page (Client component + TanStack Query)

**FR**: FR-86
**Risk**: [R-013]
**Size**: 1.5 days

**Description**: Cart page full client component, TanStack Query mutations, optimistic updates.

**Acceptance Criteria**:

- AC1: `(public)/cart/page.tsx` is `'use client'`; fetches cart via TanStack Query.
- AC2: Add to cart: optimistic UI update <50ms; rollback on error with toast.
- AC3: Update quantity: inline number input; debounced PATCH call.
- AC4: Remove item: optimistic removal + rollback on failure.
- AC5: Cart summary: itemsPrice, totalQuantity computed client-side from server data.
- AC6: Empty cart state with "Continue shopping" link.
- AC7: Unavailable products (soft-deleted) shown with warning badge.

---

### Story 3.9 — Frontend: Checkout page (RHF + Zod + PayPal)

**FR**: FR-88, FR-30, FR-34
**Risk**: [R-034]
**Size**: 2 days

**Description**: Checkout form (address, delivery, payment method), PayPalButtons integration, COD flow.

**Acceptance Criteria**:

- AC1: `(public)/checkout/page.tsx` Mixed: RSC shell computes totals + Client form.
- AC2: Form uses React Hook Form + Zod schema from `@prodigy/shared-types`.
- AC3: Delivery method radio: fast (₫30,000) / economical (₫15,000); totals update live.
- AC4: Payment method: COD shows "Place order" button; PayPal shows `<PayPalButtons>`.
- AC5: COD submit → POST /api/orders → redirect to success page.
- AC6: PayPal flow: create-order → render buttons → onApprove → redirect to success (NO isPaid sent from client).
- AC7: Both VND amount (canonical) and USD equivalent displayed for PayPal option.
- AC8: Validation errors shown inline in Vietnamese.

---

### Story 3.10 — Frontend: My Orders + Order Detail pages (RSC)

**FR**: FR-40, FR-41
**Risk**: [R-006] (owner bypass)
**Size**: 1 day

**Description**: My Orders list page + Order detail page, both RSC.

**Acceptance Criteria**:

- AC1: `(public)/orders/page.tsx` RSC; fetches `GET /api/orders/me` with status filter tabs.
- AC2: Orders sorted by `createdAt desc`; pagination via search params.
- AC3: `(public)/orders/[id]/page.tsx` RSC; fetches order detail.
- AC4: Status badge with color coding (PENDING=yellow, PAID=blue, DELIVERED=green, CANCELLED=red).
- AC5: Order items display snapshot data (price at order time, not current).
- AC6: Cancel button visible only for PENDING/AWAITING_PAYMENT orders.

---

## Epic 4 — Frontend Depth + Admin Module (Tuần 4)

> **Goal**: Frontend craft signals visible (RSC discipline, performance, state). Admin fully functional.
> Sprint này focus vào recruiter-facing signals: admin CRUD, WebSocket realtime, reviews, Lighthouse scores.

---

### Story 4.1 — Reviews: list + submit (verified-purchase) + delete

**FR**: FR-50, FR-51, FR-52
**Risk**: [R-007] (verified-purchase bypass), [R-033] (false positive)
**Size**: 2 days

**Description**: Review endpoints: public list, verified-purchase submit, owner/admin delete, rating recompute.

**Acceptance Criteria**:

- AC1: `GET /api/products/:id/reviews?page=&pageSize=` → 200 paginated. Displays `{ content, star, userName, createdAt }`. NO userId/email exposed.
- AC2: `POST /api/products/:id/reviews` body `{ content, star }` → 201. Anonymous → 401.
- AC3: User without DELIVERED order containing this product → 403 `purchase_required`.
- AC4: User already reviewed this product → 409 `already_reviewed`.
- AC5: `content` 1-1000 chars; `star` 1-5 integer. Violations → 400.
- AC6: After submit/delete: product `rating` recomputed (AVG star) + `reviewCount` updated + cache invalidated.
- AC7: `DELETE /api/reviews/:id` → 200. Owner or admin only; otherwise 403.

---

### Story 4.2 — Admin dashboard + KPI endpoint

**FR**: FR-70
**Risk**: N/A
**Size**: 1 day

**Description**: Admin dashboard API + frontend page with KPI tiles and chart.

**Acceptance Criteria**:

- AC1: `GET /api/admin/dashboard` (admin only) → 200 returns `{ todayOrders, todayRevenue, topProducts[5], lowStockProducts[] }`.
- AC2: `lowStockProducts` = products with `countInStock < 5`.
- AC3: `topProducts` sorted by `selled desc` limit 5.
- AC4: Response cached 60s at `admin:dashboard:kpis`; invalidated on order create/update.
- AC5: Frontend `(admin)/dashboard/page.tsx` Mixed: RSC fetches KPIs + Client chart component.

---

### Story 4.3 — Admin user management (CRUD + bulk)

**FR**: FR-71
**Risk**: [R-005] (RBAC)
**Size**: 1.5 days

**Description**: Admin user list/detail/update/delete endpoints + frontend page.

**Acceptance Criteria**:

- AC1: `GET /api/admin/users?q=&role=&page=&pageSize=` → 200 paginated. Search by email substring.
- AC2: `PATCH /api/admin/users/:id` body `{ role, name, phone, address, city }` → 200. Email/password NOT updatable.
- AC3: `DELETE /api/admin/users/:id` → 204. User with orders → soft-delete; no orders → hard-delete.
- AC4: Admin cannot self-delete → 400 `cannot_delete_self`.
- AC5: `POST /api/admin/users/delete-many` body `{ ids }` → 200 `{ deletedCount }`.
- AC6: Frontend: shadcn DataTable + search + role filter + delete confirmation dialog.

---

### Story 4.4 — Admin product management (CRUD + cache invalidation)

**FR**: FR-72, FR-14
**Risk**: [R-012] (cache stale after write), [R-017] (soft-delete integrity)
**Size**: 2 days

**Description**: Admin product CRUD + cache invalidation + on-demand ISR revalidation.

**Acceptance Criteria**:

- AC1: `POST /api/admin/products` body with all required fields → 201. Name unique; price ≥0; stock ≥0; discount 0-100.
- AC2: `PUT /api/admin/products/:id` → 200. Triggers: DEL `catalog:product:{id}` + SCAN-DEL `catalog:products:list:*` + `revalidatePath('/products/[id]')`.
- AC3: `DELETE /api/admin/products/:id` → 204. Soft-delete if in active orders; hard-delete otherwise.
- AC4: `POST /api/admin/products/delete-many` → 200.
- AC5: Image fields validated as valid URL format (no binary upload).
- AC6: Frontend: shadcn DataTable + create/edit Sheet form (Server Action) + bulk delete.
- AC7: After admin update, public PDP fetch immediately returns fresh data (E2E #4 scenario).

---

### Story 4.5 — Admin category management (CRUD + cascade protection)

**FR**: FR-73
**Risk**: N/A
**Size**: 1 day

**Description**: Category CRUD, slug auto-generation, cascade protection.

**Acceptance Criteria**:

- AC1: `POST /api/admin/categories` body `{ name }` → 201. `slug` auto-generated (kebab-case), both unique.
- AC2: `PUT /api/admin/categories/:id` → 200. Slug regenerated from new name.
- AC3: `DELETE /api/admin/categories/:id` with associated products → 409 `category_has_products`.
- AC4: Delete without products → 204. Cache `catalog:categories:all` invalidated on any write.
- AC5: Frontend: shadcn table + inline create/edit form.

---

### Story 4.6 — Admin order management + state machine + mark delivered

**FR**: FR-74, FR-75, FR-78
**Risk**: [R-032] (state machine misconfig)
**Size**: 2 days

**Description**: Admin order list/detail, state machine transitions, mark delivered/paid.

**Acceptance Criteria**:

- AC1: `GET /api/admin/orders?status=&userId=&from=&to=&paymentMethod=&page=` → 200 paginated.
- AC2: `GET /api/admin/orders/:id` → 200 with full detail + audit history (status changes).
- AC3: `PATCH /api/admin/orders/:id` body `{ isDelivered?, isPaid? }` → 200. Valid transitions only.
- AC4: Invalid transition (e.g., DELIVERED→PENDING, CANCELLED→anything) → 409 `invalid_transition`.
- AC5: Mark delivered → triggers `email:order-delivered` enqueue + audit log entry.
- AC6: State machine: `OrderStateMachine.canTransition(from, to)` as single source of truth.
- AC7: Frontend: shadcn DataTable + status filter + "Mark Delivered" button + transition confirmation.

---

### Story 4.7 — Admin comment management + audit trail

**FR**: FR-76, FR-79
**Risk**: [R-015] (audit log loss)
**Size**: 1 day

**Description**: Admin comment list/delete with audit log, rating recompute.

**Acceptance Criteria**:

- AC1: `GET /api/admin/comments?productId=&userId=&page=` → 200 paginated.
- AC2: `DELETE /api/admin/comments/:id` → 204. Audit log: `{ event: comment_deleted_by_admin, commentId, adminId }`.
- AC3: `POST /api/admin/comments/delete-many` → 200.
- AC4: After delete: product rating recomputed + cache invalidated.
- AC5: `GET /api/admin/audit-log?event=&from=&to=&page=` → 200 paginated (admin only).
- AC6: Audit write is best-effort async; business response NOT blocked if audit fails.

---

### Story 4.8 — WebSocket admin gateway + realtime new-orders feed

**FR**: FR-77, FR-90, FR-91
**Risk**: [R-025] (reconnect storm)
**Size**: 2 days

**Description**: NestJS WebSocket gateway `/admin/orders`, first-message auth, Socket.IO client in admin layout.

**Acceptance Criteria**:

- AC1: `@WebSocketGateway({ namespace: '/admin/orders' })` with handshake auth middleware.
- AC2: Connection accepted only if `auth.token` valid AND `role === 'ADMIN'`; otherwise disconnect.
- AC3: After `OrderService.create` commits → emit `order.created` event to all connected admins.
- AC4: `(admin)/layout.tsx` (client) connects Socket.IO on mount; disconnects on unmount.
- AC5: Reconnect: exponential backoff (1s, 5s, 25s, max 5 attempts); then polling fallback every 30s.
- AC6: Connection status indicator: green (connected) / yellow (reconnecting) / red (failed).
- AC7: Toast notification + badge counter increment on `order.created` event.

---

### Story 4.9 — Frontend: Admin Server Actions for forms

**FR**: FR-87
**Risk**: [R-024] (redirect loop)
**Size**: 1.5 days

**Description**: Admin CRUD forms use Server Actions; shared Zod validation.

**Acceptance Criteria**:

- AC1: Create product form: `<form action={createProductAction}>` with `'use server'` directive.
- AC2: Validation via Zod schema shared with backend (`packages/shared-types`).
- AC3: On success: `revalidatePath` + redirect to list page.
- AC4: On error: return error state; form preserves user input (no data loss).
- AC5: Update forms: same pattern with pre-populated fields.
- AC6: No infinite redirect loop on validation failure (max 2 navigations assertion).

---

### Story 4.10 — Frontend: Optimistic updates (cart, review, admin)

**FR**: FR-86
**Risk**: N/A
**Size**: 1 day

**Description**: TanStack Query optimistic update patterns cho cart add/remove, review submit, admin mark delivered.

**Acceptance Criteria**:

- AC1: Cart "Add to cart": optimistic UI update <50ms; rollback + toast on 4xx/5xx.
- AC2: Review submit: optimistic add to review list; rollback on error.
- AC3: Admin mark delivered: optimistic status update in table row; rollback on error.
- AC4: Error toast shows server error message (Vietnamese user-facing).
- AC5: Loading states (spinner/disabled) during mutation pending.

---

### Story 4.11 — Frontend: Web Vitals + Lighthouse CI integration

**FR**: FR-85
**Risk**: [R-018] (Lighthouse regression), [R-022] (bundle size)
**Size**: 1 day

**Description**: Web Vitals reporter hook, `.lighthouserc.json`, Lighthouse CI job in GitHub Actions.

**Acceptance Criteria**:

- AC1: `useReportWebVitals` hook logs LCP, INP, CLS to console.
- AC2: `.lighthouserc.json` configured per architecture §4.10 (Performance ≥90, Accessibility ≥90 on PLP/PDP).
- AC3: Lighthouse CI job added to GitHub Actions; runs on PR to main.
- AC4: PLP Lighthouse Performance ≥90 (production build, local).
- AC5: PDP Lighthouse Performance ≥90.
- AC6: Initial JS bundle gzipped <250KB for PLP route.

---

## Epic 5 — Tests, Observability, Docs & Polish (Tuần 5)

> **Goal**: Portfolio-grade artifact. README is the front door. All quality gates pass.
> Sprint này biến code thành showcase — tests, ADRs, GIFs, README, observability proof.

---

### Story 5.1 — Unit tests: Auth + Payment services (≥70% coverage)

**FR**: NFR-05 AC1
**Risk**: [R-001], [R-002], [R-003], [R-004]
**Size**: 2 days

**Description**: Unit tests cho AuthService (rotation, reuse, blacklist) + PaymentService (signature, idempotency, conversion).

**Acceptance Criteria**:

- AC1: AuthService unit tests cover: sign-up hash, sign-in verify, rotation logic, reuse detection, blacklist check.
- AC2: PaymentService unit tests cover: signature verify mock, idempotency check, VND→USD conversion edge cases.
- AC3: Coverage ≥70% on `auth/services/` and `payment/services/`.
- AC4: Tests mock Redis/DB at boundary (no real connections in unit tests).
- AC5: All tests pass with `npm run test:unit` in <30s.

---

### Story 5.2 — Unit tests: Catalog + Order + Notification services

**FR**: NFR-05 AC1
**Risk**: [R-011], [R-012], [R-032]
**Size**: 2 days

**Description**: Unit tests cho CatalogService (cache logic), OrderService (state machine, transaction), NotificationService (queue).

**Acceptance Criteria**:

- AC1: CatalogService: cache hit/miss logic, invalidation trigger, query hash computation.
- AC2: OrderService: state machine `canTransition` matrix (all valid/invalid pairs), stock validation logic.
- AC3: NotificationService: job enqueue payload shape, retry config.
- AC4: Coverage ≥70% on `catalog/services/`, `order/services/`, `notification/services/`.
- AC5: Combined service layer coverage ≥70% (Jest coverage report).

---

### Story 5.3 — Integration tests: testcontainers (security + data integrity)

**FR**: NFR-05 AC2, AC3
**Risk**: [R-001]–[R-017] (all high-priority risks)
**Size**: 2 days

**Description**: Integration tests với testcontainers MySQL + Redis cho P0 test classes.

**Acceptance Criteria**:

- AC1: Testcontainers spin up real MySQL 8 + Redis 7 per test suite.
- AC2: Tests cover: refresh rotation reuse → family revoked (R-001, R-016).
- AC3: Tests cover: webhook signature invalid → 401; valid → order paid (R-002).
- AC4: Tests cover: webhook replay → second no-op (R-003).
- AC5: Tests cover: concurrent checkout same product → only 1 succeeds (R-011).
- AC6: Tests cover: RBAC bypass attempt → 403 on all admin endpoints (R-005).
- AC7: Tests cover: owner-or-admin guard → user A cannot access user B's order (R-006).
- AC8: Tests cover: PII projection → no password in any user-returning endpoint (R-008).
- AC9: All integration tests pass in CI within 10 minutes.

---

### Story 5.4 — Playwright E2E: 7 critical flows

**FR**: NFR-05 AC4
**Risk**: [R-001]–[R-018] (E2E coverage of high-priority risks)
**Size**: 2 days

**Description**: 7 Playwright E2E flows green trong CI.

**Acceptance Criteria**:

- AC1: E2E #1: Sign-up → sign-in → browse PLP → add to cart → checkout COD → see order in My Orders.
- AC2: E2E #2: PayPal checkout sandbox → webhook simulation → order confirmed paid.
- AC3: E2E #3: Admin mark order delivered → user sees status update.
- AC4: E2E #4: Admin update product → public PDP fetch returns new data immediately (cache invalidation).
- AC5: E2E #5: Refresh token rotation → reuse detection → forced logout.
- AC6: E2E #6: Non-admin user attempts admin endpoints → 403 on all.
- AC7: E2E #7: User without DELIVERED order attempts review → 403 `purchase_required`.
- AC8: All 7 flows green in GitHub Actions CI.

---

### Story 5.5 — OpenTelemetry instrumentation + Jaeger verification

**FR**: NFR-04
**Risk**: [R-031] (trace ID gap in BullMQ)
**Size**: 1 day

**Description**: Verify OTel traces end-to-end: HTTP → DB → Redis → BullMQ spans visible in Jaeger.

**Acceptance Criteria**:

- AC1: Order create trace in Jaeger shows spans: HTTP handler → TypeORM query → Redis cache invalidation → BullMQ enqueue.
- AC2: PayPal webhook trace shows: HTTP → signature verify → DB transaction → BullMQ enqueue.
- AC3: BullMQ job processing has `traceparent` propagated from producer.
- AC4: Pino logs include `traceId` and `spanId` fields matching Jaeger traces.
- AC5: `/metrics` endpoint returns Prometheus-format counters: `http_requests_total`, `cache_hits_total`, `cache_misses_total`, `bullmq_jobs_completed_total`.

---

### Story 5.6 — ADRs (≥6) + architecture diagrams

**FR**: NFR-06 AC2, AC4
**Risk**: N/A
**Size**: 1.5 days

**Description**: Write ≥6 ADRs trong `docs/ADRs/`, architecture diagrams trong `docs/architecture.md`.

**Acceptance Criteria**:

- AC1: ADR-01: Modular monolith over microservices.
- AC2: ADR-02: Single-DB ACID transaction over Saga.
- AC3: ADR-03: Cache-aside flat namespace + SCAN-DEL invalidation.
- AC4: ADR-04: JWT rotation + refresh cookie Path=/api/auth.
- AC5: ADR-05: PayPal webhook idempotency (dedup table).
- AC6: ADR-06: RSC default + Client Components at interactivity boundary.
- AC7: Each ADR follows format: Context → Options → Decision → Consequences → Reversibility.
- AC8: `docs/architecture.md` contains ≥3 diagrams: component view, ERD, PayPal webhook sequence.

---

### Story 5.7 — README portfolio-grade + animated GIFs

**FR**: NFR-06 AC3
**Risk**: N/A
**Size**: 1.5 days

**Description**: README with 8 sections, animated GIF demos, anomalies table, badges.

**Acceptance Criteria**:

- AC1: README section 1: 60-second pitch (what, why, how).
- AC2: README section 2: Stack badges (NestJS, Next.js, TypeScript, MySQL, Redis, etc.).
- AC3: README section 3: "Run locally in <5 min" with seed credentials + `docker compose up`.
- AC4: README section 4: Architecture diagram inline (mermaid or image).
- AC5: README section 5: Anomalies fixed table (24 rows with commit links).
- AC6: README section 6: Animated GIF demos (3-4: catalog browse, PayPal checkout, admin orders, refresh rotation).
- AC7: README section 7: Test/coverage badges.
- AC8: README section 8: Future work (Saga, microservices, CD, search, recommendations).

---

### Story 5.8 — CI finalization + quality gates

**FR**: NFR-05 AC5, NFR-06 AC6
**Risk**: [R-027] (CI slow), [R-028] (any leakage)
**Size**: 1 day

**Description**: CI workflow hoàn chỉnh: lint → typecheck → unit → integration → E2E → Lighthouse → build.

**Acceptance Criteria**:

- AC1: GitHub Actions workflow runs full pipeline on PR to main.
- AC2: PR fails if: coverage drops below 70%, lint errors, typecheck fails, E2E fails, Lighthouse below threshold.
- AC3: Branch protection on main requires CI green.
- AC4: ESLint `--max-warnings 0`; no `console.log` in production code.
- AC5: TypeScript strict mode; 0 `any` in service layer (custom rule).
- AC6: Total CI time <15 minutes.
- AC7: Coverage report comment posted on PR.

---

### Story 5.9 — Final polish + code review pass

**FR**: NFR-06
**Risk**: N/A
**Size**: 1 day

**Description**: Final pass: remove dead code, verify conventional commits, anomaly commit tags, code review.

**Acceptance Criteria**:

- AC1: No commented-out code in any committed file.
- AC2: All 24 anomaly fixes traceable via commit messages containing `#A<N>` reference.
- AC3: Conventional commit format on all commits (verified by commitlint).
- AC4: `bmad-code-review` pass clean (or known issues documented).
- AC5: `bmad-review-edge-case-hunter` pass clean (or known issues documented).
- AC6: All success criteria from PRD §1.4 verified green.

---

## Summary — Epic/Story Count

| Epic                            | Sprint     | Stories | Total Days (est.)  |
| ------------------------------- | ---------- | ------- | ------------------ |
| Epic 1 — Foundation & CI        | Tuần 1     | 7       | 8 days             |
| Epic 2 — Auth + Catalog         | Tuần 2     | 10      | 16 days            |
| Epic 3 — Cart, Order, Payment   | Tuần 3     | 10      | 15 days            |
| Epic 4 — Frontend Depth + Admin | Tuần 4     | 11      | 16 days            |
| Epic 5 — Tests, Docs, Polish    | Tuần 5     | 9       | 14 days            |
| **Total**                       | **5 tuần** | **47**  | **~69 story-days** |

> **Note**: Estimate 69 story-days cho 5 tuần (25-35 working days) có vẻ tight.
> Mitigation: nhiều stories có overlap (frontend + backend cùng feature), và estimate
> conservative (max 2 days). Actual velocity sẽ được track qua sprint status.

---

## Risk Coverage Matrix

> Mapping high-priority risks (≥6) sang stories đảm bảo mỗi risk có ít nhất 1 story address.

| Risk ID | Description                      | Covered by Story       |
| ------- | -------------------------------- | ---------------------- |
| R-001   | Refresh token reuse              | 2.3, 5.3, 5.4 (E2E #5) |
| R-002   | Webhook signature forgery        | 3.5, 5.3, 5.4 (E2E #2) |
| R-003   | Webhook replay attack            | 3.6, 5.3, 5.4 (E2E #4) |
| R-004   | isPaid bypass                    | 3.5, 5.3               |
| R-005   | RBAC bypass                      | 2.4, 5.3, 5.4 (E2E #6) |
| R-006   | Owner-or-admin bypass            | 3.10, 5.3              |
| R-007   | Verified-purchase bypass         | 4.1, 5.4 (E2E #7)      |
| R-008   | PII leak                         | 2.1, 2.5, 5.3          |
| R-009   | Token in localStorage            | 2.8, 5.4               |
| R-010   | CORS regression                  | 2.4, 5.3               |
| R-011   | Stock over-decrement             | 3.2, 5.3, 5.4 (E2E #1) |
| R-012   | Cache stale after write          | 4.4, 5.4 (E2E #4)      |
| R-013   | Cart race condition              | 3.1, 5.3               |
| R-014   | Order snapshot drift             | 3.2, 5.3               |
| R-015   | Audit log loss                   | 4.7, 5.3               |
| R-016   | Refresh family revoke incomplete | 2.3, 5.3               |
| R-017   | Soft-delete integrity            | 2.6, 4.4, 5.3          |
| R-018   | Lighthouse regression            | 4.11, 5.4              |
