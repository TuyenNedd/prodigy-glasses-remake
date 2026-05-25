# PRD Quality Review — prodigy-glasses-remake

## Overall verdict

**PASS-WITH-FIXES.** This PRD does the hard work most portfolio PRDs skip: every FR has concrete acceptance criteria with status codes, payload shapes, and observable failure modes; every NFR has measurable thresholds; the anomaly traceability table reconciles `prd.md` against the brief's 27 legacy anomalies and accounts for every one. The thesis (portfolio-grade rewrite that earns recruiter attention through trade-off awareness, not feature count) is stated and felt in scope decisions throughout. What's at risk is mostly mechanical and editorial — stack-name capitalization drift (`NextJS` vs `Next.js`), one stale `[ASSUMPTION]` tag inside FR-75 that contradicts §7's "no outstanding assumptions" claim, an unsorted anomaly table in §8, and a small handful of FR cross-reference and dependency-graph nits. None of these threaten decision-readiness; all fit safe autofix.

---

## Decision-readiness — strong

Trade-offs are stated as decisions, not buried as considerations. Three illustrative examples:

- **FR-30 (PayPal currency)**: The PRD names a real tension (VND store currency vs. PayPal sandbox USD-only) and resolves it explicitly: "VND remains canonical store currency. README + ADR document this clearly so recruiter sees intentional choice, not bug." This is exactly the kind of trade-off that distinguishes a thoughtful PRD from a feature list.
- **FR-25 (atomic transaction over Saga)**: The Notes line names the rejected alternative ("ADR documenting 'single-DB transaction over Saga' decision") rather than presenting the choice as obvious.
- **FR-89 (UI library boundary)**: Hard split between shadcn for `(admin)` and vanilla Tailwind for `(public)` is defended in AC1–AC4, with a lint-rule enforcement (AC3) that turns the decision into something testable rather than aspirational.

Open Items in §6 read as genuinely open — `[OQ-01]` through `[OQ-08]` each has a stated decision deadline and a named owner phase. `[OQ-06]` is shown as struck-through (resolved), which is the right pattern for an audit trail.

### Findings

- **medium** Stale assumption flag inside FR-75 contradicts §7 (FR-75 Notes) — Notes line on FR-75 contains `([ASSUMPTION] minimal: order status changes; ...)` while §7 explicitly states "No outstanding `[ASSUMPTION]` tags remain in prd.md." _Fix:_ Drop the `[ASSUMPTION]` token; the substance ("minimal scope: order status changes; full audit UI is future work") is fine to keep as a regular Note.

---

## Substance over theater — strong

Personas (§2) are pruned to three with explicit primary/secondary tiers, and each names key JTBDs that map to specific FRs (recruiter → ADRs/anomaly fixes; Mai → FR-10/12/24/40; Tuấn → FR-70/72/77). No persona theater. No innovation theater either — the PRD doesn't claim novelty; it claims competence on a known shape and lists the discipline (rotation reuse detection, webhook idempotency, RBAC default-deny) as the differentiator, which is honest.

NFRs are not boilerplate. NFR-01 has six numeric thresholds (LCP/INP/CLS/cache hit %/bundle size/p50/p95). NFR-02 has eleven concrete ACs each tied to an anomaly or a named library/header. NFR-04 explicitly names the spans that must be visible in Jaeger for two specific flows. This is the rare case where every NFR earned its place.

### Findings

- _None at this severity._ Substance bar holds.

---

## Strategic coherence — strong

The thesis is stated in §1.1 ("portfolio-grade rewrite, audience = senior reviewer in 5–15 min lurk") and is felt downstream:

- §1.2 goals 1, 3, 5 all serve recruiter scan; goal 2 (parity) bounds scope to avoid pretending production e-commerce; goal 4 makes the quality bar measurable.
- §5.2 sprint mapping is shape-correct: Week 1 sets up CI gate (NFR-05) before any FR ships, which matches "quality is a gate, not a polish."
- §5.3 names the critical path explicitly through Auth → RBAC → Order → Webhook — the exact chain that, if it slips, kills the demo flow.
- Counter-metric: §1.3 Non-goals is short but dense, and §1.4 Success criteria are 8 binary ✅ conditions — no DAU/MAU vanity.

### Findings

- _None._ Coherent.

---

## Done-ness clarity — strong

Done-ness is the dimension where this PRD is hardest to fault. Every FR I sampled has at least one testable consequence; most have 4–8.

Spot checks:

- **FR-05 (refresh reuse detection)** AC1 specifies the exact server response (`401 refresh_reuse_detected`) and the side effect (`status=revoked` on all family rows). AC3 names the audit log fields. Implementable as-is.
- **FR-25 (atomic order)** AC2 names the lock type ("pessimistic"), the table operations in order, and the all-or-nothing contract. AC3 specifies the concurrent-request behavior (1 succeeds, others 409, no over-decrement). AC6 names the rollback contract.
- **FR-32 (webhook idempotency)** specifies the table name and PK semantics (`processed_webhook_events`, PK = `event_id`), the SQL semantics (`ON CONFLICT DO NOTHING`), and the E2E test it must pass.

NFRs have observable thresholds and named verification paths.

### Findings

- **low** FR-50 AC2 underspecifies `userName` semantics relative to FR-50 Notes (§3.6, FR-50) — AC2 says `userName (full name as registered)` but does not state the source field. Notes clarifies (`User.name`). _Fix:_ Hoist the field source into AC2: "`userName` = `User.name` at the time of review submission."
- **low** FR-77 AC4 reconnect strategy duplicates FR-91 AC2 (§3.8 + §3.10) — Both specify "exponential backoff (1s, 5s, 25s)" with overlapping (but slightly different) fallback rules. _Fix:_ Authoritative spec on FR-91 (client-side); FR-77 should reference FR-91 for the policy and keep only the server-side observable.

---

## Scope honesty — strong

§1.3 Non-goals points at the brief rather than re-listing, which is the right move (avoids drift). Every `[OQ-NN]` in §6 has a named decision deadline. §7 explicitly tracks the four assumptions raised during drafting and names each as resolved with the resolving FR/AC.

`[ASSUMPTION]` density in the live document: 1 stray tag (FR-75), which contradicts §7's "no outstanding `[ASSUMPTION]` tags remain" statement. This is mechanical, not substantive — the decision is made; only the tag is wrong.

### Findings

- See FR-75 finding under decision-readiness above; no separate scope-honesty findings beyond that.

---

## Downstream usability — adequate

The PRD will feed Architecture next. Glossary is implicit (terms like `countInStock`, `family_id`, `paypal_order_id`, `processed_webhook_events`, `audit_log` recur consistently in their canonical case). FR/NFR IDs are stable, sparse-numbered, and cross-references resolve. §5.1 dependency block is a real artifact, not a sketch — it lists every cross-FR edge needed to plan sequencing.

Things that hurt downstream usability slightly:

- §8 anomaly coverage table is not sorted (rows go `#A3, #A4, …, #A18, #A19, #A22, #A23, #A24, #A25, #A26, #A27, #A20`). The trailing `#A20` is a continuity hazard for anyone scanning by anomaly ID.
- Stack-name capitalization drift: `NextJS` (§1.1, FR-80) vs `Next.js` (FR-77 AC3). The brief and architecture phase will likely standardize on `Next.js`; resolve now to spare downstream teams a find-and-replace.
- §3.10 header says "FR-90..FR-99" but only two FRs (FR-90, FR-91) live there — fine if intentional (gap reservation), but worth a one-line note ("FR-92..FR-99 reserved for future realtime channels") to prevent confusion.

### Findings

- **medium** Stack-name capitalization drift (§1.1, §3.9 FR-80, FR-77 AC3) — Mixing `NextJS` and `Next.js` reads as inattention. _Fix:_ Standardize on `Next.js` (official capitalization). Apply globally.
- **low** Anomaly table not sorted by ID (§8) — `#A20` row is at the bottom out of order. _Fix:_ Move the `#A20` row into numeric position (between `#A19` and `#A22`).
- **low** §3.10 range header overstates scope (§3.10 header) — Reads "(FR-90..FR-99)" but only FR-90 and FR-91 are defined. _Fix:_ Either trim to "(FR-90..FR-91)" or add a one-line note about reserved IDs.

---

## Shape fit — strong

This is a chain-top PRD (feeds Architecture → stories → code) for a single-author portfolio rewrite. The chosen formality (FR/AC/NFR with stable IDs, dependency graph, sprint mapping, anomaly traceability) matches "Strategic/Pyramid + capability spec" structure model. UJs are appropriately implicit — a single-developer rewrite with no business stakeholder review doesn't earn UJ overhead, and personas justify their presence by anchoring FRs.

Bilingual style (English for technical, Vietnamese for explanatory) is held consistently through all 58 FRs and all 8 NFRs. No section drifts into the wrong register.

### Findings

- _None._ Shape fits.

---

## Mechanical notes

These are cosmetic and downstream-usability adjacent — none drive the verdict.

- **Glossary drift / capitalization**: `NextJS` (§1.1, §3.9 FR-80) vs `Next.js` (FR-77 AC3). Standardize on `Next.js`. Other names (`NestJS`, `MySQL`, `Redis`, `TanStack Query`, `BullMQ`, `OpenTelemetry`, `Jaeger`, `PayPal`, `TypeORM`) are consistent.
- **ID continuity**: 58 FR entries detected (matches expected count). 8 NFR entries (matches). Section §3.10 advertises a wider range than it fills — see finding above.
- **Cross-references**: All FR-NN references that I sampled resolve to defined FRs. FR-78 dependency on FR-62 for delivered email correctly mirrors FR-62's chain. FR-51 dependency list correctly names FR-78 (verified-purchase chain) — this is non-obvious but right.
- **Anomaly index roundtrip**: All 24 in-scope anomalies (`#A3, #A4, #A5, #A6, #A7, #A8, #A9, #A10, #A11, #A12, #A13, #A14, #A15, #A16, #A17, #A18, #A19, #A20, #A22, #A23, #A24, #A25, #A26, #A27`) appear both inline (as `Anomaly fix` lines on FRs/NFRs) and in the §8 table. Three excluded anomalies (`#A1`, `#A2`, `#A21`) are explicitly named in the §8 footnote as "cosmetic, naturally cleaned by greenfield rewrite per brief Section 3.3." Roundtrip clean.
- **YAML frontmatter**: Present, well-formed, `status: draft` correctly preserved.
- **Section numbering 1–9**: All present and in order.
- **Open-items density**: 7 live `[OQ-NN]` entries on a green-light-to-build PRD is at the upper end of acceptable but each has a named owner phase, so not a blocker.

---

## Summary of severity counts

- **Critical**: 0
- **High**: 0
- **Medium**: 2 (FR-75 stale `[ASSUMPTION]` tag; stack-name capitalization drift)
- **Low**: 3 (FR-50 field source hoisting; FR-77/FR-91 reconnect duplication; §8 sort + §3.10 range header)

All findings are autofix-safe. No structural rewrites required. Polish should proceed.
