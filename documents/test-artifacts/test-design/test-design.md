---
workflowStatus: 'drafting'
totalSteps: 5
stepsCompleted: [1, 2, 3, 4, 5]
lastStep: 5
nextStep: ''
lastSaved: '2026-05-24'
designLevel: system
project: prodigy-glasses-remake
inputDocuments:
  - documents/planning-artifacts/architecture.md
  - documents/planning-artifacts/prds/prd-prodigy-glasses-remake-2026-05-24/prd.md
  - documents/planning-artifacts/briefs/brief-prodigy-glasses-remake-2026-05-24/brief.md
  - documents/knowledge/project-context.md
---

# Test Design: System-Level — Prodigy Glasses Remake

**Date:** 2026-05-24
**Author:** Jarvis
**Status:** Draft
**Design Level:** System (all modules, all sprints)
**Mode:** Hybrid (Fast path — no A/P/C ceremony)

---

## Executive Summary

**Scope:** System-level test design covering all 8 backend modules (Auth, Catalog, Cart, Order, Payment, Notification, Admin, Common) + Next.js frontend (3 route groups) + cross-cutting concerns (observability, CI gates, WebSocket). Spans 5-week sprint plan, 58 FRs, 8 NFRs, 27 anomaly resolutions.

**Risk Summary:**

- Total risks identified: **35**
- High-priority risks (score ≥6): **18**
- Critical categories: SEC (10), DATA (7), PERF (5), TECH (6), OPS (3), BUS (4)

**Coverage Summary:**

- P0 test classes: 14 (blocks release — every commit)
- P1 test classes: 18 (PR gate — every merge to main)
- P2 test classes: 12 (nightly/weekly regression)
- P3 test classes: 8 (on-demand, exploratory, benchmark)

**Quality Gate Thresholds:**

- P0 pass rate: 100% (no exceptions)
- P1 pass rate: ≥95%
- Coverage ≥70% service layer (NFR-05 AC1)
- 7/7 E2E Playwright flows green
- Lighthouse ≥90 PLP/PDP (NFR-01)
- 0 high-risk (≥6) items unmitigated at release

---

## Risk Assessment

### Risk Scoring Methodology

- **Probability (P):** 1 = Unlikely, 2 = Possible, 3 = Likely
- **Impact (I):** 1 = Low, 2 = Medium, 3 = High
- **Score:** P × I (threshold ≥6 = high-priority, requires mitigation plan)
- **Categories:** TECH (Technical/Architecture), SEC (Security), PERF (Performance), DATA (Data Integrity), BUS (Business Logic), OPS (Operations)

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description                                                                                  | P   | I   | Score | FR/NFR/Anomaly    | Mitigation                                                                                                                    |
| ------- | -------- | -------------------------------------------------------------------------------------------- | --- | --- | ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| R-001   | SEC      | Refresh token reuse — rotated token replayed without family revoke triggers session hijack   | 2   | 3   | 6     | FR-05, #A12       | Integration test: rotate twice with same JTI → assert family revoked + 401                                                    |
| R-002   | SEC      | Webhook signature forgery — attacker sends fake PayPal webhook to mark order paid            | 3   | 3   | 9     | FR-31, #A16       | Integration test: tampered signature → 401; valid signature → 200 + order updated                                             |
| R-003   | SEC      | Webhook replay attack — same PayPal event_id sent multiple times causes double-processing    | 2   | 3   | 6     | FR-32, #A16       | Integration test: replay same event_id → second call no-op, order unchanged                                                   |
| R-004   | SEC      | isPaid bypass — client sends `isPaid: true` in order create body, server trusts it           | 3   | 3   | 9     | FR-33, #A16       | Integration test: POST /api/orders with isPaid:true → field stripped by DTO whitelist                                         |
| R-005   | SEC      | RBAC bypass — non-admin user accesses admin endpoints due to missing guard                   | 2   | 3   | 6     | FR-08, #A6, #A8   | E2E #6 + integration: iterate all /api/admin/\* with USER role → assert 403                                                   |
| R-006   | SEC      | Owner-or-admin bypass — user A reads/cancels user B's order                                  | 2   | 3   | 6     | FR-41, FR-26, #A9 | Integration test: user A GET /api/orders/:userB_order → 403                                                                   |
| R-007   | SEC      | Verified-purchase bypass — user without DELIVERED order posts review                         | 2   | 3   | 6     | FR-51, #A10       | E2E #7 + integration: user without purchase → 403 purchase_required                                                           |
| R-008   | SEC      | PII leak in API response — password hash or refresh tokens exposed                           | 2   | 3   | 6     | FR-09, #A7, #A23  | Integration test: grep all User-shaped responses for `password` field → assert absent                                         |
| R-009   | SEC      | Token storage regression — access token persisted to localStorage instead of memory          | 2   | 3   | 6     | #A13, NFR-02      | E2E assertion: after sign-in, localStorage.getItem('access_token') === null                                                   |
| R-010   | SEC      | CORS regression — wildcard `*` origin allowed in production config                           | 2   | 3   | 6     | #A22, NFR-02      | Integration test: request with Origin: evil.com → no Access-Control-Allow-Origin                                              |
| R-011   | DATA     | Stock over-decrement — concurrent checkout same product causes negative stock                | 2   | 3   | 6     | FR-25, NFR-03     | Integration test: 2 concurrent POST /api/orders same product (stock=1) → only 1 succeeds, stock=0                             |
| R-012   | DATA     | Cache stale after admin write — PDP shows old price after admin update                       | 2   | 3   | 6     | FR-14, NFR-01     | E2E #4: admin update product → immediate PDP fetch returns new data                                                           |
| R-013   | DATA     | Cart race condition — simultaneous add/update same product creates duplicate line            | 2   | 3   | 6     | FR-20, FR-21      | Integration test: concurrent POST /api/cart/items same product → single merged line                                           |
| R-014   | DATA     | Order snapshot drift — OrderItem reflects live product price instead of order-time price     | 2   | 3   | 6     | FR-25, FR-41      | Integration test: create order → admin update product price → GET order → snapshot unchanged                                  |
| R-015   | DATA     | Audit log loss on business write — audit entry fails silently, no trace of admin action      | 2   | 3   | 6     | FR-79, NFR-04     | Integration test: admin delete user → audit_log table has entry; simulate audit write failure → business write still succeeds |
| R-016   | DATA     | Refresh family revoke incomplete — some tokens in family remain active after reuse detection | 2   | 3   | 6     | FR-05             | Integration test: after reuse-detect, query all family tokens → assert ALL status=revoked                                     |
| R-017   | DATA     | Soft-delete integrity — soft-deleted product still appears in catalog queries                | 2   | 3   | 6     | FR-72, FR-10      | Integration test: soft-delete product → GET /api/products → product absent from results                                       |
| R-018   | PERF     | Lighthouse regression on PLP — bundle size or render blocking drops score below 90           | 2   | 3   | 6     | NFR-01, FR-85     | Lighthouse CI gate in GitHub Actions; .lighthouserc.json assertions                                                           |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description                                                                                     | P   | I   | Score | FR/NFR/Anomaly             | Mitigation                                                                                     |
| ------- | -------- | ----------------------------------------------------------------------------------------------- | --- | --- | ----- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| R-019   | PERF     | Cache hit ratio below 80% — excessive misses degrade catalog response time                      | 2   | 2   | 4     | FR-13, NFR-01              | Monitor /metrics cache_hits_total vs cache_misses_total; alert if ratio <80% after warmup      |
| R-020   | PERF     | PLP slow on cold cache — first request >1500ms without cache warm                               | 2   | 2   | 4     | FR-10, NFR-01              | Benchmark test: cold PLP fetch ≤1500ms with 30+ products                                       |
| R-021   | PERF     | ISR stale beyond acceptable window — PDP serves data >60s stale after admin write               | 2   | 2   | 4     | FR-82, FR-14               | E2E: admin update → wait 0s → fetch PDP → assert fresh (on-demand revalidation)                |
| R-022   | PERF     | Bundle size exceeds 250KB gzipped on PLP route                                                  | 2   | 2   | 4     | FR-85, NFR-01              | Lighthouse CI + next-bundle-analyzer in CI                                                     |
| R-023   | TECH     | Hydration mismatch — RSC/Client boundary causes React hydration error in production build       | 2   | 2   | 4     | FR-81, NFR-05              | E2E: Playwright captures console errors on page load → assert no hydration warnings            |
| R-024   | TECH     | Server Action redirect loop — form action error handling causes infinite redirect               | 2   | 2   | 4     | FR-87                      | E2E: submit invalid form → assert error state rendered, no redirect loop (max 2 navigations)   |
| R-025   | TECH     | WebSocket reconnect storm — access token expiry causes rapid reconnect attempts flooding server | 2   | 2   | 4     | FR-91, ADR-08              | Integration test: simulate token expiry → assert exponential backoff (max 5 attempts)          |
| R-026   | TECH     | Migration rollback failure — down() migration leaves schema in broken state                     | 1   | 3   | 3     | NFR-03, NFR-06             | CI job: run migrations up then down → assert clean state                                       |
| R-027   | TECH     | Testcontainers slow CI — integration tests exceed 10min timeout on GitHub Actions               | 2   | 2   | 4     | NFR-05, Architecture §11.3 | Parallel test files; persistent volume opt-in; CI timeout monitoring                           |
| R-028   | TECH     | Any type leakage in service layer — `any` bypasses type safety in critical business logic       | 2   | 2   | 4     | NFR-05 AC6                 | Custom ESLint rule banning `any` in services/\*\*; CI lint gate                                |
| R-029   | OPS      | Health endpoint false-positive — /health returns 200 when MySQL or Redis is actually down       | 2   | 2   | 4     | NFR-03 AC5                 | Integration test: stop Redis container → GET /health → assert 503                              |
| R-030   | OPS      | SMTP prod missing — email worker fails silently in non-dev environment without Mailhog          | 1   | 3   | 3     | FR-60, NFR-03              | Config validation: if NODE_ENV != development, require SMTP_HOST env; fail-fast on boot        |
| R-031   | OPS      | Trace ID gap in BullMQ — job processing loses trace context, breaks end-to-end observability    | 2   | 2   | 4     | NFR-04 AC1                 | Integration test: create order → consume email job → assert traceparent propagated in job data |
| R-032   | BUS      | State machine misconfig — invalid transition allowed (e.g., DELIVERED→PENDING)                  | 2   | 2   | 4     | FR-78, ADR-09              | Unit test: matrix test all (from, to) pairs → assert only valid transitions pass               |
| R-033   | BUS      | Verified-purchase false positive — user with PAID (not DELIVERED) order can post review         | 2   | 2   | 4     | FR-51                      | Integration test: user with PAID order → POST review → 403                                     |
| R-034   | BUS      | PayPal currency mismatch — VND→USD conversion uses wrong rate or rounds incorrectly             | 2   | 2   | 4     | FR-30                      | Unit test: assert conversion at rate from env (24000); edge cases (1 VND, max VND)             |
| R-035   | BUS      | Vietnamese UI regression — hardcoded English text appears in user-facing UI                     | 1   | 2   | 2     | NFR-08                     | E2E: snapshot key UI pages → grep for common English words in visible text                     |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description                          | P   | I   | Score | FR/NFR/Anomaly | Action                    |
| ------- | -------- | ------------------------------------ | --- | --- | ----- | -------------- | ------------------------- |
| R-035   | BUS      | Vietnamese UI regression (see above) | 1   | 2   | 2     | NFR-08         | Monitor via E2E snapshots |

> **Note:** R-035 appears in both medium and low tables because score=2 is borderline. Treated as low-priority with monitoring.

### Risk Category Distribution

| Category  | Count  | High (≥6) | Medium (3–5) | Low (1–2) |
| --------- | ------ | --------- | ------------ | --------- |
| SEC       | 10     | 10        | 0            | 0         |
| DATA      | 7      | 7         | 0            | 0         |
| PERF      | 5      | 1         | 4            | 0         |
| TECH      | 6      | 0         | 6            | 0         |
| OPS       | 3      | 0         | 3            | 0         |
| BUS       | 4      | 0         | 3            | 1         |
| **Total** | **35** | **18**    | **16**       | **1**     |

---

## NFR Planning

> Mỗi NFR có threshold cụ thể, validation approach, và evidence cần thu thập. Đây là planning — evidence thực tế sẽ được audit bởi `bmad-testarch-nfr` sau implementation.

| NFR                    | Requirement / Threshold                                                                                                                        | Risk Link                  | Planned Validation                                                                               | Evidence Needed                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| NFR-01 Performance     | Lighthouse ≥90 PLP/PDP; LCP <2.5s; INP <200ms; CLS <0.1; cache hit ≥80%; API p50 <100ms cached                                                 | R-018, R-019, R-020, R-022 | Lighthouse CI gate (.lighthouserc.json); /metrics endpoint monitoring; Jaeger trace inspection   | Lighthouse CI report artifact; /metrics scrape; bundle-analyzer output |
| NFR-02 Security        | 24 anomalies fixed; JWT rotation + reuse detection; webhook signature verify; CORS allowlist; RBAC default-deny; rate limiting 10 req/min auth | R-001..R-010               | Integration tests per anomaly; E2E #5 (rotation), #6 (RBAC); CORS reject test; rate-limit test   | Test reports; commit history with #A tags; security scan (optional)    |
| NFR-03 Reliability     | Atomic order transaction; webhook idempotent; BullMQ retry 3x; health endpoint accurate; graceful shutdown                                     | R-011, R-003, R-029, R-030 | Integration tests: concurrent stock, webhook replay, health degraded; manual SIGTERM test        | Test reports; health endpoint response under failure; queue retry logs |
| NFR-04 Observability   | OTel traces HTTP+DB+Redis+BullMQ; Pino structured logs with traceId; /metrics Prometheus counters                                              | R-031                      | Integration test: create order → verify Jaeger trace spans; verify log JSON shape; curl /metrics | Jaeger screenshot; log sample; metrics endpoint output                 |
| NFR-05 Quality         | Coverage ≥70% services; 7 E2E green; strict TS; 0 any in services; no console.log; ESLint --max-warnings 0                                     | R-027, R-028               | Jest coverage report; Playwright CI; ESLint CI gate; tsc --noEmit CI gate                        | Coverage badge; CI workflow logs; ESLint report                        |
| NFR-06 Maintainability | Conventional commits; ≥6 ADRs; README 8 sections; architecture diagrams ≥3; per-anomaly commit trace                                           | —                          | Manual review; commit history scan; ADR count check; README checklist                            | README screenshot; ADR folder listing; commit log grep                 |
| NFR-07 Compatibility   | Chrome/Edge/Firefox/Safari latest 2; mobile ≥360px; WCAG AA baseline; Lighthouse Accessibility ≥90                                             | —                          | Playwright multi-browser (Chromium primary, WebKit/Firefox optional); responsive viewport tests  | Playwright reports; Lighthouse accessibility score                     |
| NFR-08 Localization    | Vietnamese UI; English code/log; VND ₫ format; DD/MM/YYYY dates                                                                                | R-035                      | E2E visual regression; grep for English in UI components                                         | Snapshot diffs; grep report                                            |

---

## Entry Criteria

- [ ] Docker Compose stack healthy (MySQL 8 + Redis 7 + Jaeger + Mailhog) — `docker compose up` passes healthchecks
- [ ] TypeORM migrations run successfully (all 10 initial migrations)
- [ ] Seed data loaded (≥30 products, ≥6 categories, admin user, sample orders)
- [ ] NestJS API boots without error, `/health` returns 200
- [ ] Next.js web builds successfully (`npm run build` in apps/web)
- [ ] CI baseline green (lint + typecheck pass)
- [ ] `packages/shared-types` compiles and exports Zod schemas
- [ ] Test infrastructure ready: Jest configured, Playwright installed, testcontainers accessible
- [ ] Environment variables documented in `.env.example` with all required keys

## Exit Criteria

- [ ] All P0 test classes passing (14/14)
- [ ] All P1 test classes passing or failures triaged with documented waivers
- [ ] 7/7 E2E Playwright flows green in CI
- [ ] Coverage ≥70% on service layer (Auth, Catalog, Order, Payment, Notification services)
- [ ] Lighthouse ≥90 on PLP and PDP in CI
- [ ] No open high-severity bugs (P0/P1 blocking)
- [ ] All 18 high-priority risks (≥6) have passing mitigation tests
- [ ] Security test classes (R-001..R-010) pass 100%
- [ ] NFR evidence collected for all 8 NFRs (or documented CONCERNS)
- [ ] `bmad-code-review` + `bmad-review-edge-case-hunter` clean (or known issues documented)

---

## Test Coverage Plan

> Test classes (NOT individual test cases). Mỗi class = 1 describe block hoặc 1 spec file. Actual test case count sẽ emerge during implementation.

### P0 (Critical) — Run on every commit

**Criteria:** Blocks core user journey + High risk (≥6) + No workaround exists

| #   | Test Class                                          | Test Level                   | Risk Link    | FR/NFR             | Notes                                                       |
| --- | --------------------------------------------------- | ---------------------------- | ------------ | ------------------ | ----------------------------------------------------------- |
| 1   | Auth sign-up/sign-in happy path + cookie discipline | Integration (supertest)      | R-008, R-009 | FR-01, FR-02, #A12 | Assert refresh in cookie only, no password in response      |
| 2   | Refresh token rotation + reuse detection            | Integration (testcontainers) | R-001, R-016 | FR-04, FR-05       | Rotate → reuse old → family revoked; E2E #5 mirror          |
| 3   | RBAC enforcement across all admin endpoints         | Integration (supertest)      | R-005        | FR-08, #A6, #A8    | Iterate /api/admin/\* with USER token → 403; E2E #6 mirror  |
| 4   | Owner-or-admin guard on orders                      | Integration                  | R-006        | FR-41, FR-26, #A9  | User A cannot GET/DELETE user B's order                     |
| 5   | PayPal webhook signature verification               | Integration                  | R-002        | FR-31, #A16        | Valid sig → 200; tampered → 401                             |
| 6   | Webhook idempotency (dedup replay)                  | Integration (testcontainers) | R-003        | FR-32              | Same event_id twice → second no-op                          |
| 7   | isPaid server-authoritative (DTO whitelist)         | Integration                  | R-004        | FR-33              | POST /api/orders with isPaid:true → stripped                |
| 8   | Order create atomic transaction + stock lock        | Integration (testcontainers) | R-011        | FR-25, NFR-03      | Concurrent checkout → only 1 succeeds; stock never negative |
| 9   | Cache invalidation on admin write                   | Integration + E2E #4         | R-012        | FR-14              | Admin update → immediate read returns fresh                 |
| 10  | Verified-purchase guard for reviews                 | Integration + E2E #7         | R-007        | FR-51, #A10        | No DELIVERED order → 403                                    |
| 11  | PII projection discipline                           | Integration                  | R-008        | FR-09, #A7, #A23   | Scrape all user-returning endpoints → no password field     |
| 12  | CORS allowlist enforcement                          | Integration                  | R-010        | #A22, NFR-02       | Unknown origin → no ACAO header                             |
| 13  | Lighthouse CI gate (PLP + PDP)                      | E2E (Lighthouse CI)          | R-018        | NFR-01, FR-85      | Performance ≥90, Accessibility ≥90                          |
| 14  | E2E full checkout flow (COD + PayPal)               | E2E (Playwright)             | R-011, R-002 | FR-25, FR-31       | E2E #1 + #2: sign-up → checkout → order confirmed           |

**Total P0:** 14 test classes

### P1 (High) — Run on PR to main

**Criteria:** Important features + Medium risk (3–5) + Common user workflows

| #   | Test Class                                            | Test Level         | Risk Link | FR/NFR               | Notes                                              |
| --- | ----------------------------------------------------- | ------------------ | --------- | -------------------- | -------------------------------------------------- |
| 1   | Cart CRUD operations (add/update/remove/get)          | Integration        | R-013     | FR-20..FR-23         | Include concurrent add same product → merge        |
| 2   | Order state machine transitions                       | Unit + Integration | R-032     | FR-78, ADR-09        | Matrix test all valid/invalid (from,to) pairs      |
| 3   | Order cancel + stock restore                          | Integration        | —         | FR-26                | Cancel PENDING → stock restored; cancel PAID → 409 |
| 4   | Catalog filter/sort/pagination/search                 | Integration        | R-020     | FR-10, FR-11         | All filter combos; edge cases (empty, max page)    |
| 5   | Cache-aside read pattern (hit/miss/TTL)               | Integration        | R-019     | FR-13                | Verify cache populated on miss; hit on second read |
| 6   | Admin mark delivered + email enqueue                  | Integration        | —         | FR-78, FR-62         | State transition + BullMQ job created              |
| 7   | BullMQ email retry + failure handling                 | Integration        | R-030     | FR-60, NFR-03        | Simulate SMTP failure → 3 retries → failed queue   |
| 8   | WebSocket admin handshake + auth gate                 | Integration        | R-025     | FR-90, FR-91, ADR-08 | Admin token → connected; USER token → rejected     |
| 9   | Health endpoint degraded state                        | Integration        | R-029     | NFR-03 AC5           | Kill Redis → /health returns 503                   |
| 10  | Rate limiting on auth endpoints                       | Integration        | —         | NFR-02 AC11          | 11th request within 60s → 429                      |
| 11  | Request validation (whitelist + forbidNonWhitelisted) | Integration        | —         | #A24, NFR-02         | Extra fields stripped; invalid types → 400         |
| 12  | Soft-delete product exclusion from catalog            | Integration        | R-017     | FR-72, FR-10         | Soft-deleted product absent from GET /api/products |
| 13  | Order snapshot immutability                           | Integration        | R-014     | FR-25, FR-41         | Price change after order → snapshot unchanged      |
| 14  | Audit log write on admin actions                      | Integration        | R-015     | FR-79                | Delete user/product/comment → audit entry exists   |
| 15  | PayPal create-order + currency conversion             | Unit + Integration | R-034     | FR-30                | USD amount = VND / rate; edge cases                |
| 16  | Review CRUD + rating recompute                        | Integration        | R-033     | FR-50, FR-51, FR-52  | Submit → rating updated; delete → rating updated   |
| 17  | Admin dashboard KPIs                                  | Integration        | —         | FR-70                | Correct aggregation; cached 60s                    |
| 18  | Migration up/down reversibility                       | Integration (CI)   | R-026     | NFR-03, NFR-06       | Run all migrations up then down → clean state      |

**Total P1:** 18 test classes

### P2 (Medium) — Run nightly/weekly

**Criteria:** Secondary features + Low risk + Edge cases + Regression safety net

| #   | Test Class                                        | Test Level  | Risk Link | FR/NFR                | Notes                                                           |
| --- | ------------------------------------------------- | ----------- | --------- | --------------------- | --------------------------------------------------------------- |
| 1   | User profile update (null vs undefined semantics) | Integration | —         | FR-07, #A19           | Explicit null clears; undefined no-op                           |
| 2   | Category CRUD + cascade protection                | Integration | —         | FR-73                 | Delete with products → 409                                      |
| 3   | Admin user management (CRUD + bulk delete)        | Integration | —         | FR-71                 | Soft-delete with orders; cannot self-delete                     |
| 4   | Admin product management (CRUD + bulk)            | Integration | —         | FR-72                 | Validation constraints; cache invalidation                      |
| 5   | Admin comment management + audit                  | Integration | —         | FR-76                 | Delete → audit entry + rating recompute                         |
| 6   | Checkout preview validation                       | Integration | —         | FR-24                 | Empty cart → 400; stock exceeded → 409                          |
| 7   | Sign-out + blacklist enforcement                  | Integration | —         | FR-03                 | After sign-out, old access token → 401                          |
| 8   | Error response shape consistency                  | Integration | —         | NFR-02 AC10           | All error responses match { error: { code, message, traceId } } |
| 9   | Pino log structure + redaction                    | Unit        | —         | NFR-04, NFR-02 AC7    | Log output has traceId; password/token redacted                 |
| 10  | OpenTelemetry trace propagation                   | Integration | R-031     | NFR-04                | Order create → Jaeger shows DB+cache+queue spans                |
| 11  | Env validation fail-fast                          | Unit        | —         | #A1, #A21, NFR-02 AC8 | Missing required env → app throws on boot                       |
| 12  | ESLint custom rules enforcement                   | Unit (lint) | R-028     | NFR-05 AC6            | No `any` in services; no console.log; no shadcn in (public)     |

**Total P2:** 12 test classes

### P3 (Low) — Run on-demand

**Criteria:** Exploratory + Performance benchmarks + Visual regression + Nice-to-have

| #   | Test Class                             | Test Level                   | Risk Link | FR/NFR     | Notes                                       |
| --- | -------------------------------------- | ---------------------------- | --------- | ---------- | ------------------------------------------- |
| 1   | Hydration mismatch detection           | E2E (Playwright)             | R-023     | FR-81      | Console error capture on all pages          |
| 2   | Server Action redirect loop detection  | E2E                          | R-024     | FR-87      | Submit invalid form → no infinite redirect  |
| 3   | WebSocket reconnect backoff behavior   | Integration                  | R-025     | FR-91      | Token expiry → exponential backoff observed |
| 4   | Bundle size analysis                   | Build (next-bundle-analyzer) | R-022     | FR-85      | PLP route <250KB gzipped                    |
| 5   | Vietnamese UI text regression          | E2E (snapshot)               | R-035     | NFR-08     | Key pages → no unexpected English           |
| 6   | Testcontainers CI performance          | CI monitoring                | R-027     | NFR-05     | Integration suite <10min                    |
| 7   | Multi-browser smoke (WebKit + Firefox) | E2E (Playwright)             | —         | NFR-07     | Basic flows on non-Chromium                 |
| 8   | Graceful shutdown behavior             | Integration                  | —         | NFR-03 AC6 | SIGTERM → in-flight requests complete <30s  |

**Total P3:** 8 test classes

---

## Execution Order

> Thứ tự chạy test từ nhanh → chậm, fail-fast strategy. CI pipeline mirrors this order.
> (Tham chiếu Architecture §11.5 CI workflow)

### Phase 1: Static Analysis (<2 min)

**Purpose:** Catch syntax, type, and style issues before any runtime cost.

1. ESLint (`--max-warnings 0`) — includes custom rules (no `any`, no `console.log`, no shadcn in public)
2. TypeScript `tsc --noEmit` — strict mode, catches type regressions
3. Prettier check — formatting consistency
4. Commitlint — conventional commit format (on commit-msg hook)

### Phase 2: Unit Tests (<3 min)

**Purpose:** Fast feedback on service logic, no I/O.

1. OrderStateMachine transition matrix (all from→to pairs)
2. PayPal currency conversion logic (edge cases)
3. Cache key hash computation (deterministic)
4. DTO mapper projection (no sensitive fields)
5. Env validation schema (missing/invalid keys)
6. Pino redaction rules (sensitive paths censored)
7. Rate limit sliding window logic

### Phase 3: Integration Tests (<8 min)

**Purpose:** Verify real DB/Redis/queue interactions via testcontainers.

1. **Auth lifecycle:** sign-up → sign-in → refresh → reuse-detect → sign-out → blacklist
2. **RBAC sweep:** all admin endpoints with USER token → 403
3. **Catalog cache:** write → invalidate → read fresh
4. **Order transaction:** concurrent stock decrement → pessimistic lock holds
5. **Webhook:** signature verify + idempotency replay
6. **Cart:** concurrent add → merge; stock validation
7. **Review:** verified-purchase guard; rating recompute
8. **Health:** degraded state detection
9. **WebSocket:** admin handshake auth gate
10. **Audit:** admin actions → log entries created
11. **BullMQ:** email enqueue → retry on failure → failed queue

### Phase 4: E2E Tests (<10 min)

**Purpose:** Full browser-based user journey validation.

1. **E2E #1:** Sign-up → sign-in → browse PLP → add to cart → checkout COD → My Orders
2. **E2E #2:** PayPal sandbox checkout → simulated webhook → order confirmed
3. **E2E #3:** Admin mark order delivered → user sees status update
4. **E2E #4:** Cache invalidation: admin update product → PDP reflects new data
5. **E2E #5:** Refresh token rotation → reuse detection → forced logout
6. **E2E #6:** RBAC: non-admin cannot reach admin endpoints (negative)
7. **E2E #7:** Review verification: user without DELIVERED order blocked

### Phase 5: Performance & Build Gates (<5 min)

**Purpose:** Non-functional quality assertions.

1. Lighthouse CI (PLP, PDP, Home) — Performance ≥90, Accessibility ≥90
2. Bundle size check (next-bundle-analyzer output)
3. Docker build verification (apps/api + apps/web)

**Total CI pipeline target: <25 min** (parallel jobs where possible per Architecture §11.5)

---

## Test Pyramid Targets

> Tham chiếu Architecture §11.1. Ratio target: ~1 E2E : ~5 Integration : ~25 Unit.

| Layer       | Tool                              | Target Count                | Scope                                                        | Run Frequency               |
| ----------- | --------------------------------- | --------------------------- | ------------------------------------------------------------ | --------------------------- |
| Unit        | Jest                              | ~150–300 tests              | Service methods, pure logic, DTOs, state machine, validators | Every commit                |
| Integration | Jest + Supertest + Testcontainers | ~30–50 tests                | Repository + Service + Controller; real MySQL + Redis        | Every commit (P0) / PR (P1) |
| E2E         | Playwright                        | 7 specs (~20–30 assertions) | Full browser flows, cross-module journeys                    | Every PR to main            |
| Performance | Lighthouse CI                     | 3 URLs × 3 runs             | Core Web Vitals, bundle size                                 | Every PR to main            |
| Static      | ESLint + tsc                      | — (pass/fail gate)          | Type safety, code style, custom rules                        | Every commit                |

### Coverage Targets by Module

| Module             | Unit Target | Integration Target | Key Focus                                  |
| ------------------ | ----------- | ------------------ | ------------------------------------------ |
| AuthModule         | ≥80%        | 8–12 tests         | Rotation, reuse-detect, blacklist, RBAC    |
| CatalogModule      | ≥70%        | 6–8 tests          | Cache-aside, invalidation, filter logic    |
| CartModule         | ≥70%        | 4–6 tests          | Concurrent add, stock validation           |
| OrderModule        | ≥75%        | 8–10 tests         | Transaction, state machine, cancel+restore |
| PaymentModule      | ≥80%        | 6–8 tests          | Webhook verify, idempotency, currency      |
| NotificationModule | ≥60%        | 3–4 tests          | Queue enqueue, retry, failure handling     |
| AdminModule        | ≥60%        | 6–8 tests          | CRUD, audit, dashboard aggregation         |
| CommonModule       | ≥70%        | 2–3 tests          | Error filter, health, validation pipe      |

**Aggregate service layer target: ≥70%** (NFR-05 AC1)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

| Gate                     | Threshold                                      | Enforcement                     | Consequence of Failure         |
| ------------------------ | ---------------------------------------------- | ------------------------------- | ------------------------------ |
| P0 test pass rate        | **100%** (no exceptions)                       | CI blocks merge                 | Cannot merge to main           |
| P1 test pass rate        | **≥95%** (waivers require documented reason)   | CI blocks merge                 | Cannot merge; waiver needs ADR |
| P2/P3 pass rate          | **≥90%** (informational)                       | CI warns, does not block        | Tracked in sprint status       |
| Service layer coverage   | **≥70%**                                       | Jest coverage report + CI check | PR blocked if coverage drops   |
| E2E flows                | **7/7 green**                                  | Playwright CI job               | Cannot merge                   |
| Lighthouse Performance   | **≥90** (PLP, PDP)                             | lhci autorun assertions         | PR blocked                     |
| Lighthouse Accessibility | **≥90**                                        | lhci autorun assertions         | PR blocked                     |
| ESLint                   | **0 warnings, 0 errors**                       | `--max-warnings 0`              | PR blocked                     |
| TypeScript               | **0 errors**                                   | `tsc --noEmit`                  | PR blocked                     |
| High-risk mitigations    | **100% complete** (all 18 risks with score ≥6) | Manual review at sprint end     | Release blocked                |
| Security tests (SEC)     | **100% pass**                                  | CI integration suite            | Cannot release                 |

### Non-Negotiable Requirements (Release Blockers)

- [ ] All P0 test classes pass
- [ ] All 7 E2E Playwright flows green
- [ ] No high-risk (≥6) items without passing mitigation test
- [ ] Security test classes (R-001..R-010) pass 100%
- [ ] Lighthouse ≥90 on PLP and PDP
- [ ] Coverage ≥70% service layer
- [ ] 0 `any` in service layer (ESLint custom rule)
- [ ] No `console.log` in production source
- [ ] All NFR evidence exists or documented CONCERNS with waivers

### Waiver Process (cho solo dev context)

Vì đây là solo project, waiver = documented decision trong `docs/ADRs/` hoặc inline comment explaining why a threshold is temporarily relaxed. Mỗi waiver phải có:

1. Risk ID affected
2. Reason (technical constraint, time constraint, acceptable risk)
3. Remediation plan (when/how it will be fixed)
4. Expiry (sprint number or "post-MVP")

---

## Mitigation Plans

> Chi tiết cho mỗi risk có score ≥6. Mỗi mitigation = test class cụ thể + verification approach.

### R-001: Refresh Token Reuse — Family Revoke Failure (Score: 6)

**Strategy:** Integration test with testcontainers MySQL simulating full rotation chain.
**Test scenario:**

1. Sign-in → get refresh token T1 (family F1)
2. Refresh with T1 → get T2 (T1 marked `rotated`)
3. Replay T1 (reuse) → server detects, revokes ALL tokens in F1
4. Assert: T2 now also `revoked`; any refresh with F1 tokens → 401 `family_revoked`
5. Assert: audit_log entry `refresh_reuse_detected` created

**Verification:** Query `refresh_tokens WHERE family_id = F1` → all status = 'revoked'
**Owner:** Jarvis
**Status:** Planned

### R-002: Webhook Signature Forgery (Score: 9)

**Strategy:** Integration test calling POST /api/payment/paypal/webhook with manipulated headers.
**Test scenarios:**

1. Valid PayPal transmission headers + valid body → 200, order marked paid
2. Tampered `paypal-transmission-sig` → 401 `webhook_signature_invalid`
3. Missing transmission headers entirely → 401
4. Valid signature but unknown event type → 200 (no-op, logged)

**Verification:** Order status unchanged on invalid signature; changed only on valid
**Owner:** Jarvis
**Status:** Planned

### R-003: Webhook Replay Attack (Score: 6)

**Strategy:** Integration test sending same PayPal event_id twice within same test.
**Test scenarios:**

1. First call with event_id "evt-123" → 200, order updated to PAID
2. Second call with same event_id "evt-123" → 200, order unchanged (no double-update)
3. Assert: `processed_webhook_events` table has exactly 1 row for "evt-123"

**Verification:** Order.paidAt timestamp unchanged between calls; single DB row
**Owner:** Jarvis
**Status:** Planned

### R-004: isPaid Bypass via Client Claim (Score: 9)

**Strategy:** Integration test attempting to set isPaid through order creation.
**Test scenarios:**

1. POST /api/orders with body including `isPaid: true` → field stripped by ValidationPipe whitelist
2. Created order has `isPaid: false` regardless of client claim
3. POST /api/orders with body including `status: 'PAID'` → field stripped

**Verification:** SELECT order WHERE id = created → isPaid = false, status = PENDING/AWAITING_PAYMENT
**Owner:** Jarvis
**Status:** Planned

### R-005: RBAC Bypass — Non-Admin Accessing Admin Endpoints (Score: 6)

**Strategy:** Integration test iterating ALL admin endpoints with USER-role token.
**Test scenarios:**

1. Collect all routes matching `/api/admin/*` (from endpoint inventory §6.2.8)
2. For each: send request with valid USER token → assert 403
3. For each: send request with no token → assert 401
4. For each: send request with ADMIN token → assert 2xx (positive control)

**Verification:** Zero 2xx responses from USER token across all admin endpoints
**Owner:** Jarvis
**Status:** Planned

### R-006: Owner-or-Admin Bypass on Orders (Score: 6)

**Strategy:** Integration test with 2 users (A and B) and orders belonging to each.
**Test scenarios:**

1. User A creates order → User B GET /api/orders/:orderA → 403
2. User A creates order → User B DELETE /api/orders/:orderA → 403
3. Admin GET /api/orders/:orderA → 200 (admin can see any)
4. User A GET /api/orders/:orderA → 200 (owner can see own)

**Verification:** Response status codes match expected per actor
**Owner:** Jarvis
**Status:** Planned

### R-007: Verified-Purchase Bypass (Score: 6)

**Strategy:** Integration test + E2E #7 covering the purchase verification chain.
**Test scenarios:**

1. User with NO orders → POST review → 403 `purchase_required`
2. User with PENDING order (not delivered) → POST review → 403
3. User with PAID order (not delivered) → POST review → 403
4. User with DELIVERED order containing product → POST review → 201 ✓
5. User with DELIVERED order for DIFFERENT product → POST review → 403

**Verification:** Only scenario 4 succeeds; all others return 403
**Owner:** Jarvis
**Status:** Planned

### R-008: PII Leak in API Response (Score: 6)

**Strategy:** Integration test scraping all endpoints that return User-shaped objects.
**Test scenarios:**

1. GET /api/auth/me → response body does NOT contain `password` or `refreshTokens`
2. GET /api/admin/users → each user object does NOT contain `password`
3. GET /api/admin/users/:id → no `password` field
4. GET /api/orders/me → user reference does NOT expose password
5. GET /api/products/:id/reviews → reviewer info does NOT expose userId or email

**Verification:** JSON.stringify(response) does NOT match /password|refreshToken/ regex
**Owner:** Jarvis
**Status:** Planned

### R-009: Token Storage Regression — localStorage (Score: 6)

**Strategy:** E2E Playwright test checking browser storage after sign-in.
**Test scenarios:**

1. Sign in successfully via UI
2. Execute `page.evaluate(() => localStorage.getItem('access_token'))` → assert null
3. Execute `page.evaluate(() => localStorage.getItem('token'))` → assert null
4. Execute `page.evaluate(() => sessionStorage.getItem('access_token'))` → assert null

**Verification:** No token-like values in any browser persistent storage
**Owner:** Jarvis
**Status:** Planned

### R-010: CORS Regression — Wildcard Origin (Score: 6)

**Strategy:** Integration test sending requests with various Origin headers.
**Test scenarios:**

1. Request with `Origin: http://localhost:3000` (allowed) → ACAO header present
2. Request with `Origin: https://evil.com` → no ACAO header in response
3. Request with `Origin: *` → no ACAO header
4. Webhook endpoint `/api/payment/paypal/webhook` → CORS not applied (exempt)

**Verification:** Only configured origins receive ACAO; others rejected
**Owner:** Jarvis
**Status:** Planned

### R-011: Stock Over-Decrement via Concurrent Checkout (Score: 6)

**Strategy:** Integration test with testcontainers, 2 concurrent order creates for same product.
**Test scenarios:**

1. Product with countInStock = 1
2. Two simultaneous POST /api/orders (same product, amount=1)
3. Assert: exactly 1 succeeds (201), 1 fails (409 `insufficient_stock`)
4. Assert: Product.countInStock = 0 (never negative)
5. Assert: exactly 1 Order created

**Verification:** Database state after concurrent requests is consistent
**Owner:** Jarvis
**Status:** Planned

### R-012: Cache Stale After Admin Write (Score: 6)

**Strategy:** Integration test + E2E #4 verifying immediate cache invalidation.
**Test scenarios:**

1. GET /api/products/:id → cached (verify via Redis key exists)
2. Admin PUT /api/admin/products/:id (change price)
3. GET /api/products/:id immediately → new price returned
4. Verify Redis key `catalog:product:{id}` was deleted (or refreshed)
5. Verify list cache `catalog:products:list:*` pattern also invalidated

**Verification:** No stale data served after admin write
**Owner:** Jarvis
**Status:** Planned

### R-013: Cart Race Condition — Duplicate Line (Score: 6)

**Strategy:** Integration test with concurrent POST /api/cart/items for same product.
**Test scenarios:**

1. Two simultaneous POST /api/cart/items { productId: X, amount: 1 }
2. Assert: cart has exactly 1 line for product X (not 2 duplicate lines)
3. Assert: amount = 2 (merged) OR one request fails gracefully
4. Unique constraint `uq_cart_product` prevents duplicate at DB level

**Verification:** GET /api/cart → single line item with correct merged amount
**Owner:** Jarvis
**Status:** Planned

### R-014: Order Snapshot Drift (Score: 6)

**Strategy:** Integration test verifying snapshot immutability.
**Test scenarios:**

1. Create order with product at price 500,000 VND
2. Admin updates product price to 600,000 VND
3. GET /api/orders/:id → orderItems[0].priceSnapshot = 500,000 (unchanged)
4. GET /api/products/:id → price = 600,000 (live value updated)

**Verification:** Order item snapshots are frozen at order creation time
**Owner:** Jarvis
**Status:** Planned

### R-015: Audit Log Loss (Score: 6)

**Strategy:** Integration test verifying audit writes + resilience.
**Test scenarios:**

1. Admin DELETE /api/admin/users/:id → audit_log has `user_deleted` entry
2. Admin DELETE /api/admin/comments/:id → audit_log has `comment_deleted_by_admin` entry
3. Simulate audit write failure (mock repository throw) → business write still succeeds (user deleted)
4. Verify: business operation NOT rolled back by audit failure

**Verification:** Audit entries exist for successful operations; business logic unaffected by audit failures
**Owner:** Jarvis
**Status:** Planned

### R-016: Refresh Family Revoke Incomplete (Score: 6)

**Strategy:** Integration test querying all tokens in family after reuse detection.
**Test scenarios:**

1. Create rotation chain: T1 → T2 → T3 (family F1, 3 tokens)
2. Replay T1 (reuse detected)
3. Query: SELECT \* FROM refresh_tokens WHERE family_id = F1
4. Assert: ALL tokens (T1, T2, T3) have status = 'revoked'
5. Attempt refresh with T3 → 401 `family_revoked`

**Verification:** No token in the family remains `active` after reuse detection
**Owner:** Jarvis
**Status:** Planned

### R-017: Soft-Delete Integrity (Score: 6)

**Strategy:** Integration test verifying soft-deleted products are excluded from queries.
**Test scenarios:**

1. Create product P1, verify it appears in GET /api/products
2. Soft-delete P1 (admin DELETE when product has active orders)
3. GET /api/products → P1 absent from results
4. GET /api/products/:P1_id → 404
5. GET /api/admin/products (admin view) → P1 visible with deletedAt set (admin can see soft-deleted)

**Verification:** Public catalog never shows soft-deleted products
**Owner:** Jarvis
**Status:** Planned

### R-018: Lighthouse Regression on PLP (Score: 6)

**Strategy:** Lighthouse CI gate in GitHub Actions with strict assertions.
**Test scenarios:**

1. Build Next.js production (`npm run build`)
2. Start server, run `lhci autorun` against PLP URL
3. Assert: Performance ≥90, Accessibility ≥90, LCP <2.5s, CLS <0.1
4. If assertion fails → PR blocked

**Verification:** `.lighthouserc.json` assertions enforced in CI; report artifact uploaded
**Owner:** Jarvis
**Status:** Planned

---

## Test Data & Fixtures

### Seed Data (shared across all test levels)

| Entity     | Count | Key Characteristics                                                                    | Source                |
| ---------- | ----- | -------------------------------------------------------------------------------------- | --------------------- |
| Users      | ≥5    | 1 admin, 4 regular users (different states: with orders, without orders, with reviews) | Seed script + factory |
| Products   | ≥30   | Across ≥6 categories; varied stock (0, 1, 5, 100); varied prices; some with discount   | Seed script           |
| Categories | ≥6    | Unique names + slugs; at least 1 empty category (no products)                          | Seed script           |
| Orders     | ≥10   | Mix of statuses (PENDING, AWAITING_PAYMENT, PAID, DELIVERED, CANCELLED); COD + PayPal  | Seed script           |
| Reviews    | ≥15   | Varied stars (1-5); spread across products; from verified purchasers                   | Seed script           |
| Cart items | ≥3    | Pre-populated cart for test user                                                       | Factory per test      |

### Test Factories (per-test isolation)

| Factory                               | Purpose                                           | Cleanup Strategy                          |
| ------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| `createTestUser(overrides?)`          | Generate unique user with random email            | Transaction rollback or DELETE after test |
| `createTestProduct(overrides?)`       | Generate product with valid defaults              | Transaction rollback                      |
| `createTestOrder(userId, items)`      | Full order with items + stock decrement           | Transaction rollback                      |
| `createTestReview(userId, productId)` | Review with valid verified-purchase chain         | Transaction rollback                      |
| `getAuthTokens(user)`                 | Sign-in and return { accessToken, refreshCookie } | N/A (stateless)                           |
| `createAdminUser()`                   | Admin user for admin endpoint tests               | Transaction rollback                      |

### Test Isolation Strategy

- **Unit tests:** No DB/Redis. Mock repositories via `jest.mock`. Mock Redis via `ioredis-mock`.
- **Integration tests:** Testcontainers spin fresh MySQL 8 + Redis 7 per test file (hoặc per describe block). Each test uses transactions that rollback, OR unique email/product names to avoid collision.
- **E2E tests:** Full stack running. Each spec has `beforeEach` that resets DB via `npm run db:reset` + reseeds. Unique email per test run to avoid cross-spec pollution.

### Fixtures for Special Scenarios

| Fixture                         | Scenario                                                                         | Setup                             |
| ------------------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| `paypal-webhook-valid.json`     | Valid PayPal PAYMENT.CAPTURE.COMPLETED payload with correct transmission headers | Pre-computed with test webhook ID |
| `paypal-webhook-tampered.json`  | Same payload but with modified signature                                         | Manually corrupted sig field      |
| `paypal-webhook-replay.json`    | Same event_id as valid fixture (for idempotency test)                            | Copy of valid with same event_id  |
| `concurrent-checkout-setup.sql` | Product with countInStock=1 + 2 users with carts containing that product         | SQL insert script                 |
| `rotation-chain-setup`          | User with 3 refresh tokens in same family (T1→T2→T3)                             | Programmatic via factory          |

---

## Tooling

| Tool                 | Version | Purpose                                         | Configuration                                              |
| -------------------- | ------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Jest                 | latest  | Unit + Integration test runner                  | `jest.config.ts` per app; `--coverage --coverageThreshold` |
| Supertest            | latest  | HTTP integration testing (NestJS)               | Imported in integration test files                         |
| Testcontainers       | latest  | Ephemeral MySQL 8 + Redis 7 for integration     | `docker-compose.test.yml` override; GenericContainer API   |
| Playwright           | latest  | E2E browser testing (7 critical flows)          | `playwright.config.ts`; Chromium primary; retries=2 CI     |
| Lighthouse CI        | latest  | Performance + Accessibility gate                | `.lighthouserc.json`; 3 runs per URL; assertions           |
| ioredis-mock         | latest  | Redis mock for unit tests                       | `jest.mock('ioredis')`                                     |
| faker.js             | latest  | Test data generation in factories               | Used in seed scripts + test factories                      |
| prom-client          | latest  | Metrics endpoint for cache hit ratio monitoring | `/metrics` endpoint                                        |
| next-bundle-analyzer | latest  | Bundle size analysis (P3 on-demand)             | `ANALYZE=true npm run build`                               |
| GitHub Actions       | —       | CI orchestration                                | `.github/workflows/ci.yml`                                 |

### CI Pipeline Configuration (tham chiếu Architecture §11.5)

```
Jobs (parallel where possible):
├── lint (ESLint + Prettier + commitlint)
├── typecheck (tsc --noEmit)
├── unit (Jest unit tests + coverage report)
├── integration (Jest + testcontainers; needs Docker-in-Docker)
├── e2e (Playwright; needs built app + running stack)
├── build (Docker buildx for api + web images)
└── lighthouse (lhci autorun against built app)

Dependencies:
  lint → typecheck → [unit, integration, build]
  [unit, integration] → e2e
  build → lighthouse
  [e2e, lighthouse] → ✅ merge allowed
```

### Test Reporting

| Report                 | Format      | Destination                  | Trigger        |
| ---------------------- | ----------- | ---------------------------- | -------------- |
| Jest coverage          | lcov + text | CI artifact + coverage badge | Every PR       |
| Playwright HTML report | HTML        | CI artifact                  | Every PR       |
| Lighthouse report      | JSON + HTML | CI artifact                  | Every PR       |
| Bundle analysis        | HTML        | CI artifact (on-demand)      | Manual trigger |

---

## Phase 4 Readiness Gates

> Gates phải pass trước khi chuyển sang Phase 4 (Frontend depth + Admin module) trong sprint plan.
> Tham chiếu brief §4.3 Tuần 4 entry criteria.

| Gate | Criteria                                                              | Verification Method                        | Status  |
| ---- | --------------------------------------------------------------------- | ------------------------------------------ | ------- |
| G-01 | Auth module complete: sign-up/in/out/refresh/reuse-detect all passing | P0 test classes #1, #2 green               | Planned |
| G-02 | RBAC enforcement verified across all existing admin endpoints         | P0 test class #3 green                     | Planned |
| G-03 | Catalog cache-aside working: read → cache → invalidate cycle proven   | P0 test class #9 green; E2E #4 green       | Planned |
| G-04 | Order transaction atomic: concurrent stock test passing               | P0 test class #8 green                     | Planned |
| G-05 | PayPal webhook end-to-end: signature + idempotency proven             | P0 test classes #5, #6 green; E2E #2 green | Planned |
| G-06 | BullMQ email queue operational: enqueue + consume + retry verified    | P1 test class #7 green                     | Planned |
| G-07 | CI pipeline green on all Phase 1-3 tests                              | GitHub Actions all jobs pass               | Planned |
| G-08 | Coverage ≥50% on service layer (interim gate; final=70%)              | Jest coverage report                       | Planned |

**Decision rule:** If any gate fails, Phase 4 work is blocked. Fix the failing gate first — technical debt in core modules will compound in frontend integration.

---

## Interworking & Regression

> Cross-module interactions that require regression testing when any component changes.

| Component Changed                          | Affected Components                                                                               | Regression Scope                           | Test Classes to Re-run           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------- |
| AuthModule (guards, JWT)                   | ALL modules (every endpoint uses auth)                                                            | Full RBAC sweep + token lifecycle          | P0 #2, #3, #4; P1 #10            |
| CatalogModule (cache keys)                 | CartModule (stock check), OrderModule (snapshot), AdminModule (CRUD)                              | Cache invalidation + catalog reads         | P0 #9; P1 #4, #5                 |
| OrderModule (state machine)                | PaymentModule (webhook → PAID), AdminModule (mark delivered), NotificationModule (email triggers) | State transitions + side effects           | P0 #6, #8; P1 #2, #3, #6         |
| PaymentModule (webhook handler)            | OrderModule (isPaid update), NotificationModule (email-paid enqueue)                              | Webhook → order update → email             | P0 #5, #6, #7; P1 #6             |
| NotificationModule (BullMQ)                | OrderModule (enqueue after create), AdminModule (enqueue after deliver)                           | Email enqueue + retry                      | P1 #7                            |
| CommonModule (ValidationPipe, ErrorFilter) | ALL modules                                                                                       | Error response shape + validation behavior | P2 #8, #11                       |
| Database schema (migrations)               | ALL modules                                                                                       | Full integration suite                     | P1 #18; all P0 integration tests |
| Redis configuration                        | CatalogModule (cache), AuthModule (blacklist, rate-limit)                                         | Cache + auth flows                         | P0 #9, #12; P1 #5, #9, #10       |
| Next.js frontend (RSC/Client boundary)     | E2E flows, Lighthouse scores                                                                      | Full E2E suite + Lighthouse                | P0 #13, #14; all E2E             |
| WebSocket gateway                          | AdminModule (realtime feed)                                                                       | WebSocket auth + event delivery            | P1 #8                            |
| packages/shared-types (Zod schemas)        | Frontend forms + Backend validation                                                               | Validation consistency                     | P1 #11; P2 #1                    |

---

## Assumptions

### Technical Assumptions

1. **Docker available in CI:** GitHub Actions runners support Docker-in-Docker for testcontainers. If not, fallback to service containers in workflow YAML.
2. **Testcontainers startup <30s:** MySQL 8 + Redis 7 containers start within 30s on CI runners. If slower, consider persistent test containers or pre-pulled images.
3. **PayPal sandbox stable:** PayPal sandbox API available for E2E #2. If sandbox is down, E2E #2 can be skipped with documented waiver (webhook test via mock still runs).
4. **Single developer:** All test classes authored and maintained by Jarvis. No handoff or multi-team coordination needed.
5. **Local-first deployment:** No production environment to test against. All tests run against local Docker Compose stack or CI-provisioned containers.
6. **Seed data deterministic:** Seed script produces identical data on every run (fixed UUIDs or deterministic faker seeds) for reproducible test assertions.
7. **macOS + Linux parity:** Tests pass on both macOS (local dev) and Ubuntu (CI). Testcontainers handles platform differences.

### Dependencies

1. **Docker Compose stack healthy** — Required before any integration or E2E test
2. **PayPal sandbox credentials** — Required for E2E #2 (PayPal flow); stored in `.env` / CI secrets
3. **Mailhog running** — Required for email verification in E2E (FR-60 AC6)
4. **Playwright browsers installed** — `npx playwright install chromium` in CI setup step
5. **Node.js ≥18** — Required for native fetch, ESM support in test files

### Risks to Plan

- **Risk:** Testcontainers slow on macOS (Docker Desktop overhead)
  - **Impact:** Local integration test iteration slow (>2min per file)
  - **Contingency:** Use `--testPathPattern` to run single file; consider persistent test DB for local dev

- **Risk:** PayPal sandbox rate limits or downtime
  - **Impact:** E2E #2 flaky or failing
  - **Contingency:** Mock PayPal SDK in integration tests; E2E #2 uses recorded webhook fixture

- **Risk:** Lighthouse scores flaky in CI (±3 points between runs)
  - **Impact:** False failures blocking PRs
  - **Contingency:** 3 runs per URL (median); threshold set at 90 not 95; `numberOfRuns: 3` in config

---

## Approval

**Test Design Approved By:**

- [x] Author/QA/Dev/PM: Jarvis — Date: 2026-05-24

**Comments:** Solo project — single approver. Design reviewed against architecture.md (complete), prd.md (final), brief.md (complete), project-context.md (27 anomalies). All 18 high-priority risks have mitigation plans with concrete test scenarios.

---

## References

| Document              | Path                                                                                   | Status   | Relevance                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| Architecture          | `documents/planning-artifacts/architecture.md`                                         | Complete | Primary input — §11 Testing Architecture, §13 Anomaly Resolution, §9 State Machine, §4 ADRs |
| PRD                   | `documents/planning-artifacts/prds/prd-prodigy-glasses-remake-2026-05-24/prd.md`       | Final    | 58 FRs + 8 NFRs — acceptance criteria drive test scenarios                                  |
| Brief                 | `documents/planning-artifacts/briefs/brief-prodigy-glasses-remake-2026-05-24/brief.md` | Complete | §4.3 sprint plan, §3.1 E2E flows, §5 success metrics                                        |
| Project Context       | `documents/knowledge/project-context.md`                                               | Complete | 27 anomalies (#A1–#A27) — security baseline requirements                                    |
| Migration Master Plan | `documents/planning-artifacts/migration-master-plan.md`                                | Active   | §3.2 positions test-design before framework scaffold                                        |

### Cross-Reference Index

**Risk → FR/NFR mapping:**

- R-001..R-003 → FR-04, FR-05, FR-31, FR-32 (Auth + Payment security)
- R-004 → FR-33 (server-authoritative payment)
- R-005..R-007 → FR-08, FR-41, FR-51 (access control)
- R-008..R-010 → FR-09, NFR-02 (data protection)
- R-011..R-017 → FR-25, FR-14, FR-20, FR-79 (data integrity)
- R-018..R-022 → NFR-01, FR-85 (performance)
- R-023..R-028 → FR-81, FR-87, FR-91, NFR-05 (technical)
- R-029..R-031 → NFR-03, NFR-04 (operations)
- R-032..R-035 → FR-78, FR-51, FR-30, NFR-08 (business)

**Test Class → FR mapping:**

- P0 #1 → FR-01, FR-02, #A12
- P0 #2 → FR-04, FR-05
- P0 #3 → FR-08, #A6, #A8
- P0 #4 → FR-41, FR-26, #A9
- P0 #5 → FR-31, #A16
- P0 #6 → FR-32
- P0 #7 → FR-33
- P0 #8 → FR-25, NFR-03
- P0 #9 → FR-14
- P0 #10 → FR-51, #A10
- P0 #11 → FR-09, #A7, #A23
- P0 #12 → #A22, NFR-02
- P0 #13 → NFR-01, FR-85
- P0 #14 → FR-25, FR-31

---

**Generated by:** BMad TEA Agent — Test Architect Module (hybrid fast-path)
**Workflow:** `bmad-testarch-test-design` (system-level)
**Version:** Adapted from template v4.0 (BMad v6)
**Constraints applied:** No hours/days per test; no multi-role approval; no epic-specific scoping; bilingual EN/VI
