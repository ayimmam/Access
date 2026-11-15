import type { Page } from '@playwright/test';

export const ethiowareOrigin = `http://127.0.0.1:${process.env.ACCESS_TEST_ETHIOWARE_PORT || '5173'}`;
export const careerOrigin = `http://127.0.0.1:${process.env.ACCESS_TEST_CAREER_PORT || '5174'}`;

export async function useDemoApi(page: Page, baseURL?: string) {
  if (!baseURL) return;
  await page.route('http://127.0.0.1:8000/**', route => {
    const original = new URL(route.request().url());
    return route.continue({ url: new URL(original.pathname + original.search, baseURL).href });
  });
}
