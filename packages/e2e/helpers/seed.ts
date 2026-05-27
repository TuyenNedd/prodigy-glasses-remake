/**
 * Seed helpers for E2E tests.
 *
 * Provides utility functions to ensure test preconditions are met:
 * - Admin user exists and credentials are available
 * - At least one product exists in the catalog
 * - A delivered order can be created for purchase-gated review tests
 */

const API_BASE = 'http://localhost:3001/api';

/**
 * Returns admin credentials from environment variables set by global-setup.
 * Throws if credentials are not available.
 */
export async function ensureAdminUser(): Promise<{ email: string; password: string }> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      '[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set. ' +
        'Ensure global-setup has run before tests.',
    );
  }

  return { email, password };
}

/**
 * Verifies at least one product exists in the catalog and returns its details.
 * Calls GET /api/products and returns the first product's id and name.
 */
export async function ensureProduct(): Promise<{ slug: string; name: string; id: string }> {
  const response = await fetch(`${API_BASE}/products?pageSize=1`);

  if (!response.ok) {
    throw new Error(
      `[seed] Failed to fetch products (${response.status}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as {
    data: Array<{ id: string; name: string }>;
    total: number;
  };

  if (!body.data || body.data.length === 0) {
    throw new Error('[seed] No products found in catalog. Ensure global-setup seed has run.');
  }

  const product = body.data[0];

  return {
    id: product.id,
    name: product.name,
    // Product entity uses id for URL routing (no slug field)
    slug: product.id,
  };
}

/**
 * Signs in a user and returns the access token.
 */
async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(
      `[seed] Sign-in failed for ${email} (${response.status}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

/**
 * Creates a delivered order for a given user.
 *
 * This function signs up a fresh user, adds a product to their cart,
 * creates a COD order, then uses admin credentials to mark it delivered.
 * The `userId` parameter is kept for interface compatibility with the design spec.
 *
 * Returns the order ID so the caller can reference it (e.g., for review tests).
 *
 * Validates: Requirements 2.5, 10.2
 */
export async function createDeliveredOrder(userId: string): Promise<{ orderId: string }> {
  // Create a fresh user to get an access token for cart/order operations.
  // If the caller needs the order tied to a specific user, they should
  // use the overload that accepts a token.
  const timestamp = Date.now();
  const userEmail = `order-user-${userId.slice(0, 8)}-${timestamp}@e2e-test.com`;
  const userPassword = 'TestPass123!';

  const signUpResponse = await fetch(`${API_BASE}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: userPassword,
      name: 'Order Seed User',
    }),
  });

  if (!signUpResponse.ok) {
    throw new Error(
      `[seed] Sign-up failed (${signUpResponse.status}): ${await signUpResponse.text()}`,
    );
  }

  const signUpBody = (await signUpResponse.json()) as {
    user: { id: string };
    accessToken: string;
  };
  const token = signUpBody.accessToken;

  // Get a product to add to cart
  const product = await ensureProduct();

  // Add product to cart
  const addToCartResponse = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: product.id, amount: 1 }),
  });

  if (!addToCartResponse.ok) {
    throw new Error(
      `[seed] Failed to add item to cart (${addToCartResponse.status}): ${await addToCartResponse.text()}`,
    );
  }

  // Create order with COD payment
  const createOrderResponse = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shippingAddress: {
        fullName: 'E2E Test User',
        phone: '0901234567',
        address: '123 Test Street',
        city: 'Ho Chi Minh',
        district: 'District 1',
        ward: 'Ben Nghe',
      },
      deliveryMethod: 'fast',
      paymentMethod: 'COD',
    }),
  });

  if (!createOrderResponse.ok) {
    throw new Error(
      `[seed] Failed to create order (${createOrderResponse.status}): ${await createOrderResponse.text()}`,
    );
  }

  const order = (await createOrderResponse.json()) as { id: string };

  // Sign in as admin and mark order as delivered
  const { email: adminEmail, password: adminPassword } = await ensureAdminUser();
  const adminToken = await signIn(adminEmail, adminPassword);

  const deliverResponse = await fetch(`${API_BASE}/admin/orders/${order.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ isDelivered: true }),
  });

  if (!deliverResponse.ok) {
    throw new Error(
      `[seed] Failed to mark order as delivered (${deliverResponse.status}): ${await deliverResponse.text()}`,
    );
  }

  return { orderId: order.id };
}
