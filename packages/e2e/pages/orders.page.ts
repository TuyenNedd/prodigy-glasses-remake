/**
 * Page Object Model for the Orders page (/orders).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page, type Locator } from '@playwright/test';

export class OrdersPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/orders');
  }

  /**
   * Returns all order row link elements on the page.
   * Each order is rendered as a link to `/orders/[id]`.
   */
  async getOrderRows(): Promise<Locator[]> {
    const rows = this.page.getByRole('link').filter({
      hasText: /#/,
    });
    // Wait for at least one order to appear
    await rows.first().waitFor({ state: 'visible', timeout: 10_000 });
    return rows.all();
  }

  /**
   * Gets the status text for a specific order by its ID prefix.
   * Order IDs are displayed as #{first 8 chars}.
   */
  async getOrderStatus(orderId: string): Promise<string> {
    const shortId = orderId.slice(0, 8);
    const orderRow = this.page.getByRole('link').filter({
      hasText: `#${shortId}`,
    });
    // The status badge is a span with a status color class
    const statusBadge = orderRow.locator('span').filter({
      hasText: /PENDING|AWAITING_PAYMENT|PAID|DELIVERED|CANCELLED/,
    });
    return (await statusBadge.textContent()) ?? '';
  }
}
