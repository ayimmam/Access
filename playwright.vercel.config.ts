import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/vercel',
  use: { browserName: 'chromium', launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  webServer: [
    {
      command: 'UV_CACHE_DIR=/tmp/access-uv-cache ACCESS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174 uv run uvicorn access_api.main:app --host 127.0.0.1 --port 8000 --no-access-log',
      url: 'http://127.0.0.1:8000/healthz', reuseExistingServer: !process.env.CI,
    },
    {
      command: 'python3 -m http.server 5173 --bind 127.0.0.1 --directory demos/ethioware',
      url: 'http://127.0.0.1:5173/', reuseExistingServer: !process.env.CI,
    },
    {
      command: 'python3 -m http.server 5174 --bind 127.0.0.1 --directory demos/career-gateway',
      url: 'http://127.0.0.1:5174/', reuseExistingServer: !process.env.CI,
    },
  ],
});
