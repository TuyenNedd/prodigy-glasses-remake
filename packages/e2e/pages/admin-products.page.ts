/**
 * Page Object Model for the Admin Products page (/admin-products).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page } from '@playwright/test';

export class AdminProductsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin-products');
  }

  /**
   * Selects a product by clicking its row in the products table.
   * This may navigate to a product edit page or open an inline editor.
   */
  async selectProduct(index: number): Promise<void> {
    const rows = this.page.getByRole('row');
    // Skip the header row (index 0 in the table), so offset by 1
    const productRow = rows.nth(index + 1);
    await productRow.click();
  }

  /**
   * Updates the product name field.
   * Assumes a product edit form is visible (after selectProduct or navigation).
   */
  async updateName(name: string): Promise<void> {
    const nameInput = this.page.getByLabel(/name/i).first();
    const isVisible = await nameInput.isVisible().catch(() => false);

    if (isVisible) {
      await nameInput.clear();
      await nameInput.fill(name);
    } else {
      // Fallback: look for an input with placeholder containing "name"
      const placeholderInput = this.page.getByPlaceholder(/name/i).first();
      await placeholderInput.clear();
      await placeholderInput.fill(name);
    }
  }

  /**
   * Saves the product changes by clicking the save/update button.
   */
  async save(): Promise<void> {
    const saveButton = this.page.getByRole('button', { name: /save|update/i });
    await saveButton.click();
    // Wait for success indication (button re-enabled or success message)
    await saveButton.waitFor({ state: 'visible', timeout: 10_000 });
  }
}
