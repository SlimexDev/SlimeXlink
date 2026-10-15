import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
});
