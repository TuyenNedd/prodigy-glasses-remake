/**
 * Flow #3: Admin Marks Order as Delivered
 *
 * Validates the fulfillment workflow via API:
 * Create order → Admin marks as delivered → Verify status change in admin page
 *
 * Note: The admin orders page is read-only (no action buttons).
 * This test uses the API to perform the delivery action and verifies
 * the status is reflected in the admin orders page.
 *
 * Validates: Requirements 6.1, 6.2
 */

import { test, expect } from '../../fixtures';
import { ensureAdminUser, ensureProduct } from '../../helpers/seed';

const API_BASE = 'http://localhost:3001/api';

test.describe('Flow #3: Admin Marks Order Delivered', () => {
  test('create order → admin marks delivered via API → status reflected in admin page', async ({
    adminPage,
  }) => {
    // Step 1: Create a user and order via API
    const timestamp = Date.now();
    const email = `order-user-${timestamp}@e2e-test.com`;
    const password = 'TestPass123!';

    const signUpRes = await fetch(`${API_BASE}/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Order User' }),
    });
    expect(signUpRes.ok).toBeTruthy();
    const { accessToken: userToken } = (await signUpRes.json()) as { accessToken: string };

    // Add product to cart
    const product = await ensureProduct();
    await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ productId: product.id, amount: 1 }),
    });

    // Create order
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        shippingAddress: {
          fullName: 'Order User',
          phone: '0901234567',
          address: '123 Test St',
          city: 'Ho Chi Minh',
        },
        deliveryMethod: 'fast',
        paymentMethod: 'COD',
      }),
    });
    expect(orderRes.status).toBe(201);
    const { orderId } = (await orderRes.json()) as { orderId: string };
    expect(orderId).toBeTruthy();

    // Step 2: Admin marks order as delivered via API
    const { email: adminEmail, password: adminPassword } = await ensureAdminUser();
    const adminSignIn = await fetch(`${API_BASE}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const { accessToken: adminToken } = (await adminSignIn.json()) as { accessToken: string };

    const deliverRes = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isDelivered: true }),
    });
    expect(deliverRes.status).toBe(200);

    // Step 3: Navigate to admin orders page and verify status
    await adminPage.goto('/admin-orders');
    await adminPage.waitForLoadState('networkidle');

    // Find the order row and verify DELIVERED status
    const shortId = orderId.slice(0, 8);
    const orderRow = adminPage.getByRole('row').filter({ hasText: `#${shortId}` });
    await expect(orderRow).toBeVisible({ timeout: 10_000 });
    await expect(orderRow.getByText('DELIVERED')).toBeVisible();
  });
});
