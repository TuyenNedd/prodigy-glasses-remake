# Story 2.2 — Sign-in + JWT access/refresh token pair

## Status: done

## Story

**As a** registered user,
**I want to** sign in with my email and password,
**So that** I receive an access token for API calls and a refresh token cookie for session persistence.

**FR**: FR-02, FR-04
**Risk**: [R-001] (rotation), [R-009] (localStorage)
**Size**: 1.5 days
**Epic**: 2 — Auth + Catalog Read

---

## Acceptance Criteria

### AC1: Successful sign-in

- `POST /api/auth/sign-in` with correct credentials → 200 returns `{ user, accessToken }` + Set-Cookie refresh.

### AC2: No user enumeration

- Wrong email OR wrong password → 401 `invalid_credentials` (same error for both).

### AC3: Token TTLs

- Access token TTL = 15min; refresh token TTL = 7 days.

### AC4: JWT access payload minimal

- JWT access payload: `{ sub, role, jti, iat, exp }` only — no email, no name.

### AC5: Refresh token persisted

- Refresh token persisted in `refresh_tokens` table with `family_id`, `status=active`.

### AC6: Rate limiting

- Rate limit: max 10 req/min/IP on sign-in endpoint; 11th → 429.

---

## Technical Requirements

### Implementation approach

- Add `signIn` method to existing `AuthService`
- Add `POST /auth/sign-in` endpoint to existing `AuthController`
- Reuse `generateTokenPair()` from story 2.1
- Add rate limiting via a custom guard or throttler module

### Rate Limiting Strategy

- Use `@nestjs/throttler` for rate limiting
- Configure: 10 requests per 60 seconds per IP
- Apply only to sign-in endpoint (not global)

### Files to modify/create

- `apps/api/src/modules/auth/auth.service.ts` — add signIn method
- `apps/api/src/modules/auth/auth.controller.ts` — add sign-in endpoint
- `apps/api/src/modules/auth/dto/sign-in.dto.ts` — new DTO
- `apps/api/src/app.module.ts` — add ThrottlerModule
- `apps/api/src/modules/auth/auth.module.ts` — if throttler guard needed

### Dependencies to add

- `@nestjs/throttler` — rate limiting

---

## Definition of Done

- [x] POST /api/auth/sign-in returns 200 with { user, accessToken } on valid credentials
- [x] Refresh token set via HttpOnly cookie (same as sign-up)
- [x] Wrong email → 401 invalid_credentials
- [x] Wrong password → 401 invalid_credentials (no enumeration)
- [x] Access token payload: { sub, role, jti, iat, exp } only
- [x] Refresh token persisted in DB with family_id
- [x] Rate limit: 10 req/min/IP on sign-in, 11th → 429
- [x] Code compiles and lint passes
