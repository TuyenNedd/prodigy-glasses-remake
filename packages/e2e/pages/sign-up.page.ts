/**
 * Page Object Model for the Sign Up page (/sign-up).
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 */

import { type Page, type Locator } from '@playwright/test';

export class SignUpPage {
  private readonly page: Page;
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel('Full Name');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign up/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/sign-up');
  }

  async fillForm(data: { email: string; password: string; name: string }): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    // Wait for navigation away from sign-up page (redirect to home on success)
    await this.page.waitForURL((url) => !url.pathname.includes('/sign-up'), {
      timeout: 10_000,
    });
  }
}
