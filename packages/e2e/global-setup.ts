/* eslint-disable no-console */
import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';

const API_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:3000';

const ADMIN_EMAIL = 'admin@e2e-test.com';
const ADMIN_PASSWORD = 'Admin123!@#';

/**
 * Waits for a URL to return a 2xx response with exponential backoff.
 */
async function waitForHealthy(url: string, timeout = 120_000): Promise<void> {
  const start = Date.now();
  let interval = 2_000;

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.5, 10_000);
  }

  throw new Error(
    `Service at ${url} did not become healthy within ${timeout / 1000}s. ` +
      `Ensure the Docker E2E stack is running.`,
  );
}

/**
 * Seeds the database with catalog data and admin user using docker exec.
 * This runs inside the API container where all dependencies are available.
 */
function seedViaDockerExec(): void {
  try {
    // Run seed-catalog inside the API container
    execSync(
      "docker exec prodigy-api-e2e node -e \"require('reflect-metadata'); require('./apps/api/dist/database/seed-catalog')\"",
      { stdio: 'pipe', timeout: 60_000 },
    );
    console.log('[global-setup] ✅ Catalog seeded');
  } catch {
    console.log('[global-setup] ⚠️ Seed skipped (may already exist or script unavailable)');
  }
}

/**
 * Creates admin user via sign-up API, then promotes via docker exec SQL.
 */
async function createAdminUser(): Promise<void> {
  // Sign up
  const signUpRes = await fetch(`${API_BASE}/api/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'E2E Admin' }),
  });

  if (signUpRes.status === 409) {
    console.log('[global-setup] Admin user already exists');
  } else if (signUpRes.ok) {
    console.log('[global-setup] Admin user created');
  } else {
    const body = await signUpRes.text();
    throw new Error(`[global-setup] Failed to create admin (${signUpRes.status}): ${body}`);
  }

  // Promote to ADMIN role via docker exec
  try {
    execSync(
      `docker exec prodigy-mysql-e2e mysql -uprodigy_e2e -pe2e_secret prodigy_glasses_e2e -e "UPDATE users SET role='ADMIN' WHERE email='${ADMIN_EMAIL}';"`,
      { stdio: 'pipe', timeout: 10_000 },
    );
    console.log('[global-setup] ✅ Admin user promoted');
  } catch {
    console.warn('[global-setup] ⚠️ Could not promote admin via mysql — may already be admin');
  }
}

/**
 * Playwright global setup — runs once before all tests.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('[global-setup] Waiting for services to be healthy...');

  await waitForHealthy(`${API_BASE}/api/health`, 120_000);
  console.log('[global-setup] ✅ API is healthy');

  await waitForHealthy(WEB_BASE, 60_000);
  console.log('[global-setup] ✅ Web is healthy');

  // Seed catalog data
  seedViaDockerExec();

  // Create and promote admin user
  await createAdminUser();

  // Store credentials for test fixtures
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;

  console.log('[global-setup] ✅ Global setup complete');
}

export default globalSetup;
