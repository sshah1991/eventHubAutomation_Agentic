import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      suiteTitle: false,
      environmentInfo: {
        project: 'EventHub Automation',
        environment: 'staging',
        baseUrl: 'https://eventhub.rahulshettyacademy.com',
      },
    }],
  ],
  use: {
    browserName: 'chromium',
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
