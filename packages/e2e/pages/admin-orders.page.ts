/**
 * Page Object Model for the Admin Orders page (/admin-orders).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page } from '@playwright/test';

export class AdminOrdersPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin-orders');
  }

  /**
   * Marks an order as delivered by finding the order row and clicking
   * the status update control. The order ID is displayed as #{first 8 chars}.
   *
   * Note: The current admin orders page is read-only (table display).
   * This method anticipates a "Mark as Delivered" action button or dropdown
   * being added to each order row. It uses a resilient selector strategy.
   */
  async markAsDelivered(orderId: string): Promise<void> {
    const shortId = orderId.slice(0, 8);
    const orderRow = this.page.getByRole('row').filter({
      hasText: `#${shortId}`,
    });

    // Try button first (most accessible pattern)
    const deliverButton = orderRow.getByRole('button', { name: /deliver|mark.*delivered/i });
    const hasButton = await deliverButton.isVisible().catch(() => false);

    if (hasButton) {
      await deliverButton.click();
    } else {
      // Fallback: look for a select/dropdown to change status
      const statusSelect = orderRow.getByRole('combobox');
      const hasSelect = await statusSelect.isVisible().catch(() => false);

      if (hasSelect) {
        await statusSelect.selectOption('DELIVERED');
      } else {
        // Fallback: click the status badge which may open an inline editor
        const statusBadge = orderRow.locator('span').filter({
          hasText: /PENDING|PAID/,
        });
        await statusBadge.click();
        await this.page.getByText(/delivered/i).click();
      }
    }

    // Wait for the status to update in the UI
    await orderRow.getByText('DELIVERED').waitFor({ timeout: 10_000 });
  }
}
