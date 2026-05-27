/**
 * Custom Playwright test fixtures for Prodigy Glasses E2E tests.
 *
 * Provides pre-authenticated Page and APIRequestContext instances
 * for regular users, admin users, and anonymous access.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { test as base, type Page, type APIRequestContext } from '@playwright/test';

export { expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';
const WEB_BASE = 'http://localhost:3000';

interface TestFixtures {
  /** Authenticated browser page for a regular user */
  authenticatedPage: Page;
  /** Authenticated browser page for an admin user */
  adminPage: Page;
  /** API request context with user auth */
  userRequest: APIRequestContext;
  /** API request context with admin auth */
  adminRequest: APIRequestContext;
  /** Unauthenticated API request context */
  anonRequest: APIRequestContext;
}

/**
 * Signs up a new user via the API and returns credentials + access token.
 * Uses a timestamp-suffixed email for isolation between parallel tests.
 */
async function signUpUser(): Promise<{
  email: string;
  password: string;
  name: string;
  accessToken: string;
}> {
  const timestamp = Date.now();
  const email = `e2e-user-${timestamp}@test.com`;
  const password = 'TestPass123!';
  const name = 'E2E Test User';

  const response = await fetch(`${API_BASE}/api/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[fixtures] Sign-up failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return { email, password, name, accessToken: data.accessToken };
}

/**
 * Signs in an existing user via the API and returns the access token.
 */
async function signInUser(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[fixtures] Sign-in failed for ${email} (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

/**
 * Authenticates a browser page by navigating to the sign-in page
 * and filling the form. This sets up the Zustand auth store in the browser.
 */
async function authenticatePageViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${WEB_BASE}/sign-in`);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation away from sign-in page (redirect to home)
  await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
    timeout: 10_000,
  });
}

export const test = base.extend<TestFixtures>({
  /**
   * Provides an authenticated browser page for a newly created regular user.
   * Signs up a unique user via API, then authenticates the browser via the UI.
   */
  authenticatedPage: async ({ page }, use) => {
    const { email, password } = await signUpUser();
    await authenticatePageViaUI(page, email, password);
    await use(page);
  },

  /**
   * Provides an authenticated browser page for the admin user.
   * Uses admin credentials from environment (set by global-setup).
   */
  adminPage: async ({ page }, use) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        '[fixtures] ADMIN_EMAIL or ADMIN_PASSWORD not set. ' +
          'Ensure global-setup has run before tests.',
      );
    }

    await authenticatePageViaUI(page, adminEmail, adminPassword);
    await use(page);
  },

  /**
   * Provides an APIRequestContext authenticated as a regular user.
   * Creates a new user with a unique email for test isolation.
   */
  userRequest: async ({ playwright }, use) => {
    const { accessToken } = await signUpUser();

    const context = await playwright.request.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await use(context);
    await context.dispose();
  },

  /**
   * Provides an APIRequestContext authenticated as the admin user.
   */
  adminRequest: async ({ playwright }, use) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        '[fixtures] ADMIN_EMAIL or ADMIN_PASSWORD not set. ' +
          'Ensure global-setup has run before tests.',
      );
    }

    const accessToken = await signInUser(adminEmail, adminPassword);

    const context = await playwright.request.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await use(context);
    await context.dispose();
  },

  /**
   * Provides an unauthenticated APIRequestContext (no auth headers).
   */
  anonRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: API_BASE,
    });

    await use(context);
    await context.dispose();
  },
});
