# Story 1.2: NestJS API Bootstrap with ConfigModule + Health Endpoint

Status: ready-for-dev

## Story

As a **developer (Jarvis)**,
I want to bootstrap the NestJS API app with Zod env validation, Pino structured logging, and a health endpoint,
so that subsequent stories have a running API server with fail-fast config and observable health checks.

## Acceptance Criteria

1. `apps/api/src/main.ts` boots NestJS on port from env (default 3001).
2. Zod schema validates required env vars on boot; missing → fail-fast with clear error.
3. `GET /api/health` returns 200 `{ status: 'ok', checks: { db: 'up', redis: 'up', queue: 'up' } }` when all deps healthy.
4. `GET /api/health` returns 503 when MySQL OR Redis unreachable.
5. Pino logger configured with JSON structured output + redact rules for sensitive fields.

## Tasks / Subtasks

- [ ] Task 1: Install NestJS core dependencies (AC: #1)
  - [ ] Install @nestjs/core, @nestjs/common, @nestjs/platform-express, reflect-metadata, rxjs
  - [ ] Install nestjs-pino, pino-http, pino-pretty (dev)
  - [ ] Install zod for env validation
  - [ ] Install @nestjs/terminus for health checks
  - [ ] Create `apps/api/src/main.ts` with NestJS bootstrap
  - [ ] Create `apps/api/src/app.module.ts` root module
  - [ ] Add `npm run dev` script (nest start --watch) and `npm run build` (nest build)
  - [ ] Verify: `npm run build` succeeds in apps/api
- [ ] Task 2: Zod env validation with fail-fast (AC: #2)
  - [ ] Create `apps/api/src/config/env.schema.ts` with Zod schema
  - [ ] Required vars: PORT, NODE_ENV; optional with defaults for DB/Redis (stubs for now)
  - [ ] Create `apps/api/src/config/config.module.ts` using NestJS ConfigModule + custom validate fn
  - [ ] Verify: boot without PORT env → uses default 3001
  - [ ] Verify: boot with invalid env (e.g., PORT=abc) → fail-fast with Zod error message
- [ ] Task 3: Pino structured logger (AC: #5)
  - [ ] Configure nestjs-pino in AppModule with JSON output
  - [ ] Set redact paths: password, accessToken, refreshToken, Authorization, Cookie
  - [ ] Add request ID (X-Request-Id or generated UUID) to every log line
  - [ ] Verify: boot logs show JSON format with level, time, msg, service fields
  - [ ] Verify: request to /api/health produces structured log with requestId
- [ ] Task 4: Health endpoint with stub checks (AC: #3, #4)
  - [ ] Create `apps/api/src/health/health.module.ts`
  - [ ] Create `apps/api/src/health/health.controller.ts` at GET /api/health
  - [ ] Implement health checks: db (stub up), redis (stub up), queue (stub up)
  - [ ] Return 200 `{ status: 'ok', checks: { db: 'up', redis: 'up', queue: 'up' } }`
  - [ ] When any check fails → return 503 `{ status: 'error', checks: {...} }`
  - [ ] Note: real DB/Redis checks come in Story 1.3/1.7; stubs return 'up' for now
- [ ] Task 5: Global prefix + verify end-to-end (AC: #1-#5)
  - [ ] Set global prefix `/api` in main.ts
  - [ ] Verify: `curl localhost:3001/api/health` → 200 JSON response
  - [ ] Verify: Pino logs show structured JSON on request
  - [ ] Verify: missing required env → app crashes with clear Zod error

## Dev Notes

### Architecture Compliance

- **Global prefix**: `/api` (architecture §6.1)
- **Module structure**: `apps/api/src/modules/` for domain modules; `health/` at src root level (cross-cutting)
- **Config pattern**: NestJS ConfigModule with Zod validation (architecture §2.3, §8.3.2)
- **Logger**: nestjs-pino (Pino) with JSON structured output (architecture §8.3.2)
- **Health**: @nestjs/terminus pattern (NFR-03 AC5)

### Pino Redact Rules (PRD FR-09 AC4, NFR-02 AC7)

```typescript
redact: [
  'password',
  'accessToken',
  'refreshToken',
  'req.headers.authorization',
  'req.headers.cookie',
];
```

### Env Schema Shape

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  // DB/Redis vars will be added in Story 1.3/1.7 — stubs for now
});
```

### Anti-Patterns to Avoid

- ❌ Do NOT use `@nestjs/config` alone — wrap with Zod validation for fail-fast
- ❌ Do NOT use `console.log` — Pino only (ESLint no-console enforces this)
- ❌ Do NOT add TypeORM/Redis connections yet — those are Story 1.3/1.4/1.7
- ❌ Do NOT add auth guards yet — Story 2.4
- ❌ Do NOT use `synchronize: true` for TypeORM (not even as placeholder)

### Library Versions

| Package                  | Version | Notes                       |
| ------------------------ | ------- | --------------------------- |
| @nestjs/core             | ^10.x   | Latest stable NestJS 10     |
| @nestjs/common           | ^10.x   | Matches core                |
| @nestjs/platform-express | ^10.x   | Express adapter             |
| @nestjs/terminus         | ^10.x   | Health checks               |
| nestjs-pino              | ^4.x    | Pino integration for NestJS |
| pino-http                | ^10.x   | HTTP request logging        |
| pino-pretty              | ^11.x   | Dev-only pretty printing    |
| zod                      | ^3.x    | Env validation              |
| reflect-metadata         | ^0.2.x  | NestJS decorator support    |
| rxjs                     | ^7.x    | NestJS dependency           |

### References

- [Source: architecture.md §3.2 — apps/api structure]
- [Source: architecture.md §8.3.2 — Pino structured logging]
- [Source: architecture.md §6.2.9 — Health endpoint]
- [Source: PRD FR-09 AC4 — Pino redact rules]
- [Source: PRD NFR-02 AC7 — Logger redact fields]
- [Source: PRD NFR-02 AC8 — Env validation Zod fail-fast]
- [Source: PRD NFR-03 AC5 — Health endpoint 200/503]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Completion Notes List

(to be filled after implementation)

### File List

(to be filled after implementation)
