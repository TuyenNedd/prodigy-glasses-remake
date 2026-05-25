# Story 2.1 — User Entity + Sign-Up Endpoint

## Status: done

## Story

**As a** visitor to Prodigy Glasses,
**I want to** create an account with my email and password,
**So that** I can access authenticated features like cart, orders, and profile management.

**FR**: FR-01, FR-09
**Risk**: [R-008] (PII leak), [R-009] (token storage)
**Size**: 2 days
**Epic**: 2 — Auth + Catalog Read

---

## Acceptance Criteria (BDD)

### AC1: Successful sign-up returns user + access token

```gherkin
Given a valid sign-up body { email, password, name }
When POST /api/auth/sign-up is called
Then response is 201 with { user: { id, email, name, role }, accessToken }
```

### AC2: Password never in response

```gherkin
Given any sign-up or user-related response
When the response body is serialized
Then the "password" field NEVER appears (TypeORM select: false + DTO mapper)
```

### AC3: Validation errors

```gherkin
Given invalid email format
When POST /api/auth/sign-up
Then 400 with validation error

Given password < 8 characters
When POST /api/auth/sign-up
Then 400 with validation error

Given email already registered
When POST /api/auth/sign-up
Then 409 with error code "email_already_registered"
```

### AC4: Phone stored as string

```gherkin
Given phone "+84901234567" or "0901234567"
When user is created
Then phone is stored as-is (string, leading zeros preserved)
```

### AC5: Password hashed with bcrypt

```gherkin
Given a valid sign-up request
When user is persisted
Then password is hashed with bcrypt cost ≥ 10
And raw password is never logged (Pino redact active)
```

### AC6: Refresh token in cookie only

```gherkin
Given successful sign-up
When response is sent
Then Set-Cookie header contains: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth
```

### AC7: No refresh token in JSON body

```gherkin
Given successful sign-up
When response JSON is inspected
Then no "refreshToken" or "refresh_token" field exists in body
```

---

## Technical Requirements

### Architecture Compliance

- **Module**: `AuthModule` under `apps/api/src/modules/auth/`
- **Dependencies**: AuthModule → CommonModule (config, logger, filters)
- **Pattern**: NestJS modular monolith — controller → service → repository (TypeORM)
- **Database**: MySQL 8 via TypeORM, `users` table already created by migration `1716480000000`
- **Hashing**: bcrypt with cost factor ≥ 10 (package `bcrypt` already in dependencies)
- **Validation**: Zod schemas from `@prodigy/shared-types` for DTO validation
- **Logging**: Pino via `nestjs-pino` (already configured in AppModule with redact rules)

### User Entity Schema (from architecture §5.2.1)

| Column    | Type          | Constraints               | Default | Notes              |
| --------- | ------------- | ------------------------- | ------- | ------------------ |
| id        | char(36)      | PK, UUID v4               | uuid    |                    |
| email     | varchar(255)  | NOT NULL, UNIQUE          |         |                    |
| password  | varchar(60)   | NOT NULL, `select: false` |         | bcrypt cost ≥10    |
| name      | varchar(120)  | NOT NULL                  |         |                    |
| phone     | varchar(20)   | NULL                      | NULL    | String, not Number |
| address   | varchar(255)  | NULL                      |         |                    |
| city      | varchar(120)  | NULL                      |         |                    |
| avatar    | varchar(2048) | NULL                      |         | URL-validated      |
| role      | enum          | NOT NULL                  | 'USER'  | USER, ADMIN        |
| deletedAt | datetime      | NULL                      | NULL    | Soft-delete        |
| createdAt | datetime      | NOT NULL                  | now     |                    |
| updatedAt | datetime      | NOT NULL                  | now     |                    |

### Refresh Token Schema (from architecture §5.2.2)

| Column     | Type     | Constraints   | Default  | Notes                          |
| ---------- | -------- | ------------- | -------- | ------------------------------ |
| id         | char(36) | PK = JWT jti  |          |                                |
| user_id    | char(36) | FK → users.id |          |                                |
| family_id  | char(36) | NOT NULL      |          | Same UUID for entire chain     |
| parent_id  | char(36) | NULL, FK self | NULL     | Previous JTI in rotation chain |
| status     | enum     | NOT NULL      | 'active' | active, rotated, revoked       |
| expires_at | datetime | NOT NULL      |          |                                |
| created_at | datetime | NOT NULL      | now      |                                |

### JWT Configuration

- **Access token**: TTL 15min, payload `{ sub, role, jti, iat, exp }` — NO email, NO name
- **Refresh token**: TTL 7 days, httpOnly Secure SameSite=Strict cookie, `Path=/api/auth`
- **Secret**: from env vars `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

### File Structure Requirements

```
apps/api/src/modules/auth/
├── auth.module.ts              # NestJS module declaration
├── auth.controller.ts          # POST /auth/sign-up endpoint
├── auth.service.ts             # Business logic: hash, create user, generate tokens
├── strategies/                 # (placeholder for future JWT strategy)
├── guards/                     # (placeholder for future guards)
├── dto/
│   ├── sign-up.dto.ts          # Zod-validated DTO
│   └── user-response.dto.ts    # Response projection (no password)
└── entities/
    ├── user.entity.ts          # TypeORM entity
    └── refresh-token.entity.ts # TypeORM entity
```

### Library & Framework Requirements

| Library          | Version | Purpose                                   |
| ---------------- | ------- | ----------------------------------------- |
| @nestjs/jwt      | latest  | JWT sign/verify                           |
| @nestjs/passport | latest  | Auth strategy framework                   |
| passport         | latest  | Core passport                             |
| passport-jwt     | latest  | JWT strategy                              |
| bcrypt           | ^6.0.0  | Already installed — password hashing      |
| class-validator  | latest  | Pipe validation (or use Zod pipe)         |
| uuid             | latest  | UUID v4 generation (or crypto.randomUUID) |

**Note**: Prefer `crypto.randomUUID()` (Node.js built-in) over `uuid` package. Use Zod validation pipe pattern over class-validator if consistent with shared-types approach.

### Environment Variables (add to env.schema.ts)

```typescript
JWT_ACCESS_SECRET: z.string().min(32),
JWT_REFRESH_SECRET: z.string().min(32),
JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(10),
```

### Cookie Configuration

```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // false in dev for localhost
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}
```

---

## Dev Notes & Guardrails

### CRITICAL — Do NOT:

1. **Do NOT** put refresh token in JSON response body
2. **Do NOT** expose password in any response (use TypeORM `select: false` + DTO projection)
3. **Do NOT** store access token in cookie — it goes in JSON response only (client stores in memory)
4. **Do NOT** log raw passwords (Pino redact already configured for 'password' path)
5. **Do NOT** use `localStorage` for tokens on frontend (future story concern)
6. **Do NOT** create new migrations — tables already exist from Story 1.4

### MUST:

1. **MUST** use `crypto.randomUUID()` for user ID and token JTI generation
2. **MUST** validate email uniqueness and return 409 with `email_already_registered` error code
3. **MUST** use bcrypt with cost ≥ 10 (configurable via env)
4. **MUST** set refresh cookie with `Path=/api/auth` (architecture ADR-04)
5. **MUST** register AuthModule in AppModule imports
6. **MUST** register DatabaseModule in AppModule if not already (it's defined but not imported)
7. **MUST** add `@nestjs/jwt` and `@nestjs/passport` to package.json dependencies

### Error Response Format

Follow consistent error shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Email không hợp lệ" }]
}
```

For 409 conflict:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "email_already_registered",
  "message": "Email đã được đăng ký"
}
```

### Existing Code Context

- **AppModule** (`app.module.ts`): Currently imports ConfigModule, RedisModule, LoggerModule, HealthModule. Does NOT import DatabaseModule yet — **must add it**.
- **DatabaseModule** (`database/database.module.ts`): Already configured with TypeORM forRootAsync + autoLoadEntities. Just needs to be imported.
- **Env schema** (`config/env.schema.ts`): Needs JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, BCRYPT_SALT_ROUNDS additions.
- **Shared types** (`packages/shared-types`): Already has `signUpSchema` with email, password, name, phone validation + Vietnamese error messages.
- **Migrations**: All 10 migrations exist. `users` and `refresh_tokens` tables ready.
- **bcrypt**: Already in dependencies (`^6.0.0`).

### Testing Approach (for future verification)

- Unit test: AuthService.signUp — mock repository, verify bcrypt called, verify response shape
- Integration test: POST /api/auth/sign-up with valid/invalid bodies against real DB (testcontainers)
- Verify: password not in response, cookie set correctly, 409 on duplicate email

---

## Previous Story Intelligence

**Story 1.7** (OpenTelemetry + Redis module) established:

- Redis module using `@nestjs-modules/ioredis` pattern
- OTel initialized before NestJS bootstrap in `main.ts`
- Health module pattern with dependency checks
- Pino logger with redact rules already active

**Key patterns from Epic 1:**

- Zod for env validation (not class-validator for env)
- Global prefix `api` set in `main.ts`
- Swagger already configured
- No modules directory exists yet — this story creates the first domain module

---

## Definition of Done

- [x] User entity created with TypeORM decorators matching schema
- [x] RefreshToken entity created with TypeORM decorators
- [x] AuthModule with controller, service registered in AppModule
- [x] DatabaseModule imported in AppModule
- [x] POST /api/auth/sign-up returns 201 with user + accessToken
- [x] Password never in response (select: false + DTO)
- [x] Email validation → 400, password < 8 → 400, duplicate → 409
- [x] bcrypt hash with cost ≥ 10
- [x] Refresh token set via HttpOnly Secure cookie at Path=/api/auth
- [x] No refresh token in JSON body
- [x] JWT env vars added to env.schema.ts
- [x] @nestjs/jwt and @nestjs/passport added to dependencies
- [x] Code compiles without errors (`npm run build` in apps/api)
