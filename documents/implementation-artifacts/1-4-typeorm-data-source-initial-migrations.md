# Story 1.4: TypeORM Data Source + Initial Migrations

Status: ready-for-dev

## Story

As a **developer (Jarvis)**,
I want TypeORM configured with all 10 initial migrations and a seed admin user,
so that the database schema is version-controlled and reproducible from scratch.

## Acceptance Criteria

1. DataSource config reads from env (host, port, user, password, database).
2. 10 migrations created in order: users, refresh_tokens, categories, products, carts+cart_items, orders+order_items, reviews, processed_webhook_events, audit_logs, seed-admin.
3. `npm run migration:run` executes all migrations without error on fresh DB.
4. `npm run migration:revert` (all) leaves DB in clean state (no tables).
5. Each migration has both `up()` and `down()` methods implemented.
6. Seed admin user created with bcrypt-hashed password from env.
7. All FK constraints, indexes, and CHECK constraints match architecture §5.2.

## Tasks / Subtasks

- [ ] Task 1: Install TypeORM + MySQL driver + bcrypt (AC: #1)
  - [ ] Install typeorm, @nestjs/typeorm, mysql2, bcrypt, @types/bcrypt
  - [ ] Create `apps/api/src/database/data-source.ts` (standalone for CLI)
  - [ ] Create `apps/api/src/database/database.module.ts` (NestJS integration)
  - [ ] Add migration scripts to apps/api/package.json
  - [ ] Verify: TypeORM CLI accessible via `npx typeorm`
- [ ] Task 2: Migration 1 — create-users-table (AC: #2, #5, #7)
  - [ ] Columns: id (UUID PK), email (unique), password (varchar 60), name, phone, address, city, avatar, role (enum USER/ADMIN), deletedAt, createdAt, updatedAt
  - [ ] Indexes: idx_users_role
  - [ ] down() drops table
- [ ] Task 3: Migration 2 — create-refresh-tokens-table (AC: #2, #5, #7)
  - [ ] Columns: id (UUID PK = jti), user_id (FK users), family_id, parent_id (self FK nullable), status (enum active/rotated/revoked), expires_at, created_at
  - [ ] Indexes: idx_rt_family, idx_rt_user_status, idx_rt_expires
  - [ ] down() drops table
- [ ] Task 4: Migration 3 — create-categories-table (AC: #2, #5, #7)
  - [ ] Columns: id (UUID PK), name (unique), slug (unique), createdAt, updatedAt
  - [ ] down() drops table
- [ ] Task 5: Migration 4 — create-products-table (AC: #2, #5, #7)
  - [ ] Columns: id, name, image, imageHover, imageDetail, category_id (FK), price (decimal 12,0), countInStock, discount (0-100), description, rating (decimal 3,2), reviewCount, selled, deletedAt, createdAt, updatedAt
  - [ ] Indexes: idx_products_category, idx_products_name_fulltext, idx_products_price, idx_products_rating, idx_products_deletedAt
  - [ ] CHECK constraints: price >= 0, countInStock >= 0, discount 0-100, rating 0-5
  - [ ] down() drops table
- [ ] Task 6: Migration 5 — create-carts-and-cart-items (AC: #2, #5, #7)
  - [ ] carts: id, user_id (FK unique), createdAt, updatedAt
  - [ ] cart_items: id, cart_id (FK), product_id (FK), amount (CHECK >= 1), createdAt, updatedAt
  - [ ] Unique constraint: uq_cart_product (cart_id, product_id)
  - [ ] down() drops both tables
- [ ] Task 7: Migration 6 — create-orders-and-order-items (AC: #2, #5, #7)
  - [ ] orders: id, user_id (FK), shippingAddress (json), deliveryMethod (enum), paymentMethod (enum), itemsPrice, shippingPrice, totalPrice, paypal_order_id (unique nullable), paypal_amount, paypal_currency, status (enum 5 values), isPaid, paidAt, isDelivered, deliveredAt, createdAt, updatedAt
  - [ ] order_items: id, order_id (FK CASCADE), product_id (FK), nameSnapshot, imageSnapshot, priceSnapshot, discountSnapshot, amount, lineTotal
  - [ ] Indexes: idx_orders_user_status, idx_orders_status_created, idx_order_items_order, idx_order_items_product
  - [ ] down() drops both tables
- [ ] Task 8: Migration 7 — create-reviews-table (AC: #2, #5, #7)
  - [ ] Columns: id, user_id (FK), product_id (FK), content (varchar 1000), star (CHECK 1-5), createdAt, updatedAt
  - [ ] Unique: uq_review_user_product (user_id, product_id)
  - [ ] Index: idx_reviews_product_created
  - [ ] down() drops table
- [ ] Task 9: Migration 8 — create-processed-webhook-events (AC: #2, #5, #7)
  - [ ] Columns: event_id (PK varchar 64), order_id (FK), event_type, payload_summary (json), processed_at
  - [ ] Index: idx_pwe_order
  - [ ] down() drops table
- [ ] Task 10: Migration 9 — create-audit-logs-table (AC: #2, #5, #7)
  - [ ] Columns: id, event, actor_id (nullable), actor_role (enum nullable), target_type, target_id, payload (json), ip, user_agent, createdAt
  - [ ] Indexes: idx_audit_event_created, idx_audit_target, idx_audit_actor
  - [ ] down() drops table
- [ ] Task 11: Migration 10 — seed-admin-user (AC: #2, #5, #6)
  - [ ] Insert admin user with bcrypt-hashed password from env or default
  - [ ] down() deletes the seeded admin user
- [ ] Task 12: Verify full migration cycle (AC: #3, #4)
  - [ ] Start fresh MySQL (docker compose)
  - [ ] `npm run migration:run` → all 10 pass
  - [ ] Verify tables exist with correct schema
  - [ ] `npm run migration:revert` × 10 → clean DB (no tables)

## Dev Notes

### Architecture Compliance

- Schema matches architecture §5.1 ERD and §5.2 entity definitions exactly
- UUID v4 for all PKs (char(36) in MySQL)
- Soft-delete via `deletedAt` on users and products only
- Timestamps: `createdAt`, `updatedAt` on all entities
- TypeORM migration naming: `<timestamp>-<verb-noun>.ts`

### Migration CLI Scripts (apps/api/package.json)

```json
{
  "migration:generate": "typeorm migration:generate -d src/database/data-source.ts",
  "migration:create": "typeorm migration:create",
  "migration:run": "typeorm migration:run -d src/database/data-source.ts",
  "migration:revert": "typeorm migration:revert -d src/database/data-source.ts"
}
```

### DataSource Config Shape

```typescript
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'prodigy',
  password: process.env.DB_PASSWORD || 'prodigy_secret',
  database: process.env.DB_DATABASE || 'prodigy_glasses',
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // NEVER true
});
```

### Anti-Patterns to Avoid

- ❌ NEVER use `synchronize: true` — migrations only
- ❌ Do NOT create entities yet — just raw SQL migrations (entities come with domain modules)
- ❌ Do NOT use auto-increment IDs — UUID v4 only
- ❌ Do NOT skip down() — every migration must be reversible
- ❌ Do NOT hard-code admin password — read from env with fallback

### References

- [Source: architecture.md §5.1 — ERD]
- [Source: architecture.md §5.2 — Entity definitions (all subsections)]
- [Source: architecture.md §5.3 — Migration strategy]
- [Source: PRD NFR-06 AC2 — Migrations versioned]
- [Source: PRD NFR-03 AC4 — Rollback path documented]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Completion Notes List

(to be filled after implementation)

### File List

(to be filled after implementation)
