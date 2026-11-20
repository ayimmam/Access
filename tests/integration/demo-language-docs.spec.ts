import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('language follows the demo links and translates lesson and career content in place', async ({ page }) => {
  await page.goto('/demo/savanna');
  const language = page.locator('#demo-language');
  const title = page.locator('h1');
  const english = await title.textContent();
  await language.focus();
  await language.selectOption('am');
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(title).toContainText(/[\u1200-\u137f]/);
  await expect(language).toBeFocused();
  await expect(page.locator('alx-accessible-lesson [data-caption-language]')).toHaveValue('am');

  await page.locator('.demo-links a[data-careers]').click();
  await expect(page).toHaveURL(/\/demo\/careers\?lesson=alx-transforming-africa$/);
  await expect(language).toHaveValue('am');
  await expect(title).toContainText(/[\u1200-\u137f]/);
  const career = page.locator('access-career-gateway');
  const job = career.locator('#title-demo-web-developer');
  await expect(job).toContainText(/[\u1200-\u137f]/);
  const localizedJob = await job.textContent();
  await career.locator('input[type="search"]').fill(localizedJob!);
  await expect(career.locator('.results article')).toHaveCount(1);
  const jobCard = career.locator('article[aria-labelledby="title-demo-web-developer"]');
  await jobCard.locator('button.primary').click();
  await expect(career.locator('#job-dialog-title')).toHaveText(localizedJob!);
  await page.keyboard.press('Escape');

  await page.locator('.demo-links a[href="/demo/ethioware"]').click();
  await expect(page).toHaveURL(/\/demo\/ethioware$/);
  await expect(language).toHaveValue('am');
  await expect(page.locator('alx-accessible-lesson h2')).toContainText(/[\u1200-\u137f]/);
  await language.selectOption('om');
  await expect(page.locator('html')).toHaveAttribute('lang', 'om');
  await expect(title).toHaveText(/Injinariingii/i);
  await page.locator('.demo-links a[href="/demo/savanna"]').click();
  await expect(language).toHaveValue('om');
  await language.selectOption('en');
  await expect(title).toHaveText(english!);
});

test('API docs work without scripts, support keyboard navigation and reflow', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8000/docs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Access API documentation');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to API documentation' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Read the machine-readable OpenAPI JSON' })).toHaveAttribute('href', '/openapi.json');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await context.close();
});

test('API docs have no automated WCAG A or AA violations', async ({ page }) => {
  await page.goto('/docs');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});
