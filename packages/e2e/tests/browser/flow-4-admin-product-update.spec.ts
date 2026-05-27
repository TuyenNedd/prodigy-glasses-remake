/**
 * Flow #4: Admin Updates Product (Cache Invalidation)
 *
 * Validates that admin product updates are reflected immediately:
 * Admin updates product via API → Public products page shows new data
 *
 * Note: The admin products page is read-only (display table only).
 * This test uses the API to update the product and verifies the change
 * is visible on the public products page.
 *
 * Validates: Requirements 7.1, 7.2
 */

import { test, expect } from '../../fixtures';
import { ensureAdminUser, ensureProduct } from '../../helpers/seed';

const API_BASE = 'http://localhost:3001/api';

test.describe('Flow #4: Admin Updates Product', () => {
  test('admin updates product via API → public page reflects change immediately', async ({
    page,
  }) => {
    // Step 1: Get admin token and a product
    const { email: adminEmail, password: adminPassword } = await ensureAdminUser();
    const adminSignIn = await fetch(`${API_BASE}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const { accessToken: adminToken } = (await adminSignIn.json()) as { accessToken: string };

    const product = await ensureProduct();
    const timestamp = Date.now();
    const updatedName = `E2E Updated ${timestamp}`;

    // Step 2: Update product name via admin API
    const updateRes = await fetch(`${API_BASE}/admin/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: updatedName }),
    });
    expect(updateRes.status).toBe(200);

    // Step 3: Navigate to public products page and verify updated name is visible
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // The updated product name should appear on the page
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 15_000 });
  });
});
