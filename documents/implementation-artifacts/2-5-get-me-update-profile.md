# Story 2.5 — Get me + update profile

## Status: in-progress

## Story

**As a** signed-in user,
**I want to** view my profile and update my personal information,
**So that** I can manage my account details.

**FR**: FR-06, FR-07
**Risk**: [R-008] (PII leak)
**Size**: 1 day
**Epic**: 2 — Auth + Catalog Read

---

## Acceptance Criteria

### AC1: Get current user

- `GET /api/auth/me` with valid token → 200 returns `{ id, email, name, phone, address, city, avatar, role }`. NO password.

### AC2: Unauthorized

- No token / invalid → 401.

### AC3: Update profile

- `PATCH /api/users/me` with partial body → 200 returns updated user.

### AC4: Protected fields

- Email and role CANNOT be updated via this endpoint (silently ignored or 400).

### AC5: Null semantics

- `{ phone: null }` clears field; `{}` touches nothing; `""` is treated as empty string (not skip).

### AC6: Phone validation

- Phone validation: E.164 or VN local format, max 20 chars.

---

## Definition of Done

- [ ] GET /api/auth/me returns user profile (no password)
- [ ] No token → 401
- [ ] PATCH /api/users/me updates allowed fields
- [ ] Email and role cannot be updated
- [ ] Null clears field, empty object touches nothing
- [ ] Phone validated (max 20 chars)
- [ ] Code compiles and lint passes
