# Prodigy Glasses Remake

> Greenfield rewrite of a MERN e-commerce app → **NestJS modular monolith + Next.js App Router**.
> Portfolio project showcasing fullstack depth: JWT rotation, PayPal webhook idempotency, cache-aside Redis, RSC discipline, and CI quality gates.

## Tech Stack

| Layer         | Technology                                                           |
| ------------- | -------------------------------------------------------------------- |
| Backend       | NestJS 10, TypeORM, MySQL 8, Redis 7, BullMQ                         |
| Frontend      | Next.js (App Router), TanStack Query, Zustand, Tailwind, shadcn/ui   |
| Testing       | Jest, Testcontainers, Playwright                                     |
| Observability | OpenTelemetry → Jaeger, Pino structured logs                         |
| CI            | GitHub Actions (lint → typecheck → unit → integration → E2E → build) |

## Run Locally (< 5 minutes)

### Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 20+
- npm 10+

### Steps

```bash
# 1. Clone
git clone https://github.com/TuyenNedd/prodigy-glasses-remake.git
cd prodigy-glasses-remake

# 2. Environment
cp .env.example .env

# 3. Start infrastructure + API
docker compose -f docker/docker-compose.yml up -d

# 4. Verify
curl http://localhost:3001/api/health
# → {"status":"ok","checks":{"db":"up","redis":"up","queue":"up"}}
```

### Available Services

| Service        | URL                            |
| -------------- | ------------------------------ |
| Web (Frontend) | http://localhost:3000          |
| API (Backend)  | http://localhost:3001/api      |
| Swagger Docs   | http://localhost:3001/api/docs |
| Jaeger UI      | http://localhost:16686         |
| Mailhog UI     | http://localhost:8025          |

### Stop

```bash
docker compose -f docker/docker-compose.yml down
```

## Project Structure

```
prodigy-glasses-remake/
├── apps/
│   ├── api/              # NestJS modular monolith
│   └── web/              # Next.js App Router
├── packages/
│   └── shared-types/     # Zod schemas + TS types (FE↔BE)
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.test.yml
│   └── Dockerfile.api
├── docs/                 # ADRs + architecture (coming soon)
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Run API in watch mode (without Docker)
npm run dev -w @prodigy/api

# Run Web (Next.js) in dev mode
npm run dev -w @prodigy/web

# Run database migrations
npm run migration:run -w @prodigy/api

# Revert last migration
npm run migration:revert -w @prodigy/api

# Lint
npm run lint

# Format check
npm run format:check
```

## Architecture

> Full architecture document: `documents/planning-artifacts/architecture.md`

**Key decisions:**

- Modular monolith over microservices (solo dev, 5-week timebox)
- Single MySQL ACID transaction over Saga for checkout
- Cache-aside Redis with flat namespace + SCAN-DEL invalidation
- JWT access (memory) + refresh rotation cookie with reuse detection
- PayPal webhook idempotency via dedup table
- RSC default + Client Components only at interactivity boundary

## Legacy Anomalies Fixed

> This project fixes 24 security/quality issues from the original MERN codebase.

| #    | Issue                          | Fix                             |
| ---- | ------------------------------ | ------------------------------- |
| #A7  | Open user PII endpoint         | RBAC + DTO projection           |
| #A8  | Open product create            | Admin-only guard                |
| #A9  | Open order detail              | Owner-or-admin guard            |
| #A12 | Refresh token in response body | httpOnly cookie ONLY            |
| #A13 | Tokens in localStorage         | Memory-only access token        |
| #A14 | Auth middleware `===` bug      | Proper assignment               |
| #A16 | No PayPal verification         | Webhook signature + idempotency |
| #A17 | Inline SMTP blocking           | BullMQ async queue              |
| ...  | 16 more                        | See full table in docs          |

## Future Work

- [ ] Microservices extraction (Auth service first)
- [ ] Saga pattern for cross-service transactions
- [ ] CD pipeline (cloud deploy)
- [ ] Elasticsearch for catalog search
- [ ] Product recommendations engine
- [ ] Social auth (Google/Facebook)

## License

MIT
