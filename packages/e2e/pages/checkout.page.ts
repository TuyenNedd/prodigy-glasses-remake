/**
 * Page Object Model for the Checkout page (/checkout).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page, type Locator } from '@playwright/test';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  ward?: string;
}

export class CheckoutPage {
  private readonly page: Page;
  private readonly codRadio: Locator;
  private readonly paypalRadio: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Payment method radio buttons are labeled by their adjacent text
    this.codRadio = page.getByLabel(/cash on delivery/i);
    this.paypalRadio = page.getByLabel(/paypal/i);
    this.submitButton = page.getByRole('button', { name: /place order/i });
  }

  async selectCOD(): Promise<void> {
    await this.codRadio.check();
  }

  async selectPayPal(): Promise<void> {
    await this.paypalRadio.check();
  }

  /**
   * Fills the shipping address form fields.
   * Uses placeholder-based selectors since the checkout form uses placeholders instead of labels.
   */
  async fillShippingAddress(address: ShippingAddress): Promise<void> {
    await this.page.getByPlaceholder('Full Name').fill(address.fullName);
    await this.page.getByPlaceholder('Address').fill(address.address);
    await this.page.getByPlaceholder('City').fill(address.city);
    await this.page.getByPlaceholder('Phone').fill(address.phone);
  }

  /**
   * Submits the order by clicking the "Place Order (COD)" button.
   * Waits for navigation to the orders page on success.
   */
  async submitOrder(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForURL('/orders', { timeout: 15_000 });
  }
}
