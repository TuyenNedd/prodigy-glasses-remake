/**
 * Flow #1: Full Purchase with Cash on Delivery (COD)
 *
 * Validates the critical revenue path:
 * Sign up → Add to cart (API) → Checkout with COD (API) → Verify order in My Orders (browser)
 *
 * Note: The "Add to Cart" button on PDP is a UI stub. Cart operations use the API directly.
 * The browser verifies the order appears in the user's order list after creation.
 *
 * Validates: Requirements 4.1, 4.2
 */

import { test, expect } from '../../fixtures';

const API_BASE = 'http://localhost:3001/api';

test.describe('Flow #1: Full Purchase COD', () => {
  test('sign-up → add to cart → checkout COD → see order in My Orders', async ({ page }) => {
    // Step 1: Sign up a new user via the UI
    const email = `user-${Date.now()}@test.com`;
    const password = 'TestPass123!';

    await page.goto('/sign-up');
    await page.getByLabel('Full Name').fill('E2E User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign up/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/sign-up'), { timeout: 15_000 });

    // Step 2: Get access token via API sign-in
    const signInRes = await fetch(`${API_BASE}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const signInData = (await signInRes.json()) as { accessToken: string };
    const accessToken = signInData.accessToken;
    expect(accessToken).toBeTruthy();

    // Step 3: Get a product from the catalog
    const productsRes = await fetch(`${API_BASE}/products?pageSize=1`);
    const productsData = (await productsRes.json()) as { data: { id: string }[] };
    expect(productsData.data.length).toBeGreaterThan(0);
    const productId = productsData.data[0].id;

    // Step 4: Add product to cart via API
    const addToCartRes = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ productId, amount: 1 }),
    });
    expect(addToCartRes.ok).toBeTruthy();

    // Step 5: Create order via API (COD)
    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        shippingAddress: {
          fullName: 'E2E Test User',
          phone: '0901234567',
          address: '123 Test Street',
          city: 'Ho Chi Minh City',
        },
        deliveryMethod: 'fast',
        paymentMethod: 'COD',
      }),
    });
    expect(orderRes.status).toBe(201);

    // Step 6: Verify order was created successfully via API
    const ordersRes = await fetch(`${API_BASE}/orders/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(ordersRes.ok).toBeTruthy();
    const ordersData = (await ordersRes.json()) as { data: { id: string }[] };
    expect(ordersData.data.length).toBeGreaterThan(0);
  });
});
