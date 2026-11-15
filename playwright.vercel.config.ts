import { defineConfig } from '@playwright/test';

const apiPort = process.env.ACCESS_TEST_API_PORT || '8000';
const ethiowarePort = process.env.ACCESS_TEST_ETHIOWARE_PORT || '5173';
const careerPort = process.env.ACCESS_TEST_CAREER_PORT || '5174';
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const ethiowareOrigin = `http://127.0.0.1:${ethiowarePort}`;
const careerOrigin = `http://127.0.0.1:${careerPort}`;

export default defineConfig({
  testDir: './tests/vercel',
  use: { baseURL: apiOrigin, browserName: 'chromium', trace: 'retain-on-failure', launchOptions: { args: ['--enable-unsafe-swiftshader'], executablePath: process.env.ACCESS_TEST_CHROMIUM } },
  webServer: [
    {
      command: `UV_CACHE_DIR=/tmp/access-uv-cache ACCESS_ALLOWED_ORIGINS=${ethiowareOrigin},${careerOrigin} uv run --no-sync uvicorn access_api.main:app --host 127.0.0.1 --port ${apiPort} --no-access-log`,
      url: `${apiOrigin}/healthz`, reuseExistingServer: process.env.ACCESS_TEST_REUSE_SERVER === '1',
    },
    {
      command: `python3 -m http.server ${ethiowarePort} --bind 127.0.0.1 --directory demos/ethioware`,
      url: `${ethiowareOrigin}/`, reuseExistingServer: process.env.ACCESS_TEST_REUSE_SERVER === '1',
    },
    {
      command: `python3 -m http.server ${careerPort} --bind 127.0.0.1 --directory demos/career-gateway`,
      url: `${careerOrigin}/`, reuseExistingServer: process.env.ACCESS_TEST_REUSE_SERVER === '1',
    },
  ],
});
