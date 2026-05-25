# Migration Master Plan — Prodigy Glasses (MERN → NestJS Microservices + MySQL + NextJS Atomic)

> Project: `prodigy-glasses-remake` · Owner: Jarvis · Mode: Brownfield strangler-fig migration
> Source repo: `Prodigy-glasses-MERN/` (Express + Mongoose + React/Vite + Redux + PayPal + Nodemailer)
> Target repo: `prodigy-glasses-remake/` (NestJS microservices, gRPC, MySQL/TypeORM, Redis, Kafka/RabbitMQ, NextJS App Router with Atomic Design)
> Frameworks: **BMAD-METHOD** (planning + story execution) + **Superpowers** (TDD ratchet & forensic debugging during DS)
> Status: 📍 Phase 0 — Brownfield Discovery (kicking off `bmad-generate-project-context`)

---

## 1. Mục đích & Phạm vi (lấp lỗ hổng #2 — thiếu Brief/PRD)

Bản plan này **không thay thế** Product Brief / PRD chính thức. Nó là _kế hoạch tổng_ để track tiến độ migration và buộc bản nháp `migration-draft-plan.md` đi qua các BMad gates.

### 1.1 Goals

- Giữ **functional parity 100%** với hệ MERN cũ (auth, catalog, cart, order, PayPal webhook, email, admin dashboard).
- Đạt **non-functional uplift**: p95 < 200ms cho read endpoints, sustained 5,000 RPS trên PDP, error budget 0.1%, RTO ≤ 15min, RPO ≤ 5min.
- Chuyển kiến trúc dữ liệu **Mongoose → TypeORM/MySQL** với khóa ngoại và migration versioning.
- Chuyển UI **CRA/Vite + Redux → NextJS App Router + RSC + Atomic Design** với SEO-first cho catalog.

### 1.2 Non-goals (cần xác nhận trong PRD)

- Đổi domain nghiệp vụ (vẫn là e-commerce kính mắt).
- Thay payment provider (vẫn PayPal trong MVP, tách interface để swap sau).
- Triển khai recommendation engine / search nâng cao (Elasticsearch để Phase 2 sau MVP).

### 1.3 Migration strategy

**Strangler Fig** thay vì big-bang. Lý do:

- Hệ cũ còn chạy production → cần co-existence period.
- Saga + Outbox phức tạp, big-bang dễ mất dữ liệu order.

Cut-over per-domain theo thứ tự: Auth → Catalog (read) → Cart → Checkout/Payment → Admin. Mỗi domain có **dual-write window** + **shadow-read verification** trước khi tắt path cũ.

### 1.4 Success criteria & exit gates

- ✅ Tất cả P1 user journeys pass E2E trên hệ mới (TEA traceability matrix `=PASS`).
- ✅ Saga payment idempotent qua chaos test (RabbitMQ down, MySQL connection drop, PayPal webhook duplicate).
- ✅ k6 load test 5,000 RPS giữ p95 < 200ms với cache hit rate ≥ 90%.
- ✅ NFR audit (`bmad-testarch-nfr`) verdict `PASS` cho perf/security/reliability/scalability.
- ✅ Zero data loss khi đối chiếu Mongo → MySQL bằng reconciliation script.

---

## 2. Lỗ hổng từ draft & Cách BMad lấp (lấp lỗ hổng #1, #3, #4, #5, #6)

| #   | Lỗ hổng trong `migration-draft-plan.md`                                                              | Skill BMad / Superpowers lấp                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Thiếu grounding từ codebase cũ — ERD/route/middleware/webhook flow chưa map ngược                    | `bmad-generate-project-context` (Phase 0) → `bmad-document-project` (deep dive nếu GPC chưa đủ)          |
| 2   | Chưa có scope/success metrics/cut-over/rollback chính thức                                           | `bmad-product-brief` → `bmad-prd` (gate required)                                                        |
| 3   | ERD MySQL, gRPC `.proto`, Kafka topic schema, Saga state machine, Redis key namespace chưa formalize | `bmad-create-architecture` (gate required) — output single source of truth ADR + ERD + contracts         |
| 4   | Test strategy đứng riêng, không ưu tiên P1 risk (Saga, idempotency, cache coherence, webhook PayPal) | `bmad-testarch-test-design` chạy **trước** `bmad-testarch-framework` để framework scaffold theo risk map |
| 5   | Sprint 1/2/3 mới ở mức "trục", chưa break thành stories với AC                                       | `bmad-create-epics-and-stories` → `bmad-create-story` cho từng story trong cycle                         |
| 6   | Vai trò Superpowers vs BMad chưa phân định                                                           | Phân vai chính thức trong §6                                                                             |
| 7   | Thiếu observability, rollback, data-reconciliation plan                                              | Bổ sung trong §3.D & §5                                                                                  |
| 8   | Thiếu security baseline (secrets, rotation, CSRF cho webhook, JWT key rotation)                      | Đưa vào PRD NFR + Architecture security view                                                             |
| 9   | Saga vs Outbox chưa quyết định                                                                       | `bmad-technical-research` ra quyết định, ghi vào ADR                                                     |
| 10  | NextJS Atomic mapping mới ở mô tả, chưa có inventory component cũ                                    | `bmad-create-ux-design` build component matrix từ output GPC                                             |

---

## 3. Kiến trúc target (snapshot — sẽ được chuẩn hóa trong CA)

### A. Backend topology

```
┌──────────────────────────────────────────────────────────────────┐
│                   API Gateway (NestJS + Helmet + Throttler)      │
│            ↘ JWT verify · Rate-limit (Redis) · CORS              │
└────┬───────────┬────────────┬──────────────┬────────────────────┘
     │ gRPC      │ gRPC       │ gRPC         │ gRPC
┌────▼────┐ ┌────▼─────┐ ┌────▼──────┐ ┌─────▼─────────┐
│  Auth   │ │ Product  │ │  Order &  │ │ Notification  │
│ Service │ │ Service  │ │  Payment  │ │  Service      │
│ MySQL   │ │ MySQL    │ │  MySQL    │ │ (consumer)    │
│ Redis   │ │ Redis    │ │  Outbox   │ │ Nodemailer    │
└─────────┘ └──────────┘ └─────┬─────┘ └────▲──────────┘
                                │ Kafka/Rabbit MQ events │
                                └────────────────────────┘
```

Pattern stack:

- **Database-per-service** (no cross-service joins).
- **Transactional Outbox** trong Order Service → Kafka/RabbitMQ → consumers (Notification, Inventory adjuster). Quyết định Kafka vs RabbitMQ trong `bmad-technical-research`.
- **Saga (orchestration)** cho checkout flow: ReserveStock → CreatePayment → CapturePayment → ConfirmOrder → ReleaseOrFail compensations.
- **Idempotency Key** trên webhook PayPal + endpoint POST /orders.
- **Cache-Aside Redis** wrap repository layer cho Product/Catalog. TTL + write-through invalidation khi admin update.
- **Circuit Breaker** (Opossum hoặc NestJS interceptor) cho gRPC call và external PayPal.

### B. Frontend topology (Atomic Design)

- `app/` (App Router) là Pages.
- Templates ↔ `app/(group)/layout.tsx`.
- Organisms = feature blocks (Header, ProductDetails, CheckoutForm) — Server Component khi có thể, Client Component khi cần state/interactivity.
- Molecules = composed primitives (InputField, ProductCard preview).
- Atoms = pure primitives (Button, Badge, Icon, Input).
- State: TanStack Query (server state) + Zustand (client state). Drop Redux trừ phi Brief đòi giữ.

### C. Cross-cutting infra

- **Docker Compose** local: MySQL × N (per service), Redis, Kafka/RMQ, Jaeger, Prometheus + Grafana, Mailhog.
- **CI**: GitHub Actions với jobs lint/typecheck/unit/integration/e2e/k6-smoke (do `bmad-testarch-ci` scaffold).
- **Observability**: OpenTelemetry → Jaeger (trace), Prometheus (metric), Pino → Loki (log). Trace ID correlated qua gRPC metadata.
- **Secrets**: Doppler hoặc AWS Secrets Manager (quyết định trong PRD NFR).

### D. Rollback & data reconciliation (lỗ hổng #7)

- Mỗi cut-over có **feature flag** ở API Gateway routing tới legacy hay new.
- **Reconciliation job** (cron nightly trong dual-write window): so sánh count + checksums giữa Mongo và MySQL theo bảng. Báo discrepancy > 0.01%.
- **Rollback plan**: gateway flag flip back → legacy. Outbox events ghi `rollback=true` để consumer skip.

---

## 4. Lộ trình BMad — 5 giai đoạn

### Phase 0 — Brownfield Discovery (anytime)

| #   | Skill                                                                                                               | Output                                          | Owner | Status       |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----- | ------------ |
| 0.1 | `bmad-generate-project-context`                                                                                     | `documents/knowledge/project-context.md`        | AI    | 🟡 đang chạy |
| 0.2 | `bmad-document-project` (chỉ chạy nếu GPC chưa đủ chi tiết cho Saga/Webhook flow)                                   | `documents/knowledge/project-deep-dive.md`      | AI    | ⏸️           |
| 0.3 | `bmad-technical-research` (Saga vs Outbox, Kafka vs RabbitMQ vs NATS, gRPC vs REST internal, JWT rotation strategy) | `documents/planning-artifacts/tech-research.md` | AI    | ⏸️           |

### Phase 1 — Analysis (1-analysis)

| #   | Skill                | Output                                          | Status |
| --- | -------------------- | ----------------------------------------------- | ------ |
| 1.1 | `bmad-product-brief` | `documents/planning-artifacts/product-brief.md` | ⏸️     |

### Phase 2 — Planning (2-planning) [REQUIRED]

| #   | Skill                   | Output                                                                   | Status      |
| --- | ----------------------- | ------------------------------------------------------------------------ | ----------- |
| 2.1 | `bmad-prd` (create)     | `documents/planning-artifacts/prd.md`                                    | ⏸️ required |
| 2.2 | `bmad-create-ux-design` | `documents/planning-artifacts/ux-design.md` + Atomic component inventory | ⏸️          |
| 2.3 | `bmad-prd` (validate)   | `documents/planning-artifacts/prd-validation.html`                       | ⏸️          |

### Phase 3 — Solutioning (3-solutioning) [REQUIRED]

| #   | Skill                                 | Output                                                                                    | Status           |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| 3.1 | `bmad-create-architecture`            | ADRs, ERD per service, gRPC `.proto`, Kafka schemas, Saga state machine, Redis key map    | ⏸️ required      |
| 3.2 | `bmad-testarch-test-design`           | `documents/test-artifacts/test-design/test-design.md` (risk-based, P1=Saga/Webhook/Cache) | ⏸️               |
| 3.3 | `bmad-testarch-framework`             | Jest+Supertest+Playwright+k6 scaffold                                                     | ⏸️               |
| 3.4 | `bmad-testarch-ci`                    | `.github/workflows/*.yml`                                                                 | ⏸️               |
| 3.5 | `bmad-create-epics-and-stories`       | `documents/planning-artifacts/epics/*`                                                    | ⏸️ required      |
| 3.6 | `bmad-check-implementation-readiness` | readiness report                                                                          | ⏸️ required gate |

### Phase 4 — Implementation (4-implementation)

| #   | Skill                                                                                                                                              | Output                           | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| 4.0 | `bmad-sprint-planning`                                                                                                                             | sprint status                    | ⏸️ required |
| 4.1 | Story cycle: `bmad-create-story` → `bmad-create-story:validate` → `bmad-testarch-atdd` → `bmad-dev-story` (+ Superpowers TDD) → `bmad-code-review` | implementation + tests per story | ⏸️ loop     |
| 4.2 | `bmad-testarch-automate` → `bmad-testarch-test-review` → `bmad-testarch-trace` → `bmad-testarch-nfr`                                               | per epic                         | ⏸️          |
| 4.3 | `bmad-retrospective`                                                                                                                               | retro per epic                   | ⏸️          |
| 4.4 | `bmad-investigate` (forensic) + Superpowers Debugging                                                                                              | khi gặp bug khó                  | on-demand   |
| 4.5 | `bmad-correct-course`                                                                                                                              | khi scope shift                  | on-demand   |

---

## 5. Sprint backlog draft (chờ `bmad-create-epics-and-stories` chuẩn hóa)

### Epic 0 — Foundation (parallel với Sprint 1)

- E0-S1: Monorepo scaffold (pnpm workspace + Nx hoặc Turborepo) — quyết định ở CA.
- E0-S2: Docker Compose stack (MySQL × N, Redis, Kafka/RMQ, Jaeger, Mailhog).
- E0-S3: GitHub Actions CI baseline (lint, typecheck, unit).
- E0-S4: Shared libs (`@app/contracts` proto, `@app/common` filters/interceptors, `@app/observability`).

### Epic 1 — Identity & Gateway (Sprint 1)

- E1-S1: API Gateway + Helmet + Throttler (Redis-backed).
- E1-S2: Auth Service — User entity, register, login, JWT access+refresh.
- E1-S3: Token blacklist (Redis), logout, refresh rotation.
- E1-S4: RBAC (admin/user) + guard.
- E1-S5: Migration script: User Mongo → MySQL (reconciliation included).

### Epic 2 — Catalog & Cache (Sprint 2)

- E2-S1: Product + Category entities + relations + migrations.
- E2-S2: Admin CRUD endpoints.
- E2-S3: Public read endpoints với cache-aside Redis (TTL + invalidation).
- E2-S4: NextJS RSC pages (PLP, PDP) + Atomic components.
- E2-S5: Migration script: Product/Category Mongo → MySQL.

### Epic 3 — Cart + Checkout + Payment Saga (Sprint 3)

- E3-S1: Order + OrderItem entities + Outbox table.
- E3-S2: Cart endpoints (server-side cart in Order Service, ephemeral).
- E3-S3: Saga orchestrator: ReserveStock → CreatePayment → CapturePayment → ConfirmOrder + compensations.
- E3-S4: PayPal webhook idempotent handler (replay-safe, signature verify).
- E3-S5: Notification consumer (email + future SMS).
- E3-S6: Migration script: Order Mongo → MySQL.

### Epic 4 — Cut-over & Hardening (Sprint 4)

- E4-S1: Feature flag routing (gateway → legacy/new).
- E4-S2: Reconciliation cron + alerting.
- E4-S3: k6 load test 5,000 RPS.
- E4-S4: Chaos test (RMQ kill, MySQL drop connection, PayPal duplicate webhook).
- E4-S5: NFR audit + production rollout runbook.

---

## 6. Phân vai BMAD-METHOD vs Superpowers (lấp lỗ hổng #6)

| Workflow point                                                 | BMAD-METHOD                                       | Superpowers (Cursor/Claude Code)                                                        |
| -------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Discovery → Planning → Architecture                            | ✅ Chính (skills bmad-\*)                         | ❌                                                                                      |
| Test design + framework + CI                                   | ✅ Chính (TEA)                                    | ❌                                                                                      |
| Story creation + AC + sprint plan                              | ✅ Chính                                          | ❌                                                                                      |
| **ATDD red-phase tests**                                       | ✅ `bmad-testarch-atdd` viết acceptance scaffolds | ❌                                                                                      |
| **Implementation TDD ratchet (unit-level Red→Green→Refactor)** | ✅ `bmad-dev-story` enforce flow                  | ✅ Superpowers ép discipline trong IDE: không cho phép viết logic trước test failing    |
| Forensic debugging (memory leak, slow query, race)             | ✅ `bmad-investigate` (case file)                 | ✅ Superpowers Debugging skill (4-phase: reproduce → hypothesize → instrument → verify) |
| Code review                                                    | ✅ `bmad-code-review` (adversarial + edge-case)   | ❌                                                                                      |
| NFR audit + traceability                                       | ✅ TEA `nfr` + `trace`                            | ❌                                                                                      |

**Quy tắc**: Mỗi fresh context window = 1 BMad skill. Khi `bmad-dev-story` mở IDE để code, Superpowers active _trong_ session đó như enforcement layer, không phải skill riêng biệt.

---

## 7. Risks & Open questions (vào PRD/Brief để chốt)

| Risk                                                            | Impact | Mitigation owner                                    |
| --------------------------------------------------------------- | ------ | --------------------------------------------------- |
| Saga rollback partial state (stock reserved nhưng payment fail) | High   | Architecture (compensation design) + chaos test     |
| PayPal webhook delivery duplicate / out-of-order                | High   | Idempotency key + outbox dedupe                     |
| MySQL connection pool exhaustion dưới 5k RPS                    | Medium | Cache-aside hit ratio target ≥ 90% + read replica   |
| NextJS RSC bundle size phồng                                    | Medium | Atomic Design discipline + bundle analyzer trong CI |
| Migration data drift trong dual-write                           | High   | Reconciliation cron + alert threshold               |
| Team chưa quen TypeORM                                          | Medium | Pair với Superpowers TDD ratchet                    |

**Open questions** (PRD phải trả lời):

- Multi-tenant hay single-tenant?
- i18n trong MVP hay defer?
- Search engine (MySQL FTS đủ hay cần Elastic)?
- Image storage (S3, Cloudinary)?
- Authn provider (in-house hay Auth0/Cognito)?

---

## 8. Tracking

- File này **là single source of truth tiến độ migration**. Update status mỗi khi skill complete.
- Mỗi BMad skill chạy trong **fresh context window** — không nối skill.
- Khi có change scope lớn → chạy `bmad-correct-course` trước khi sửa file này.

### Changelog

- v0.1 (initial): bootstrap từ `migration-draft-plan.md`, lấp 10 lỗ hổng, define BMad lộ trình + Superpowers boundary.

### Phase status updates

- **Phase 0 (Brownfield Discovery)** — ✅ DONE 2026-05-24. `documents/knowledge/project-context.md` produced (665 lines, 27 anomalies).
- **Phase 1 (Analysis)** — ✅ DONE 2026-05-24. `brief.md` status=complete (Coaching path, 9 turns, 668 lines).
- **Phase 2 (Planning)** — ✅ DONE 2026-05-24. `prd.md` status=final (Fast path, 1087 lines, 58 FRs + 8 NFRs, 24 anomaly traceability, Reviewer Gate PASS-WITH-FIXES autofixed).
- **Phase 3 (Solutioning)** — 🟡 IN PROGRESS.
  - ✅ `architecture.md` status=complete (hybrid mode, 2094 lines, 17 sections, 8 mermaid diagrams, all 7 OQs resolved).
  - ⏸️ TEA chains (Test Design, Test Framework, CI Setup) — pending.
  - ⏸️ UX Design — optional, can run parallel with Epics.
  - ⏸️ Epics & Stories — required gate, after Architecture.
  - ⏸️ Implementation Readiness — required gate, last in Phase 3.
- **Phase 4 (Implementation)** — ⏸️ blocked on Phase 3 gates.
