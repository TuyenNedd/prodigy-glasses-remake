/* eslint-disable no-console */
import type { FullConfig } from '@playwright/test';

const API_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:3000';

/**
 * Admin credentials seeded by migration 1716480900000-seed-admin-user.
 * Password defaults to 'Admin@123456' unless ADMIN_SEED_PASSWORD is set.
 */
const SEEDED_ADMIN_EMAIL = 'admin@prodigy-glasses.local';
const SEEDED_ADMIN_PASSWORD = 'Admin@123456';

/**
 * Waits for a URL to return a 2xx response with exponential backoff.
 * Polls every 2s initially, increasing interval up to max 60s total.
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
 * Playwright global setup — runs once before all tests.
 *
 * The API container handles migrations and seeding via its entrypoint script.
 * This setup only needs to:
 * 1. Wait for API and Web services to be healthy (implies migrations + seed done)
 * 2. Store admin credentials in process.env for test fixtures
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('[global-setup] Waiting for services to be healthy...');

  // Step 1: Wait for API (health check passes only after migrations + seed complete)
  await waitForHealthy(`${API_BASE}/api/health`, 120_000);
  console.log('[global-setup] ✅ API is healthy');

  // Step 2: Wait for Web
  await waitForHealthy(WEB_BASE, 60_000);
  console.log('[global-setup] ✅ Web is healthy');

  // Step 3: Verify admin user can sign in (seeded by migration)
  const signInResponse = await fetch(`${API_BASE}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SEEDED_ADMIN_EMAIL,
      password: SEEDED_ADMIN_PASSWORD,
    }),
  });

  if (!signInResponse.ok) {
    console.warn(
      `[global-setup] ⚠️ Admin sign-in failed (${signInResponse.status}) — admin tests may fail`,
    );
  } else {
    console.log('[global-setup] ✅ Admin user verified');
  }

  // Step 4: Store admin credentials in env for test fixtures
  process.env.ADMIN_EMAIL = SEEDED_ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = SEEDED_ADMIN_PASSWORD;

  console.log('[global-setup] ✅ Global setup complete');
}

export default globalSetup;
