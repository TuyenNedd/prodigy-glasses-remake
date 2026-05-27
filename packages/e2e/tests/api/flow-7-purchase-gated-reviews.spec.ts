/**
 * Flow #7: Purchase-Gated Reviews
 *
 * Validates that only users with a delivered order containing a specific product
 * can submit a review for that product. Users without a qualifying purchase
 * receive 403 Forbidden with code "purchase_required".
 *
 * Steps:
 * 1. Sign up a fresh user, get a product from the catalog
 * 2. Attempt to POST a review without a purchase → expect 403
 * 3. Add product to cart, create order, admin marks it delivered
 * 4. POST review again → expect 201
 *
 * Validates: Requirements 10.1, 10.2
 */

import { test, expect } from '../../fixtures';
import { ensureAdminUser, ensureProduct } from '../../helpers/seed';

const API_BASE = 'http://localhost:3001';

test.describe('Flow #7: Purchase-Gated Reviews', () => {
  test('user without purchase gets 403 when posting a review', async ({ anonRequest }) => {
    // Sign up a fresh user
    const timestamp = Date.now();
    const email = `e2e-review-nopurchase-${timestamp}@test.com`;
    const password = 'TestPass123!';

    const signUpResponse = await anonRequest.post(`${API_BASE}/api/auth/sign-up`, {
      data: { email, password, name: 'No Purchase User' },
    });
    expect(signUpResponse.status()).toBe(201);
    const { accessToken } = await signUpResponse.json();

    // Get a product from the catalog
    const product = await ensureProduct();

    // Attempt to post a review without having purchased the product
    const reviewResponse = await anonRequest.post(
      `${API_BASE}/api/products/${product.id}/reviews`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { content: 'Great glasses!', star: 5 },
      },
    );

    expect(reviewResponse.status()).toBe(403);
    const body = await reviewResponse.json();
    expect(body.code).toBe('purchase_required');
  });

  test('user with delivered order can post a review (201)', async ({ anonRequest }) => {
    // Step 1: Sign up a fresh user
    const timestamp = Date.now();
    const email = `e2e-review-purchased-${timestamp}@test.com`;
    const password = 'TestPass123!';

    const signUpResponse = await anonRequest.post(`${API_BASE}/api/auth/sign-up`, {
      data: { email, password, name: 'Purchased User' },
    });
    expect(signUpResponse.status()).toBe(201);
    const { accessToken: userToken } = await signUpResponse.json();

    // Step 2: Get a product from the catalog
    const product = await ensureProduct();

    // Step 3: Add product to cart
    const addToCartResponse = await anonRequest.post(`${API_BASE}/api/cart/items`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { productId: product.id, amount: 1 },
    });
    expect(addToCartResponse.ok()).toBeTruthy();

    // Step 4: Create an order
    const createOrderResponse = await anonRequest.post(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        shippingAddress: {
          fullName: 'E2E Review User',
          phone: '0901234567',
          address: '123 Test Street',
          city: 'Ho Chi Minh',
          district: 'District 1',
          ward: 'Ben Nghe',
        },
        deliveryMethod: 'fast',
        paymentMethod: 'COD',
      },
    });
    expect(createOrderResponse.status()).toBe(201);
    const order = await createOrderResponse.json();
    const orderId = order.orderId || order.id;

    // Step 5: Sign in as admin and mark order as delivered
    // State machine: PENDING → PAID → DELIVERED
    const { email: adminEmail, password: adminPassword } = await ensureAdminUser();

    const adminSignInResponse = await anonRequest.post(`${API_BASE}/api/auth/sign-in`, {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(adminSignInResponse.ok()).toBeTruthy();
    const { accessToken: adminToken } = await adminSignInResponse.json();

    // First mark as paid (PENDING → PAID)
    const paidResponse = await anonRequest.patch(`${API_BASE}/api/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isPaid: true },
    });
    expect(paidResponse.status()).toBe(200);

    // Then mark as delivered (PAID → DELIVERED)
    const deliverResponse = await anonRequest.patch(`${API_BASE}/api/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { isDelivered: true },
    });
    expect(deliverResponse.status()).toBe(200);

    // Step 6: Post a review as the user — should succeed now
    const reviewResponse = await anonRequest.post(
      `${API_BASE}/api/products/${product.id}/reviews`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
        data: { content: 'Excellent quality glasses!', star: 5 },
      },
    );

    expect(reviewResponse.status()).toBe(201);
    const review = await reviewResponse.json();
    expect(review.id).toBeTruthy();
    expect(review.content).toBe('Excellent quality glasses!');
    expect(review.star).toBe(5);
  });
});
