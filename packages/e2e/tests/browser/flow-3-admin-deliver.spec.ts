/**
 * Flow #3: Admin Marks Order as Delivered
 *
 * Validates the fulfillment workflow:
 * Create order → Admin marks as paid → Admin marks as delivered → Verify via API
 *
 * Uses adminRequest fixture for admin operations to avoid rate limiting.
 * Verifies the order status change via API (admin orders page is read-only).
 *
 * Validates: Requirements 6.1, 6.2
 */

import { test, expect } from '../../fixtures';
import { ensureProduct } from '../../helpers/seed';

const API_BASE = 'http://localhost:3001';

test.describe('Flow #3: Admin Marks Order Delivered', () => {
  test('create order → admin marks paid → delivered → verify status', async ({
    anonRequest,
    adminRequest,
  }) => {
    // Step 1: Create a user and order
    const timestamp = Date.now();
    const email = `order-user-${timestamp}@e2e-test.com`;
    const password = 'TestPass123!';

    const signUpRes = await anonRequest.post(`${API_BASE}/api/auth/sign-up`, {
      data: { email, password, name: 'Order User' },
    });
    expect(signUpRes.status()).toBe(201);
    const { accessToken: userToken } = (await signUpRes.json()) as { accessToken: string };

    // Add product to cart
    const product = await ensureProduct();
    const addCartRes = await anonRequest.post(`${API_BASE}/api/cart/items`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { productId: product.id, amount: 1 },
    });
    expect(addCartRes.ok()).toBeTruthy();

    // Create order
    const orderRes = await anonRequest.post(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        shippingAddress: {
          fullName: 'Order User',
          phone: '0901234567',
          address: '123 Test St',
          city: 'Ho Chi Minh',
        },
        deliveryMethod: 'fast',
        paymentMethod: 'COD',
      },
    });
    expect(orderRes.status()).toBe(201);
    const { orderId } = (await orderRes.json()) as { orderId: string };
    expect(orderId).toBeTruthy();

    // Step 2: Admin marks order as paid (PENDING → PAID)
    const paidRes = await adminRequest.patch(`${API_BASE}/api/admin/orders/${orderId}`, {
      data: { isPaid: true },
    });
    expect(paidRes.status()).toBe(200);

    // Step 3: Admin marks order as delivered (PAID → DELIVERED)
    const deliverRes = await adminRequest.patch(`${API_BASE}/api/admin/orders/${orderId}`, {
      data: { isDelivered: true },
    });
    expect(deliverRes.status()).toBe(200);

    // Step 4: Verify order status is DELIVERED
    const orderDetail = await adminRequest.get(`${API_BASE}/api/admin/orders/${orderId}`);
    expect(orderDetail.ok()).toBeTruthy();
    const orderData = (await orderDetail.json()) as { status: string };
    expect(orderData.status).toBe('DELIVERED');
  });
});
