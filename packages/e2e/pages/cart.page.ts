/**
 * Page Object Model for the Cart page (/cart).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page } from '@playwright/test';

export class CartPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart');
  }

  /**
   * Returns the total number of items in the cart by parsing the heading text.
   * The heading format is: "Your Cart (N items)"
   */
  async getItemCount(): Promise<number> {
    const heading = this.page.getByRole('heading', { name: /your cart/i });
    const text = await heading.textContent();
    const match = /\((\d+)\s+items?\)/.exec(text ?? '');
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  /**
   * Clicks the "Proceed to Checkout" link to navigate to the checkout page.
   */
  async proceedToCheckout(): Promise<void> {
    await this.page.getByRole('link', { name: /proceed to checkout/i }).click();
    await this.page.waitForURL('/checkout');
  }
}
