/**
 * Page Object Model for the Product List page (/products).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page, type Locator } from '@playwright/test';

export class ProductListPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
  }

  /**
   * Returns all product card link elements on the page.
   * Product cards are rendered as links to `/products/[id]`.
   */
  async getProductCards(): Promise<Locator[]> {
    const cards = this.page.getByRole('link').filter({
      has: this.page.locator('img'),
    });
    // Wait for at least one product card to be visible
    await cards.first().waitFor({ state: 'visible', timeout: 10_000 });
    return cards.all();
  }

  /**
   * Clicks a product card by its zero-based index in the grid.
   */
  async clickProduct(index: number): Promise<void> {
    const cards = this.page.getByRole('link').filter({
      has: this.page.locator('img'),
    });
    await cards.nth(index).click();
    // Wait for navigation to product detail page
    await this.page.waitForURL(/\/products\/.+/);
  }
}
