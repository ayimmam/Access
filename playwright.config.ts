import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  use: {
    baseURL: 'http://127.0.0.1:8000', browserName: 'chromium',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000',
    url: 'http://127.0.0.1:8000/healthz',
    reuseExistingServer: !process.env.CI,
  },
});
