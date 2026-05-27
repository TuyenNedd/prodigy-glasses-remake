#!/bin/sh
set -e

echo "[entrypoint] Running migrations..."
node -e "
const { AppDataSource } = require('./apps/api/dist/database/data-source');
AppDataSource.initialize()
  .then(ds => ds.runMigrations())
  .then(() => { console.log('[entrypoint] Migrations complete'); process.exit(0); })
  .catch(e => { console.error('[entrypoint] Migration error:', e.message); process.exit(1); });
"

echo "[entrypoint] Running seed..."
node apps/api/dist/database/seed-catalog.js || echo "[entrypoint] Seed skipped (may already exist)"

echo "[entrypoint] Starting API..."
exec node apps/api/dist/main.js
