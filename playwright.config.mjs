import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4182',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4182 --bind 127.0.0.1',
    port: 4182,
    reuseExistingServer: false,
  },
});
