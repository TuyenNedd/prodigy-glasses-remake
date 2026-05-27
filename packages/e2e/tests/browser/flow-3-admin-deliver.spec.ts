/**
 * Flow #3: Admin Marks Order as Delivered
 *
 * Validates the fulfillment workflow:
 * Admin signs in → navigates to admin orders → marks a pending order as delivered → verifies status change
 *
 * Validates: Requirements 6.1, 6.2
 */

import { test, expect } from '../../fixtures';
import { AdminOrdersPage } from '../../pages';
import { ensureProduct } from '../../helpers/seed';

const API_BASE = 'http://localhost:3001/api';

/**
 * Creates a pending order via API by signing up a fresh user,
 * adding a product to their cart, and placing a COD order.
 * Returns the order ID for the admin to mark as delivered.
 */
async function createPendingOrder(): Promise<{ orderId: string }> {
  const timestamp = Date.now();
  const email = `pending-order-${timestamp}@e2e-test.com`;
  const password = 'TestPass123!';

  // Sign up a fresh user
  const signUpRes = await fetch(`${API_BASE}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Pending Order User' }),
  });

  if (!signUpRes.ok) {
    throw new Error(`[flow-3] Sign-up failed (${signUpRes.status}): ${await signUpRes.text()}`);
  }

  const { accessToken } = (await signUpRes.json()) as { accessToken: string };

  // Get a product to add to cart
  const product = await ensureProduct();

  // Add product to cart
  const addToCartRes = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ productId: product.id, amount: 1 }),
  });

  if (!addToCartRes.ok) {
    throw new Error(
      `[flow-3] Add to cart failed (${addToCartRes.status}): ${await addToCartRes.text()}`,
    );
  }

  // Create order with COD payment (results in PENDING status)
  const createOrderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      shippingAddress: {
        fullName: 'Pending Order User',
        phone: '0901234567',
        address: '456 Test Avenue',
        city: 'Ho Chi Minh',
        district: 'District 3',
        ward: 'Ward 7',
      },
      deliveryMethod: 'fast',
      paymentMethod: 'COD',
    }),
  });

  if (!createOrderRes.ok) {
    throw new Error(
      `[flow-3] Create order failed (${createOrderRes.status}): ${await createOrderRes.text()}`,
    );
  }

  const order = (await createOrderRes.json()) as { id: string };
  return { orderId: order.id };
}

test.describe('Flow #3: Admin Marks Order Delivered', () => {
  test('admin navigates to orders → marks pending order as delivered → status updates', async ({
    adminPage,
  }) => {
    // Step 1: Create a pending order via API
    const { orderId } = await createPendingOrder();

    // Step 2: Navigate to admin orders page
    const adminOrders = new AdminOrdersPage(adminPage);
    await adminOrders.goto();

    // Step 3: Mark the order as delivered
    await adminOrders.markAsDelivered(orderId);

    // Step 4: Verify the status is now DELIVERED in the admin order list
    const shortId = orderId.slice(0, 8);
    const orderRow = adminPage.getByRole('row').filter({
      hasText: `#${shortId}`,
    });
    await expect(orderRow.getByText('DELIVERED')).toBeVisible();
  });
});
