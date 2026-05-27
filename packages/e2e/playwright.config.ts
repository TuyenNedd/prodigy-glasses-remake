import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  globalSetup: require.resolve('./global-setup'),
  fullyParallel: true,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['html'], ['list']],

  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'browser-e2e',
      testDir: './tests/browser',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'api-tests',
      testDir: './tests/api',
      use: {
        baseURL: 'http://localhost:3001',
      },
    },
  ],
});
