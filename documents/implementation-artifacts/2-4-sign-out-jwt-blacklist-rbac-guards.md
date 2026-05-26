# Story 2.4 — Sign-out + JWT blacklist + RBAC guards

## Status: done

## Story

**As a** signed-in user,
**I want to** sign out and have my tokens invalidated,
**So that** no one can use my old tokens after I leave.

**As a** developer,
**I want** global JWT auth guard + RBAC roles guard,
**So that** all endpoints are protected by default with opt-in public access.

**FR**: FR-03, FR-08
**Risk**: [R-005] (RBAC bypass), [R-010] (CORS)
**Size**: 1.5 days
**Epic**: 2 — Auth + Catalog Read

---

## Acceptance Criteria

### AC1: Sign-out clears tokens

- `POST /api/auth/sign-out` → 204. Access JTI added to Redis `auth:blacklist:{jti}` with TTL = remaining token life.

### AC2: Cookie cleared

- Refresh cookie cleared via `Set-Cookie: refresh_token=; Max-Age=0`.

### AC3: Family revoked

- Entire refresh family revoked in DB.

### AC4: Blacklisted token rejected

- After sign-out, using old access token → 401 `token_revoked`.

### AC5: Global JWT guard

- `JwtAuthGuard` registered globally; endpoints without `@Public()` require valid token.

### AC6: RBAC guard

- `@Roles('ADMIN')` + `RolesGuard`: non-admin user → 403 on admin endpoints.

### AC7: CORS

- CORS configured with explicit origin allowlist from env; unknown origin → no ACAO header.

---

## Definition of Done

- [ ] POST /api/auth/sign-out → 204, blacklists JTI in Redis
- [ ] Refresh cookie cleared on sign-out
- [ ] Refresh family revoked in DB on sign-out
- [ ] Blacklisted access token → 401 token_revoked
- [ ] JwtAuthGuard global — all endpoints require auth by default
- [ ] @Public() decorator skips auth
- [ ] @Roles('ADMIN') + RolesGuard → 403 for non-admin
- [ ] Existing public endpoints (health, sign-up, sign-in, refresh) marked @Public
- [ ] Code compiles and lint passes
