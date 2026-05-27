/* eslint-disable no-console */
import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const API_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:3000';
const MONOREPO_ROOT = path.resolve(__dirname, '../..');

/**
 * Waits for a URL to return a 2xx response with exponential backoff.
 * Polls every 2s initially, doubling the interval up to a max of 60s total.
 */
async function waitForHealthy(url: string, timeout = 60_000): Promise<void> {
  const start = Date.now();
  let interval = 2_000;

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Service not ready yet — retry
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.5, 10_000);
  }

  throw new Error(
    `Service at ${url} did not become healthy within ${timeout / 1000}s. ` +
      `Ensure the Docker E2E stack is running: docker compose -f docker/docker-compose.e2e.yml up -d`,
  );
}

/**
 * Executes a shell command synchronously in the monorepo root.
 * Throws with a descriptive error if the command fails.
 */
function execCommand(command: string): void {
  console.log(`[global-setup] Running: ${command}`);
  try {
    execSync(command, {
      cwd: MONOREPO_ROOT,
      stdio: 'pipe',
      timeout: 120_000,
      env: {
        ...process.env,
        DB_HOST: 'localhost',
        DB_PORT: '3308',
        DB_USERNAME: 'prodigy_e2e',
        DB_PASSWORD: 'e2e_secret',
        DB_DATABASE: 'prodigy_glasses_e2e',
      },
    });
  } catch (error) {
    const err = error as { stderr?: Buffer; message?: string };
    const stderr = err.stderr?.toString() || err.message || 'Unknown error';
    throw new Error(`[global-setup] Command failed: ${command}\n${stderr}`);
  }
}

/**
 * Creates an admin user via the sign-up API, then promotes them to admin
 * by running a direct SQL update through the API's database connection.
 * Handles 409 (already exists) gracefully.
 */
async function createAdminUser(creds: {
  email: string;
  password: string;
  name: string;
}): Promise<void> {
  // Step 1: Sign up the user
  const signUpResponse = await fetch(`${API_BASE}/api/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });

  if (signUpResponse.status === 409) {
    console.log('[global-setup] Admin user already exists — skipping creation');
  } else if (signUpResponse.ok) {
    console.log('[global-setup] Admin user created successfully');
  } else {
    const body = await signUpResponse.text();
    throw new Error(
      `[global-setup] Failed to create admin user (${signUpResponse.status}): ${body}`,
    );
  }

  // Step 2: Promote user to ADMIN role via direct DB update
  // Uses the same DB connection env vars as the E2E stack
  const promoteCommand = `npx ts-node -e "
    const mysql = require('mysql2/promise');
    (async () => {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3308,
        user: 'prodigy_e2e',
        password: 'e2e_secret',
        database: 'prodigy_glasses_e2e',
      });
      await conn.execute('UPDATE users SET role = ? WHERE email = ?', ['ADMIN', '${creds.email}']);
      await conn.end();
    })();
  "`;

  const fallbackCommand = `npx ts-node --project apps/api/tsconfig.json -e "
    const mysql = require('mysql2/promise');
    (async () => {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3308,
        user: 'prodigy_e2e',
        password: 'e2e_secret',
        database: 'prodigy_glasses_e2e',
      });
      await conn.execute('UPDATE users SET role = ? WHERE email = ?', ['ADMIN', '${creds.email}']);
      await conn.end();
    })();
  "`;

  try {
    execSync(promoteCommand, {
      cwd: MONOREPO_ROOT,
      stdio: 'pipe',
      timeout: 30_000,
    });
    console.log('[global-setup] Admin user promoted to ADMIN role');
  } catch {
    // Fallback: try via the api workspace where mysql2 is available
    try {
      execSync(fallbackCommand, {
        cwd: MONOREPO_ROOT,
        stdio: 'pipe',
        timeout: 30_000,
      });
      console.log('[global-setup] Admin user promoted to ADMIN role (via api workspace)');
    } catch (fallbackError) {
      console.warn(
        '[global-setup] Could not promote admin via DB — tests requiring admin may need manual setup',
        fallbackError,
      );
    }
  }
}

/**
 * Playwright global setup — runs once before all tests.
 *
 * 1. Waits for API and Web services to be healthy
 * 2. Runs database migrations
 * 3. Seeds catalog data (categories + products)
 * 4. Creates and promotes an admin user
 * 5. Stores admin credentials in process.env for test fixtures
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('[global-setup] Waiting for services to be healthy...');

  // Step 1: Wait for services
  await waitForHealthy(`${API_BASE}/api/health`, 60_000);
  console.log('[global-setup] ✅ API is healthy');

  await waitForHealthy(WEB_BASE, 60_000);
  console.log('[global-setup] ✅ Web is healthy');

  // Step 2: Run database migrations (skip if already applied or command unavailable)
  console.log('[global-setup] Running migrations...');
  try {
    execCommand('npm run migration:run -w @prodigy/api');
    console.log('[global-setup] ✅ Migrations complete');
  } catch {
    console.warn(
      '[global-setup] ⚠️ Migration command failed — assuming migrations are already applied (dev stack running)',
    );
  }

  // Step 3: Seed catalog data (skip if already seeded or command unavailable)
  console.log('[global-setup] Seeding catalog...');
  try {
    execCommand('npm run seed -w @prodigy/api');
    console.log('[global-setup] ✅ Seed complete');
  } catch {
    console.warn(
      '[global-setup] ⚠️ Seed command failed — assuming catalog is already seeded (dev stack running)',
    );
  }

  // Step 4: Create admin user (or use existing one from env)
  const adminCreds = {
    email: process.env.ADMIN_EMAIL || 'admin@e2e-test.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!@#',
    name: 'E2E Admin',
  };

  // Only create a new admin if we're using the default credentials
  if (!process.env.ADMIN_EMAIL) {
    await createAdminUser(adminCreds);
  } else {
    console.log(`[global-setup] Using pre-configured admin: ${adminCreds.email}`);
  }

  // Step 5: Store credentials in env for test fixtures
  process.env.ADMIN_EMAIL = adminCreds.email;
  process.env.ADMIN_PASSWORD = adminCreds.password;

  console.log('[global-setup] ✅ Global setup complete');
}

export default globalSetup;
