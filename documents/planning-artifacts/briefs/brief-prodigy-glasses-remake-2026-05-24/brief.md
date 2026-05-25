---
title: Product Brief — Prodigy Glasses Remake (MERN → NestJS Modular Monolith)
project: prodigy-glasses-remake
status: complete
created: 2026-05-24
updated: 2026-05-24
author: Jarvis
intent: create
---

# Product Brief — Prodigy Glasses Remake

> Status: 🟢 DRAFT COMPLETE — sẵn sàng cho user review và Finalize.
>
> Inputs already loaded as facts (no re-discovery needed):
>
> - `migration-draft-plan.md` (original technical draft, superseded)
> - `documents/knowledge/project-context.md` (legacy snapshot, 27 anomalies)
> - `documents/planning-artifacts/migration-master-plan.md` (BMad roadmap)
>
> All major decisions captured in `.decision-log.md`.

## 1. Purpose & Stakes

### Why this exists

Showcase project cho **portfolio fullstack (frontend-focus)** của Jarvis — chuyển hệ Prodigy Glasses MERN cũ (CRA/Vite + Express + Mongoose) sang một **modular monolith production-grade**: NestJS + TypeORM + MySQL + Redis ở backend, NextJS App Router + RSC ở frontend. Mục tiêu kép:

1. **Học stack mới ở độ sâu thực sự** — NestJS, TypeORM, Redis cache-aside, NextJS App Router. Không cargo-cult, không học bề mặt.
2. **Tạo artifact khẳng định năng lực fullstack với recruiter** — đủ depth để vượt qua review của senior engineer, đủ rộng để cover một e-commerce thực thụ (auth, catalog, cart, checkout PayPal, admin).

### Why not the original microservices draft

Bản draft gốc (`migration-draft-plan.md`) thiết kế cho team 3-5 người, 3-6 tháng: 4 microservices + gRPC + Kafka + Saga + Outbox + dual-write. Solo 2-3 tuần làm hết = signal **cargo-culting** với recruiter senior, không phải signal năng lực. Lý do đầy đủ cho việc drop microservices/gRPC/Kafka/Saga/dual-write/reconciliation nằm trong `.decision-log.md`.

### Stakes

- **Personal stakes**: HIGH — đây là project show-off CV, sẽ link trong application. Không chấp nhận "đủ chạy là được".
- **Business stakes**: NONE — không có user thật, không có data thật, không có revenue. Free để take design risk hợp lý mà production sẽ không cho phép.
- **Technical stakes**: MEDIUM-HIGH — depth của code là điều recruiter sẽ review từng commit, từng PR, từng test file. Quality bar = portfolio-grade, không phải MVP-grade.

### Stack đã chốt

**Backend**

- NestJS (modular monolith — module-per-domain: Auth / Catalog / Cart-Order / Payment / Notification).
- TypeORM + MySQL (single DB, normalized schema with FK constraints).
- Redis (cache-aside cho catalog + JWT blacklist + BullMQ queue backend).
- BullMQ (email queue, replace inline SMTP của legacy).
- PayPal SDK (sandbox account user đã có) — webhook idempotent + signature verify.
- Nodemailer (consumer của BullMQ, fix `#A17`).
- OpenTelemetry → Jaeger (distributed tracing depth point).

**Frontend**

- NextJS App Router + RSC.
- TanStack Query (server state) + Zustand (client state) — drop Redux của legacy.
- React Hook Form + Zod.
- Tailwind + shadcn/ui (split: shadcn cho `(admin)`, vanilla Tailwind cho `(public)`, fix `#A27`).
- Optional animation: GSAP hoặc Framer Motion cho public pages (non-mandatory).
- Atomic Design 3 tầng (Atoms / Molecules / Organisms — 5 tầng overkill cho scope này).

**Test**

- Jest + Supertest (unit + integration, ≥70% coverage trên service layer).
- Testcontainers (MySQL + Redis isolated cho integration).
- Playwright (5-7 critical E2E flows).

**CI/CD**

- GitHub Actions (lint + typecheck + unit + integration + E2E Playwright + Docker build) — quality gate trước merge.
- **CD: DEFERRED** — local-first development. App chạy hoàn toàn qua `docker compose up`; deploy lên cloud sẽ tính sau khi local stable. README phải đảm bảo recruiter setup được trong <5 phút (seed data + animated GIF demo flows).
- Secret management: chưa cần — local `.env.example` + docker-compose env injection đủ.

### Career intent

- **Apply target**: Fullstack roles (frontend-focus). Brief này tối ưu cho recruiter công ty product/SaaS có traffic significant — depth ở SSR/RSC patterns, performance, state architecture sẽ là weight chính trong showcase.
- **Bonus depth signals**: CI pipeline chuẩn, observability không decorative, security baseline (rotation, idempotency, signature verify) — hiếm thấy trong portfolio solo. CD defer, sẽ add khi local stable.

### Timebox

- **Target**: 27-35 ngày solo full-time (~5 tuần). Đã giảm từ 29-38 sau khi defer CD.
- **No MVP cut** — user accepted timebox tăng thay vì cắt depth.
- Weekly milestones (chi tiết ở Section 4.3):
  - Tuần 1: Foundation (monorepo, Docker stack, NestJS bootstrap, DB schema, NextJS skeleton, CI baseline).
  - Tuần 2: Auth + Catalog + cache.
  - Tuần 3: Cart + Order + PayPal webhook + BullMQ email.
  - Tuần 4: Frontend depth (RSC patterns, Suspense, ISR, Web Vitals, TanStack Query + Server Actions, RHF+Zod).
  - Tuần 5: Tests portfolio-grade + observability + README + animated GIF demos + polish.

---

## 2. Target Users & Jobs-to-be-Done

> Brief này có **2 lớp users** — quan trọng phải tách ra vì JTBD của 2 lớp khác nhau.

### Lớp 1 — Recruiter / Engineering hiring manager (PRIMARY audience)

> Đây là người brief thực sự phục vụ. Toàn bộ scope, depth, polish của project được calibrate cho họ.

**Profile**

- Senior engineer hoặc engineering manager review CV / GitHub trước khi schedule interview.
- Time budget: 5-15 phút lướt repo + 30-45 giây quyết định "có đáng phỏng vấn không".
- Đã review hàng trăm portfolio cargo-cult — radar bén với code mỏng, README đẹp nhưng commit history thưa, tests chỉ có happy path.

**JTBDs**

1. **"Khi tôi review CV solo dev, tôi cần verify nhanh rằng họ hiểu trade-offs, không chỉ pattern names."** → Brief addresses by: explicit decision log (sao drop microservices), ADR cho mỗi decision lớn, "Future Work" section show awareness mà không claim implementation.
2. **"Khi tôi đánh giá frontend depth, tôi cần thấy RSC patterns đúng chỗ, không phải `'use client'` everywhere."** → Brief addresses by: RSC/Client component matrix có document, Suspense boundaries, streaming, ISR cho catalog.
3. **"Khi tôi đánh giá backend solid, tôi cần thấy security baseline, không phải `app.use(cors())` mở toang."** → Brief addresses by: 27 anomalies legacy được fix có document, JWT rotation đúng, webhook signature verify, RBAC chuẩn.
4. **"Khi tôi đánh giá production readiness, tôi cần thấy CI thật, tests > happy path, observability không decorative."** → Brief addresses by: portfolio-grade tests gate trong CI, OpenTelemetry traces có sample screenshot trong README, animated GIF demo cho 3-4 critical flows. CD defer post-MVP — README làm rõ "live URL coming soon, run local in <5 min".

**Anti-JTBDs (tránh signal sai)**

- KHÔNG cố show off Saga/Kafka/microservices — recruiter sẽ thấy mismatch giữa scope và độ sâu code → trust drop.
- KHÔNG mock data với 5 products — phải seed catalog đủ realistic (≥30 products, ≥6 categories, có image thật) để các filter/search/cache TTL nói lên ý nghĩa.
- KHÔNG tests tự sướng — tests phải chạm cache invalidation, idempotency replay, RBAC bypass attempt — không phải `expect(2 + 2).toBe(4)`.

### Lớp 2 — End-user của hệ Prodigy Glasses (SECONDARY — để giữ business logic sát thực tế)

> User không có thật, nhưng brief vẫn cần JTBD của họ để **business logic make sense** — đây là điểm Jarvis nhấn mạnh ngay từ đầu.

#### Persona 2A — "Mai" — Customer mua kính online

- 25-35 tuổi, mua online vì không có thời gian ra cửa hàng, đọc reviews kỹ trước khi quyết định.
- **JTBDs**:
  - "Khi tôi browse catalog, tôi cần filter theo category + price + rating nhanh để thu hẹp lựa chọn."
  - "Khi tôi xem PDP, tôi cần thấy multi-image, reviews, stock status real-time để tin tưởng đặt mua."
  - "Khi tôi checkout, tôi cần PayPal hoặc COD, confirm email tức thì để biết đơn đã ghi nhận."
  - "Khi tôi xem 'My Orders', tôi cần biết status đơn đang ở đâu."

#### Persona 2B — "Anh Tuấn" — Admin quản lý cửa hàng

- Owner/staff, dùng admin UI hàng ngày để cập nhật catalog, xử lý đơn, trả lời comment.
- **JTBDs**:
  - "Khi tôi thêm product mới, tôi cần upload nhiều ảnh, gán category, set discount, validate stock."
  - "Khi đơn mới đến, tôi cần thấy realtime, mark delivered, nhìn dashboard tổng doanh thu."
  - "Khi có comment xấu, tôi cần delete nhanh nhưng có audit trail."

#### JTBD shaping cho brief

- Persona 2A → drives frontend depth: catalog filter performance (cache!), PDP RSC, checkout flow polish, order tracking.
- Persona 2B → drives admin UI scope: 5 admin modules (User / Product / Order / Comment / Category) như legacy, nhưng UX cleaner (single design system thay vì AntD+MUI mix).

---

## 3. Scope (In / Out)

> Scope below is **locked**. Anything not listed here is out-of-scope by default. Section 8 enumerates explicit non-goals so recruiter sees awareness, not omission.

### 3.1 Functional scope — IN

**Auth & Identity**

- Email/password sign-up, sign-in, sign-out.
- JWT access (short TTL ~15min) + refresh token rotation (longer TTL, httpOnly cookie ONLY — fix `#A12`).
- Refresh token reuse detection → revoke entire family.
- JWT blacklist trong Redis cho immediate logout.
- RBAC 2 roles (`USER`, `ADMIN`) với guard rõ ràng — fix `#A14`.
- Password hashing bcrypt (10+ rounds), không bao giờ leak password hash trong response — fix `#A23`.

**Catalog (Customer-facing)**

- Browse PLP với filter (category, price range, rating min) + sort (price asc/desc, rating, newest) + pagination.
- Search products by name (substring, case-insensitive). Bỏ qua full-text search engine (defer).
- PDP (Product Details Page) với multi-image, description, stock status, reviews list, related products section.
- Cache-aside pattern (Redis): GET endpoints cho catalog đều cache với TTL + invalidation rule khi admin update.
- Cache key namespacing strategy có document.

**Reviews / Comments**

- Reviews **only by users who purchased the product** (verified-purchase enforced — stronger trust signal). Fix `#A10`.
- Admin delete review with audit log entry. Fix `#A11`.

**Cart & Checkout**

- Cart server-side (in DB, persisted per user) — không phải localStorage như legacy.
- Checkout flow: shipping address + delivery method (fast / economical) + payment method (PayPal / COD).
- Order creation **trong 1 ACID transaction**: trừ stock + tạo Order + tạo OrderItems atomically.
- PayPal flow:
  - Frontend tạo PayPal order qua `<PayPalButtons>`.
  - Backend nhận webhook từ PayPal, **verify signature** (sandbox webhook ID + transmission headers).
  - **Idempotent webhook handler** (dedup theo PayPal event ID) — fix `#A16`.
  - Chỉ mark `isPaid=true` sau khi server verify thành công, KHÔNG tin client claim.
- COD flow: order created với `isPaid=false`, admin manual mark delivered/paid sau khi giao hàng.
- Email confirmation **async** qua BullMQ — fix `#A17`. Failure retry với exponential backoff.

**Order Management (Customer)**

- "My Orders" list với status filter (pending / paid / delivered / cancelled).
- Order detail page (chỉ owner hoặc admin xem được — fix `#A9`).
- Cancel order (chỉ pending orders, restore stock atomically).

**Admin Module**

- Admin dashboard: KPI tiles (today orders, revenue, top products, low-stock alerts).
- CRUD: Users, Products, Categories, Orders, Comments — đầy đủ như legacy.
- Mark order delivered manually (replace cron `#A18`).
- Bulk delete (products, comments, users) với confirmation.
- Realtime "new orders" badge — **WebSocket** (`@nestjs/websockets` + Socket.IO adapter, FE Socket.IO client).

**Frontend craft (priority B + C)**

- App Router layout structure: `(public)`, `(auth)`, `(admin)` route groups.
- **UI library boundary**:
  - `(admin)` — shadcn/ui (rapid CRUD UI: Sheet, DataTable, Dialog, Form).
  - `(public)` — **vanilla Tailwind** custom components (showcase raw frontend craft cho recruiter), optional GSAP/Framer Motion cho animation (non-mandatory).
- RSC vs Client Component matrix có document trong README.
- Streaming + Suspense boundaries cho catalog (skeleton loading).
- ISR cho PDP (revalidate 60s).
- Image optimization (next/image với placeholder blur).
- Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1 trên catalog + PDP (đo trong CI với Lighthouse CI).
- TanStack Query cho mutation flows (cart add, review submit) với optimistic update + rollback.
- Server Actions cho admin form submits (form action, không phải fetch).
- Form: React Hook Form + Zod schema (validate cả client và shared schema với backend).
- Error boundaries per route group.

**Testing (portfolio-grade)**

- Unit: ≥70% coverage trên service layer (Auth, Catalog, Order, Payment services).
- Integration: testcontainers spin up real MySQL + Redis cho repository + service tests.
- E2E (Playwright) — 5-7 critical flows:
  1. Sign-up → sign-in → browse → add to cart → checkout COD → see order in My Orders.
  2. PayPal checkout sandbox → webhook → order confirmed.
  3. Admin mark order delivered → user sees status update.
  4. Cache invalidation: admin update product → PDP reflects new data.
  5. Refresh token rotation → reuse detection → forced logout.
  6. RBAC: non-admin cannot hit admin endpoints.
  7. Review verification: user without purchase blocked from posting review.
- CI gate: PR fail nếu coverage drop hoặc E2E fail.

**Observability**

- OpenTelemetry SDK trong NestJS, traces export sang Jaeger (local).
- Trace ID propagation qua request lifecycle.
- Pino structured logs (JSON) với correlation ID.
- README screenshot Jaeger UI cho 1-2 critical request flows (proof không decorative).

**CI**

- GitHub Actions: lint + typecheck + unit + integration + E2E + Docker build per PR.
- Branch protection: main require CI green.

### 3.2 Functional scope — OUT (high-level; Section 8 has full reasoning)

- Microservices, gRPC, Kafka, Saga, Outbox, dual-write, reconciliation cron — defer to "future work".
- CD / cloud deploy — defer until local stable.
- Multi-tenant — single tenant only.
- i18n — Vietnamese UI hardcoded, English error/log messages.
- Search engine (Elasticsearch / Meilisearch) — MySQL `LIKE` đủ cho seed scale.
- Recommendations engine — bỏ.
- Virtual try-on / AR — không có trong legacy, không add.
- Real-time chat / live support — bỏ.
- Mobile apps — web only.
- Social auth (Google / Facebook) — email/password only.
- 2FA — nice-to-have, defer.
- Multi-currency / multi-language pricing — VND only.
- Inventory adjustment workflow (returns, refunds) — chỉ cancel pending orders.
- Promotions / coupons — bỏ.
- Wishlist — bỏ.
- Product variants (color, size) — single variant per product.
- Product image upload UI (admin) — image URL field text, không upload UI. Image storage strategy defer.

### 3.3 Anomalies từ legacy phải fix (security baseline)

> Mỗi anomaly fixed = 1 commit message tham chiếu `#A<N>`. Recruiter scan commit history sẽ thấy security awareness.

| Anomaly                                | Severity       | Fix in scope                                    |
| -------------------------------------- | -------------- | ----------------------------------------------- |
| `#A1` Hard-coded Mongo URI             | Low (cosmetic) | Env-driven `DATABASE_URL`                       |
| `#A2` Port collision                   | Low            | Distinct ports per service                      |
| `#A3` Double PayPal SDK load           | Med            | Single provider, clean integration              |
| `#A4` Phone as Number                  | Med            | String + validation                             |
| `#A5` Product.type vs Category         | High           | FK proper relationship                          |
| `#A7` Open user PII endpoint           | **Critical**   | RBAC + projection (no password hash)            |
| `#A8` Open product create              | **Critical**   | Admin-only                                      |
| `#A9` Open order detail                | **Critical**   | Owner-or-admin guard                            |
| `#A10` Open comment create             | High           | Auth required + verified-purchase optional      |
| `#A11` Comment middleware bug          | High           | Proper factory invocation                       |
| `#A12` Refresh token leak              | **Critical**   | httpOnly cookie ONLY, không trong body          |
| `#A13` Tokens in localStorage          | High           | httpOnly cookies + access in memory             |
| `#A14` Auth middleware `===` bug       | **Critical**   | Proper assignment                               |
| `#A15` Hard-coded localhost in payment | Med            | Env-driven                                      |
| `#A16` No PayPal verification          | **Critical**   | Webhook signature verify + idempotency          |
| `#A17` Inline SMTP                     | High           | BullMQ async queue                              |
| `#A18` Auto-deliver cron               | High           | Removed; manual admin action                    |
| `#A19` updateUser falsy skip           | Med            | Explicit `null` vs `undefined` semantics        |
| `#A20` countInstock typo               | Low            | Single source of truth from API                 |
| `#A21` Trailing space env keys         | Low            | Clean env schema validation (Zod)               |
| `#A22` CORS wide open                  | High           | Explicit origin allowlist                       |
| `#A23` Full user doc exposure          | High           | DTO projection                                  |
| `#A24` No request validation           | High           | class-validator + Zod everywhere                |
| `#A25` Unbounded numeric fields        | Med            | Schema constraints (min/max, decimal precision) |
| `#A26` Image as arbitrary string       | Med            | URL only (validated); upload UI defer           |
| `#A27` Mixed UI libraries              | High           | shadcn/ui + Tailwind only                       |

24/27 fixed in scope. 3 deferred (`#A1`, `#A2`, `#A20` — cosmetic) but still cleaned by virtue of greenfield rewrite.

---

## 4. Migration Strategy & Sprint Plan

### 4.1 Strategy = Greenfield rewrite (NOT strangler fig)

> Decision logged: legacy không có production user, không có data thật. Strangler/dual-write/reconciliation overkill cho portfolio. Greenfield rewrite + seed data từ đầu là path nhanh nhất, sạch nhất, KHÔNG mất signal kỹ thuật.

**What this means**

- Repo `prodigy-glasses-remake/` is the new project. Legacy `Prodigy-glasses-MERN/` stays read-only as reference.
- Không có migration script Mongo → MySQL.
- Seed script tạo ≥30 products, ≥6 categories, vài dozen users, vài orders example.
- README link sang legacy repo + project-context để recruiter thấy "from → to" comparison.

### 4.2 Repository structure (proposed — final in Architecture phase)

```
prodigy-glasses-remake/
├── apps/
│   ├── api/              # NestJS backend (modular monolith)
│   └── web/              # NextJS frontend
├── packages/
│   ├── shared-types/     # TS types + Zod schemas shared FE↔BE
│   └── ui/               # shadcn/ui components (optional split)
├── docker/
│   ├── docker-compose.yml         # mysql, redis, jaeger, mailhog
│   └── docker-compose.test.yml    # test isolated stack
├── .github/workflows/
│   └── ci.yml            # lint, typecheck, unit, integration, e2e, build
├── docs/
│   ├── ADRs/             # architecture decision records
│   ├── architecture.md   # diagrams + component view
│   └── runbook.md        # local dev runbook
└── README.md             # portfolio-grade landing page
```

Workspace tool: **npm workspaces** (user preference, simpler dep tree for solo project).

### 4.3 Weekly milestones (5 tuần — 27-35 ngày solo full-time)

#### Tuần 1 — Foundation (5-7 ngày)

**Goal**: Stack chạy được local, CI green ở "hello world" level.

- [ ] Repo init: npm workspaces, ESLint + Prettier + commitlint + Husky.
- [ ] `apps/api` NestJS bootstrap: ConfigModule với Zod env schema, TypeOrmModule, RedisModule (ioredis), HealthModule.
- [ ] `apps/web` NextJS App Router init: Tailwind, shadcn/ui setup (admin only), base public layout, Tailwind theme tokens, optional Framer Motion install.
- [ ] `packages/shared-types`: bootstrap Zod schemas placeholder + TS types export.
- [ ] Docker Compose stack: MySQL 8, Redis 7, Jaeger all-in-one, Mailhog. Health endpoint passes against deps.
- [ ] TypeORM data source + first migration (empty tables).
- [ ] CI baseline: GitHub Actions workflow (`lint → typecheck → unit → build`). All green.
- [ ] README skeleton: title, badges, 60-second pitch, "Run locally" section.
- **Exit criteria**: `docker compose up` → both apps healthy + Jaeger UI shows trace of `/health` endpoint.

#### Tuần 2 — Auth + Catalog (6-7 ngày)

**Goal**: User can sign up/in, browse catalog with filters, cache hit observable.

- [ ] Entity: `User`, `Product`, `Category`. Migrations + seed factory.
- [ ] AuthModule: register, login, refresh, logout, me. JWT access + refresh rotation. Reuse detection. Redis blacklist. Cookie strategy httpOnly.
- [ ] RBAC: `RolesGuard` + decorator `@Roles('admin')`. Apply to admin endpoints.
- [ ] CatalogModule:
  - `ProductService.findAll(filter)` with filters (category, price range, rating, search) + sort + pagination.
  - `ProductService.findOne(id)` with cache-aside (Redis TTL 60s).
  - `CategoryService.list()` cached aggressively.
  - Cache invalidation on create/update/delete.
- [ ] Seed script: ≥30 products, ≥6 categories, real-looking data.
- [ ] Frontend:
  - `(public)/products/page.tsx` PLP — RSC, fetch via API, filter UI as Client Components inside.
  - `(public)/products/[id]/page.tsx` PDP — RSC + ISR `revalidate=60`.
  - `(auth)/sign-in`, `(auth)/sign-up` — Server Actions + RHF + Zod.
- [ ] E2E test #1: sign-up → sign-in → browse PLP → open PDP. Green.
- **Exit criteria**: Catalog page render < 2s LCP local, cache hit measurable in Jaeger trace.

#### Tuần 3 — Cart, Order, Payment (6-7 ngày)

**Goal**: End-to-end purchase flow works (COD + PayPal sandbox).

- [ ] Entity: `Order`, `OrderItem`, `CartItem`. Migrations.
- [ ] CartModule: add/remove/update quantity. Server-side persisted.
- [ ] OrderModule: create order in single transaction (stock check + decrement + order + items). Cancel order with stock restore.
- [ ] PaymentModule:
  - PayPal create-order endpoint.
  - Webhook endpoint with signature verification (PayPal sandbox).
  - Idempotency table `processed_webhook_events` (PayPal event ID PK).
  - On successful capture → mark order paid → enqueue `order.confirmed` job.
- [ ] NotificationModule:
  - BullMQ queue `email-confirm`.
  - Worker consumer with Nodemailer + Mailhog (local).
  - Retry policy: 3 attempts, exponential backoff.
- [ ] Frontend:
  - `(public)/cart/page.tsx` — Client component, TanStack Query mutations with optimistic update.
  - `(public)/checkout/page.tsx` — RHF + Zod form, PayPalButtons, COD radio.
  - `(public)/orders/page.tsx` + `[id]/page.tsx` — RSC.
- [ ] E2E test #2-3: COD checkout flow + PayPal sandbox flow.
- [ ] E2E test #4: Idempotency — replay same webhook, second attempt no-op.
- **Exit criteria**: PayPal sandbox capture verified server-side, email visible in Mailhog UI within 5s of order.

#### Tuần 4 — Frontend depth + Admin module (6-7 ngày)

**Goal**: Frontend craft signals visible (RSC discipline, performance, state). Admin functional.

- [ ] App Router structure: `(admin)` route group with admin layout + auth guard.
- [ ] Admin pages: Dashboard, Users, Products, Categories, Orders, Comments. Each with table + drawer/modal CRUD.
- [ ] Admin uses Server Actions for mutations (form action), Server Component tables, Client Components only for filters/forms.
- [ ] Realtime "new orders" via **WebSocket** gateway (`/admin/orders` namespace) — Socket.IO server in NestJS, Socket.IO client in admin layout.
- [ ] Frontend depth deep dive:
  - RSC/Client matrix document in `docs/architecture.md` (which page, why which type).
  - Suspense + skeleton for PLP, PDP, Order list.
  - Streaming on PLP (filter sidebar streams independently).
  - next/image với placeholder blur cho all product images.
  - Dynamic `loading.tsx`, `error.tsx`, `not-found.tsx` per route.
  - Web Vitals reporter to console (and dashboard if time).
- [ ] Optimistic updates: cart add/remove, review submit, admin mark delivered.
- [ ] Form: React Hook Form + Zod resolvers, schema shared with backend via `packages/shared-types`.
- [ ] E2E test #5-7: Cache invalidation, RBAC bypass attempt, review verification.
- **Exit criteria**: Lighthouse score ≥90 on PLP + PDP, all 7 E2E flows green.

#### Tuần 5 — Tests, observability, docs, polish (5-7 ngày)

**Goal**: Portfolio-grade artifact. README is the front door.

- [ ] Unit tests: push coverage ≥70% on services. Mock Redis/DB only at boundary.
- [ ] Integration tests: testcontainers MySQL + Redis. Cover repository + service interaction. Idempotency, transaction rollback, cache invalidation explicit tests.
- [ ] OpenTelemetry instrumentation: HTTP + TypeORM + Redis + BullMQ. Verify traces in Jaeger.
- [ ] Pino structured logs với request ID correlation.
- [ ] CI: add E2E job, coverage report comment on PR. All green on main.
- [ ] Animated GIFs (3-4): catalog browse + filter, checkout PayPal, admin order management, refresh token rotation diagram.
- [ ] Architecture diagrams in `docs/architecture.md`: high-level component view, data model ERD, request flow diagrams (PayPal webhook, cache-aside).
- [ ] ADRs: at least 6 — decision: modular monolith over microservices, cache-aside choice, JWT rotation strategy, webhook idempotency design, RSC component matrix, single-DB transaction over Saga.
- [ ] README portfolio-grade:
  - 60-second pitch.
  - Stack badges.
  - "Run locally in <5 min" with seed credentials.
  - Architecture diagram inline.
  - Anomalies fixed table (showcase awareness).
  - Animated GIF demos.
  - Test/coverage badges.
  - Future work section (Saga, microservices, CD, search, recommendations).
- [ ] Final pass: `bmad-code-review` + `bmad-review-edge-case-hunter` (in implementation phase).
- **Exit criteria**: External developer clones repo, runs `docker compose up`, sees full demo within 5 minutes. README reads like a senior engineer wrote it.

### 4.4 Daily cadence (suggested)

- **Morning**: 1 BMad story creation in fresh context window (`bmad-create-story` for the next sprint task).
- **Implementation block**: dev-story (Superpowers TDD ratchet active in IDE).
- **End of day**: commit with anomaly tags if applicable, update sprint status.
- **Weekly Friday**: `bmad-retrospective` lite — 30 min review, adjust next week's plan.

---

## 5. Success Metrics

> Metrics chia 2 nhóm: **Portfolio metrics** (recruiter sẽ đánh giá) và **Technical metrics** (build quality bar). Không có **business metrics** (no real users).

### 5.1 Portfolio metrics — recruiter-facing

| Metric                             | Target                                                           | Tại sao quan trọng                             |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| README "Run locally" → demo flow   | **<5 phút** từ clone đến browse PLP                              | Friction càng thấp, recruiter càng dễ thử thật |
| Animated GIF demos trong README    | **3-4 GIFs** (catalog, checkout PayPal, admin, refresh rotation) | Bù cho việc không có live URL                  |
| Architecture diagram chất lượng    | **≥3 diagrams** (component, data flow, sequence cho PayPal)      | Show tư duy hệ thống                           |
| ADR count                          | **≥6 ADRs** trong `docs/ADRs/`                                   | Show decision discipline                       |
| Anomalies fixed table trong README | **24 anomalies** với commit links                                | Show security awareness                        |
| Commit history quality             | **Conventional commits**, mỗi commit nhỏ và meaningful           | Senior reviewer scan commit history rất nhanh  |
| Code coverage badge                | **≥70%** trên service layer, displayed                           | Test discipline signal                         |

### 5.2 Technical quality bar — build metrics

| Metric                                           | Target                                              | Cách đo                              |
| ------------------------------------------------ | --------------------------------------------------- | ------------------------------------ |
| Lighthouse Performance (PLP, PDP)                | **≥90**                                             | Lighthouse CI in PR check            |
| LCP                                              | **<2.5s** local                                     | Web Vitals reporter                  |
| INP                                              | **<200ms** local                                    | Web Vitals reporter                  |
| CLS                                              | **<0.1** local                                      | Web Vitals reporter                  |
| Cache hit rate (catalog reads) trong dev session | **≥80%** sau warmup                                 | Custom metric in `/metrics` endpoint |
| Test coverage (service layer)                    | **≥70%**                                            | Jest coverage report                 |
| E2E flows passing                                | **7/7 green**                                       | Playwright in CI                     |
| Webhook idempotency replay test                  | **PASS** (second replay no-op)                      | Integration test                     |
| Token rotation reuse detection                   | **PASS** (replayed refresh → entire family revoked) | Integration test                     |
| RBAC bypass attempt                              | **PASS** (non-admin → 403 on all admin routes)      | Integration test                     |
| TypeScript strict mode                           | **enabled, 0 `any` in service layer**               | tsconfig + lint rule                 |
| Lint errors                                      | **0**                                               | ESLint --max-warnings 0              |
| Bundle size (frontend)                           | **<250 KB initial JS gzipped** for PLP              | Next bundle analyzer                 |

### 5.3 Exit gate — "portfolio ready" definition

Project tuyên bố hoàn thành khi:

1. ✅ Tất cả 7 E2E flows green trong CI.
2. ✅ Coverage ≥70% trên service layer.
3. ✅ Lighthouse ≥90 trên PLP + PDP.
4. ✅ All 24 anomalies in scope fixed (commit linked).
5. ✅ ≥6 ADRs published.
6. ✅ README có đủ: pitch, badges, run locally, architecture diagram, anomalies table, GIFs, future work.
7. ✅ External developer test: clone → docker compose up → browse to PLP < 5 phút.
8. ✅ `bmad-code-review` + `bmad-review-edge-case-hunter` clean (or known issues documented).

---

## 6. Constraints & Non-negotiables

### 6.1 Hard constraints (không deviate được)

- **Solo dev**: 1 người làm hết, không có review buddy. → Implication: BMad code-review skill làm proxy senior reviewer; commit thường xuyên để tự audit.
- **Local-only deployment** trong scope: không CI/CD deploy, không cloud. App phải chạy 100% qua `docker compose up`.
- **No real users / data**: cấm pretend có user thật trong README, marketing language. Honest portfolio framing.
- **Stack đã khóa**: NestJS, TypeORM, MySQL, Redis, BullMQ, NextJS App Router, Tailwind, shadcn (admin), TanStack Query, Zustand, RHF+Zod, Jest, Testcontainers, Playwright. Không swap giữa chừng — nếu vấn đề kỹ thuật xuất hiện, dùng `bmad-correct-course`.
- **Greenfield rewrite, NOT strangler**: không có migration script Mongo→MySQL. Seed data only.
- **Vietnamese documentation language** trong giao tiếp, **English** cho code/comments/log/error messages/commit messages.

### 6.2 Soft constraints (có thể flex nếu lý do mạnh)

- 5-week timeline — flex đến 6-7 tuần nếu cần (đã honest về estimate).
- 7 E2E flows — có thể giảm xuống 5 nếu testing burden lớn quá; phải document lý do trong retrospective.
- shadcn boundary cho admin — nếu thấy cần dùng vài atom của shadcn ở public (Button, Input), được phép, miễn không phá design coherence.

### 6.3 Quality non-negotiables

- **TDD discipline** trên service layer (Superpowers ratchet active during dev).
- **No `any` in service layer** — strict types.
- **No `console.log` in production code** — Pino logger only.
- **No commented-out code** in commits (legacy có rất nhiều — drop sạch).
- **Conventional commits** + commitlint enforcing.
- **Every PR has CI green** before self-merge.

### 6.4 Tooling non-negotiables

- TypeScript strict.
- ESLint + Prettier with auto-format hook.
- Husky pre-commit (lint + typecheck staged) + commit-msg (commitlint).
- BMad workflow (every story in fresh context window).

---

## 7. Risks & Open Questions

### 7.1 Top risks

| Risk                                                                                                         | Impact                 | Likelihood                 | Mitigation                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Scope creep** — solo dev tự thêm features (e.g., wishlist, dark mode, i18n)                                | High delay             | High                       | Section 8 explicit non-goals; weekly retrospective; `bmad-correct-course` if needed            |
| **Frontend craft over-investment** — perfectionist trên animations, design polish                            | Late delivery          | High (frontend-focus user) | Timebox tuần 4; "good enough is good enough"; recruiter values function over pixel-perfect     |
| **PayPal sandbox quirks** — webhook delivery delays, signature verification edge cases                       | Block week 3           | Medium                     | Mock webhook locally first, then sandbox; idempotency table covers replay                      |
| **Testcontainers slowness on macOS** — long integration test runs                                            | CI fatigue             | Medium                     | Cache layer, run integration parallel, downsample if needed                                    |
| **NextJS App Router gotchas** — hydration mismatch, Server Actions caveats, RSC fetch revalidation surprises | Multiple debug rabbits | Medium                     | Stick to documented patterns; ADR each non-obvious choice                                      |
| **Solo motivation drop** — week 4-5 fatigue when novelty fades                                               | Project incomplete     | Medium                     | Weekly retrospective forces ship-or-cut; commit daily even when small                          |
| **OpenTelemetry config complexity**                                                                          | Time sink              | Medium                     | Use NestJS official OTel setup, defer custom spans to last day                                 |
| **WebSocket auth + admin UI integration**                                                                    | Block week 4           | Low-Medium                 | Reuse JWT in handshake (`@nestjs/websockets` standard pattern); fallback to polling if blocker |
| **Verified-purchase review logic edge cases** (cancel order, refund)                                         | Logic bug              | Low                        | Explicit tests; product canceled → cannot review                                               |
| **Cache invalidation bugs** — stale catalog after admin update                                               | Recruiter eye          | Low                        | Explicit invalidation test + ADR                                                               |

### 7.2 Open questions resolved during discovery (closed)

✅ Stack target — locked.
✅ Microservices vs monolith — monolith.
✅ Strangler vs greenfield — greenfield.
✅ PayPal preserve — yes (sandbox).
✅ `Product.type` vs `Category` — FK relationship (consolidate).
✅ COD manual — yes.
✅ Reviews verified-purchase — yes.
✅ Image storage — URL-only, upload UI defer.
✅ Authn — in-house JWT.
✅ Multi-tenant — no.
✅ CI/CD — CI only, CD defer.
✅ UI library — shadcn admin / vanilla Tailwind public.
✅ Realtime channel — WebSocket.
✅ Workspace tool — npm.

### 7.3 Open questions deferred to Architecture phase

- Exact Redis cache key namespace strategy (e.g., `catalog:product:{id}` vs `catalog:product:{id}:v{version}`).
- TypeORM migration vs synchronize for dev (recommend migration always, even dev).
- Refresh token storage: cookie path scope (`/api/auth/refresh` only vs `/`).
- WebSocket auth handshake: query token vs cookie vs first message.
- Logging level config per environment.
- Lighthouse CI config thresholds — exact numbers per route.
- Bundle splitting strategy for admin code (separate chunk).
- Image source for seed: free stock images vs AI-generated vs unsplash API.

→ Tất cả sẽ được resolve trong `bmad-create-architecture` (Phase 3).

---

## 8. Out-of-scope (explicit non-goals)

> Documented to prevent scope creep AND to show recruiter awareness — "I know these exist, I chose not to do them, here's why."

### 8.1 Architecture-level non-goals

| Non-goal                             | Lý do skip                                                      | Future work?                                   |
| ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------- |
| Microservices (4 services + gateway) | Solo, 5 tuần, signal cargo-cult                                 | Yes — extension document mention               |
| gRPC inter-service                   | No services to communicate between                              | Yes — if microservices added                   |
| Kafka / RabbitMQ                     | BullMQ on Redis is sufficient for queue scope                   | Yes — if event-sourcing or CDC needed          |
| Saga / Outbox pattern                | Single DB, single ACID transaction handles checkout             | Yes — natural extension if going microservices |
| Database-per-service                 | Single MySQL is enough; monolith pattern                        | Linked to microservices future work            |
| Circuit breaker                      | No external service to wrap (PayPal alone, single failure mode) | Optional                                       |
| Strangler Fig migration              | No live legacy production system                                | N/A — greenfield                               |
| Dual-write / reconciliation          | No live data to migrate                                         | N/A                                            |

### 8.2 Operational non-goals

| Non-goal                                       | Lý do skip                    | Future work?                         |
| ---------------------------------------------- | ----------------------------- | ------------------------------------ |
| CD to cloud (Railway / Fly / AWS)              | Local-first per user decision | Yes — explicitly mentioned in README |
| Production secret management (Doppler / Vault) | No production environment     | Yes — pairs with CD                  |
| Multi-environment (staging + prod)             | Local-only                    | Yes — pairs with CD                  |
| Horizontal scaling / load balancer             | No traffic                    | Yes                                  |
| Backup / DR                                    | No production data            | Yes                                  |
| Monitoring alerts (PagerDuty etc.)             | Local only                    | Yes                                  |

### 8.3 Product-level non-goals

| Non-goal                                    | Lý do skip                                                           | Future work?                       |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| i18n / multi-language UI                    | Vietnamese-only acceptable for portfolio                             | Optional polish                    |
| Multi-currency                              | VND only                                                             | Optional                           |
| Search engine (Elasticsearch / Meilisearch) | MySQL `LIKE` enough for ~30 products                                 | Yes — if catalog scales            |
| Recommendations engine                      | Out of scope value/time ratio                                        | Optional ML showcase               |
| Wishlist / favorites                        | Adds entity + endpoints, not differentiating                         | Optional                           |
| Promotions / coupons                        | Requires pricing engine refactor                                     | Optional                           |
| Product variants (size, color)              | Single variant = simpler ERD; portfolio focus on cache/payment depth | Yes — if e-commerce focus deeper   |
| Image upload UI (admin)                     | URL-only field; image storage strategy is its own depth area         | Yes — pairs with S3/Cloudinary     |
| Returns / refunds workflow                  | Adds Saga-shaped complexity                                          | Yes — natural Saga showcase target |
| Social auth (Google / Facebook)             | Email-password covers Auth depth                                     | Yes — quick win                    |
| 2FA / TOTP                                  | Not core to portfolio narrative                                      | Yes — quick security depth         |
| Mobile apps                                 | Web only                                                             | No (different skillset)            |
| Real-time chat / live support               | Scope creep                                                          | No                                 |
| Virtual try-on / AR                         | Out of skill area                                                    | No                                 |
| SEO blog / content marketing                | Not relevant to e-commerce showcase                                  | No                                 |

### 8.4 Frontend-specific non-goals

| Non-goal                                     | Lý do skip                                                       |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Dark mode                                    | Polish-only, not core depth signal                               |
| PWA / offline                                | Not aligned with e-commerce UX expectations                      |
| Pixel-perfect Figma replication              | No designer; functional craft is the signal                      |
| Comprehensive accessibility audit (WCAG AAA) | WCAG AA-ish baseline OK; full audit needs assistive tech testing |
| Animation library (Lottie, anime.js)         | Optional GSAP/Framer is the cap                                  |
| RTL support                                  | Vietnamese is LTR                                                |

---

## 9. Future Work (post-portfolio extension roadmap)

> README sẽ link section này. Show recruiter: "I know what comes next." Không claim implementation; chỉ awareness.

1. **CD to staging+prod** (Railway hoặc Fly.io) → cộng "live URL" link vào README.
2. **Microservices extraction**: Auth Service tách ra trước (boundary rõ nhất), gRPC contract, distributed tracing across services.
3. **Saga pattern** cho checkout → khi tách Order/Payment thành services riêng, refactor sang orchestration Saga với compensation.
4. **Outbox + Kafka**: replace BullMQ khi cần event-sourcing hoặc CDC sang downstream services.
5. **Returns / refunds workflow** — natural Saga showcase target.
6. **Search engine**: Meilisearch hoặc Elastic khi catalog > 1000 products.
7. **Image upload pipeline**: S3 + presigned URL + Cloudinary transform.
8. **Multi-tenant**: tenant column hoặc database-per-tenant.
9. **Recommendation engine** (collaborative filtering hoặc product embedding).
10. **Mobile (React Native / Expo)**.

---

## 10. References

- Legacy snapshot: `documents/knowledge/project-context.md` (27 anomalies, 5 Mongoose schemas, 25 endpoints).
- Original draft: `migration-draft-plan.md` (compressed microservices plan, superseded by this brief).
- BMad roadmap: `documents/planning-artifacts/migration-master-plan.md` (5-phase BMad workflow).
- Decision log: `.decision-log.md` (canonical memory of all decisions during Discovery).
