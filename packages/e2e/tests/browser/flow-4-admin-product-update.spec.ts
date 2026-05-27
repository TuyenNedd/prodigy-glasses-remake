/**
 * Flow #4: Admin Updates Product
 *
 * Validates the catalog management workflow:
 * Admin signs in → navigates to admin products → selects a product →
 * modifies the name → saves → reloads to verify persistence →
 * checks public PDP reflects the update (cache invalidation)
 *
 * Validates: Requirements 7.1, 7.2
 */

import { test, expect } from '../../fixtures';
import { AdminProductsPage } from '../../pages';

test.describe('Flow #4: Admin Updates Product', () => {
  test('admin updates product name → change persists after reload → public PDP reflects update', async ({
    adminPage,
  }) => {
    const adminProducts = new AdminProductsPage(adminPage);

    // Step 1: Navigate to admin products page
    await adminProducts.goto();

    // Step 2: Select the first product
    await adminProducts.selectProduct(0);

    // Step 3: Read the current product name and generate a unique updated name
    const timestamp = Date.now();
    const nameInput = adminPage.getByLabel(/name/i).first();
    await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
    const originalName = await nameInput.inputValue();
    const updatedName = `${originalName} - ${timestamp}`;

    // Step 4: Update the product name
    await adminProducts.updateName(updatedName);

    // Step 5: Save the changes
    await adminProducts.save();

    // Step 6: Reload the page to verify persistence
    await adminPage.reload();

    // Step 7: Wait for the name input to be visible again and assert the new name persisted
    const reloadedNameInput = adminPage.getByLabel(/name/i).first();
    await reloadedNameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(reloadedNameInput).toHaveValue(updatedName);

    // Step 8: Verify cache invalidation — public PDP shows the updated name
    // Navigate to the public products page and check the updated name appears
    await adminPage.goto('/products');
    await expect(adminPage.getByText(updatedName)).toBeVisible({ timeout: 10_000 });
  });
});
