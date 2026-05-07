const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  retries: 1,
  workers: 4,
  expect: {
    timeout: 30000,
    toHaveScreenshot: { threshold: 0.2, maxDiffPixelRatio: 0.3 },
  },
  use: {
    baseURL: process.env.BASE_URL || 'https://learning.oreilly.review/',
    viewport: { width: 1300, height: 800 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['html'], ['list']],
  snapshotDir: './tests/__snapshots__',
  updateSnapshots: 'missing',
});
