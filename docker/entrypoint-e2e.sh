#!/bin/sh

echo "[entrypoint] Running migrations..."
node -e "
require('reflect-metadata');
const { AppDataSource } = require('./apps/api/dist/database/data-source');
AppDataSource.initialize()
  .then(function(ds) { return ds.runMigrations(); })
  .then(function() { console.log('[entrypoint] Migrations complete'); process.exit(0); })
  .catch(function(e) { console.error('[entrypoint] Migration error:', e.message); process.exit(0); });
" || echo "[entrypoint] Migration script exited with error — continuing anyway"

echo "[entrypoint] Running seed..."
node -e "
require('reflect-metadata');
require('./apps/api/dist/database/seed-catalog');
" 2>/dev/null || echo "[entrypoint] Seed skipped (may already exist or not available)"

echo "[entrypoint] Starting API..."
exec node apps/api/dist/main.js
