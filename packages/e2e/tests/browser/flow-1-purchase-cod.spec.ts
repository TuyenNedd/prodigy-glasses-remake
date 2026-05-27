/**
 * Flow #1: Full Purchase with Cash on Delivery (COD)
 *
 * Validates the critical revenue path:
 * Sign up → Browse products → Add to cart → Checkout with COD → Verify order in order list
 *
 * Validates: Requirements 4.1, 4.2
 */

import { test, expect } from '../../fixtures';
import {
  SignUpPage,
  ProductListPage,
  CartPage,
  CheckoutPage,
  OrdersPage,
  type ShippingAddress,
} from '../../pages';

const TEST_ADDRESS: ShippingAddress = {
  fullName: 'E2E Test User',
  phone: '0901234567',
  address: '123 Test Street, Ward 1',
  city: 'Ho Chi Minh City',
};

test.describe('Flow #1: Full Purchase COD', () => {
  test('sign-up → browse → add to cart → checkout COD → see order', async ({ page }) => {
    // Step 1: Sign up a new user
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await signUpPage.fillForm({
      email: `user-${Date.now()}@test.com`,
      password: 'TestPass123!',
      name: 'E2E User',
    });
    await signUpPage.submit();

    // Step 2: Browse products and select one
    const plp = new ProductListPage(page);
    await plp.goto();
    await plp.clickProduct(0);

    // Step 3: Add product to cart from PDP
    await page.getByRole('button', { name: /add to cart/i }).click();

    // Step 4: Go to cart and proceed to checkout
    const cart = new CartPage(page);
    await cart.goto();
    await cart.proceedToCheckout();

    // Step 5: Fill shipping address, select COD, and submit order
    const checkout = new CheckoutPage(page);
    await checkout.fillShippingAddress(TEST_ADDRESS);
    await checkout.selectCOD();
    await checkout.submitOrder();

    // Step 6: Verify order appears in the orders page
    const orders = new OrdersPage(page);
    const rows = await orders.getOrderRows();
    expect(rows.length).toBeGreaterThan(0);
  });
});
