# Story 2.3 — Refresh token rotation + reuse detection

## Status: done

## Story

**As a** signed-in user,
**I want to** refresh my access token using my refresh cookie,
**So that** I stay authenticated without re-entering credentials, while being protected from token theft.

**FR**: FR-04, FR-05
**Risk**: [R-001] (rotation), [R-016]
**Size**: 2 days
**Epic**: 2 — Auth + Catalog Read

---

## Acceptance Criteria

### AC1: Refresh returns new access token + rotates cookie

- `POST /api/auth/refresh` (cookie only, no body) → 200 returns `{ accessToken }` + new refresh cookie.

### AC2: Old token marked rotated

- Old refresh token marked `status=rotated` in DB; new token has `parent_id = old.jti`.

### AC3: Reuse detection — revoke family

- Replaying a `rotated` token → server sets ALL tokens in family to `revoked` + returns 401 `refresh_reuse_detected`.

### AC4: Family revoked blocks all tokens

- After reuse detection, ANY token in that family → 401 `family_revoked`.

### AC5: Audit log on reuse

- Audit log entry created: `event=refresh_reuse_detected, user_id, family_id, ip, user_agent`.

### AC6: Error cases

- Expired refresh token → 401 `refresh_expired`; missing cookie → 401 `refresh_missing`.

---

## Definition of Done

- [x] POST /api/auth/refresh returns 200 with { accessToken } + new refresh cookie
- [x] Old refresh token status updated to 'rotated' in DB
- [x] New token has parent_id = old token jti
- [x] Replaying rotated token revokes entire family + returns 401
- [x] After family revoke, all tokens in family return 401
- [x] Audit log entry on reuse detection
- [x] Expired token → 401 refresh_expired
- [x] Missing cookie → 401 refresh_missing
- [x] Code compiles and lint passes
