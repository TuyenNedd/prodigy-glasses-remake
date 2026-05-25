# Story 1.3: Docker Compose Stack (MySQL + Redis + Jaeger + Mailhog)

Status: ready-for-dev

## Story

As a **developer (Jarvis)**,
I want a Docker Compose stack with MySQL, Redis, Jaeger, and Mailhog,
so that all infrastructure dependencies run locally with one command and health checks are verifiable.

## Acceptance Criteria

1. `docker compose up` starts all 4 services + API app healthy within 60s.
2. MySQL container has healthcheck (`mysqladmin ping`); Redis has `redis-cli ping`.
3. Jaeger UI accessible at `localhost:16686`.
4. Mailhog UI accessible at `localhost:8025`.
5. `.env.example` documents all required env vars with placeholder values.
6. `docker-compose.test.yml` exists for ephemeral test stack (separate ports).

## Tasks / Subtasks

- [ ] Task 1: Create docker-compose.yml with all services (AC: #1, #2, #3, #4)
  - [ ] MySQL 8 service with healthcheck, volume, env vars
  - [ ] Redis 7 service with healthcheck
  - [ ] Jaeger all-in-one service (ports 16686 UI, 4317 OTLP gRPC)
  - [ ] Mailhog service (ports 1025 SMTP, 8025 UI)
  - [ ] API service (build from apps/api, depends_on with health conditions)
  - [ ] Network: single bridge network for all services
- [ ] Task 2: Create Dockerfile for API app (AC: #1)
  - [ ] Multi-stage build: build stage + production stage
  - [ ] Use node:20-alpine as base
  - [ ] Copy workspace root + apps/api + packages/shared-types
  - [ ] Build NestJS in build stage, run dist/main.js in prod stage
- [ ] Task 3: Create .env.example (AC: #5)
  - [ ] Document all env vars: PORT, NODE*ENV, DB*\_, REDIS\_\_, CORS\_\*, JWT secrets placeholders
  - [ ] Add comments explaining each var
  - [ ] Create .env from .env.example for local dev (gitignored)
- [ ] Task 4: Create docker-compose.test.yml (AC: #6)
  - [ ] MySQL on port 3307 (avoid collision with dev)
  - [ ] Redis on port 6380
  - [ ] No Jaeger/Mailhog (not needed for tests)
  - [ ] Ephemeral: no volumes (fresh state each run)
- [ ] Task 5: Update API health endpoint for real DB/Redis checks (AC: #1)
  - [ ] Update health controller to accept injectable check functions
  - [ ] For now: still stub (real connections in Story 1.4/1.7)
  - [ ] Add NODE_ENV and engines field to API package.json
- [ ] Task 6: Verify end-to-end (AC: #1-#6)
  - [ ] `docker compose up -d` → all services healthy within 60s
  - [ ] `curl localhost:3001/api/health` → 200
  - [ ] Jaeger UI at localhost:16686 → loads
  - [ ] Mailhog UI at localhost:8025 → loads
  - [ ] `docker compose -f docker-compose.test.yml up -d` → MySQL + Redis on alt ports
  - [ ] `docker compose down` cleans up

## Dev Notes

### Architecture Compliance

- Docker Compose structure per architecture §3.1 high-level component view
- Services: MySQL 8, Redis 7, Jaeger all-in-one, Mailhog (architecture §3.1)
- API port: 3001 (architecture §3.1)
- Web port: 3000 (not in this story — Story 1.5)
- OTLP export: gRPC port 4317 to Jaeger (architecture §8.3.1)
- Mailhog SMTP: port 1025 (architecture §5, notification module)

### Docker Compose Service Config

```yaml
# Key decisions:
# - MySQL 8.0 (not 8.4) for stability
# - Redis 7-alpine for small image
# - Jaeger all-in-one (includes collector + query + UI)
# - Mailhog for dev email capture
# - API depends_on with service_healthy condition
```

### .env.example Shape

```bash
# App
PORT=3001
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=prodigy
DB_PASSWORD=prodigy_secret
DB_DATABASE=prodigy_glasses

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT (placeholders — real values in Story 2.1)
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret

# PayPal (placeholders — real values in Story 3.4)
PAYPAL_CLIENT_ID=placeholder
PAYPAL_CLIENT_SECRET=placeholder
PAYPAL_WEBHOOK_ID=placeholder

# Email (Mailhog in dev)
SMTP_HOST=localhost
SMTP_PORT=1025
```

### Anti-Patterns to Avoid

- ❌ Do NOT use `latest` tag for any Docker image — pin major.minor
- ❌ Do NOT expose MySQL/Redis ports to 0.0.0.0 in production — dev only
- ❌ Do NOT put secrets in docker-compose.yml — use .env file
- ❌ Do NOT use `restart: always` — use `unless-stopped` for dev
- ❌ Do NOT add web (Next.js) service yet — that's Story 1.5

### References

- [Source: architecture.md §3.1 — High-level component view]
- [Source: architecture.md §3.2 — docker/ folder structure]
- [Source: architecture.md §8.3.1 — OTel → Jaeger port 4317]
- [Source: PRD NFR-03 AC5 — Health endpoint 200/503]
- [Source: PRD NFR-04 AC2 — Traces export to Jaeger local]
- [Source: brief §4.3 Week 1 — Docker Compose stack]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Completion Notes List

(to be filled after implementation)

### File List

(to be filled after implementation)
