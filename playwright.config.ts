import { defineConfig } from '@playwright/test';

const port = process.env.ACCESS_TEST_API_PORT || '8000';
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/integration',
  use: {
    baseURL: origin, browserName: 'chromium', trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'], executablePath: process.env.ACCESS_TEST_CHROMIUM },
  },
  webServer: {
    command: `uv run --no-sync uvicorn access_api.main:app --host 127.0.0.1 --port ${port}`,
    url: `${origin}/healthz`,
    reuseExistingServer: process.env.ACCESS_TEST_REUSE_SERVER === '1',
  },
});
