import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';

test('installer mounts, themes and removes the real component with host events', async ({ page }) => {
  await page.goto('/demo/plug-in');
  const install = page.getByRole('button', { name: 'Install component', exact: true });
  await expect(install).toBeEnabled();
  await install.click();
  await expect(page.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await expect(page.locator('#events')).toContainText('alx-media-ready');
  await page.getByLabel('Host appearance').selectOption('plum');
  await expect(page.locator('.partner')).toHaveClass('partner plum');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Remove component' }).click();
  await expect(page.locator('alx-accessible-lesson')).toHaveCount(0);
  await expect(install).toBeFocused();
  await install.click();
  await expect(page.locator('#events li')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Build your learning routine' })).toBeVisible();
});

test('generated snippet works on a distinct allowed host origin', async ({ page, context }) => {
  await page.goto('/demo/plug-in');
  await expect(page.getByRole('button', { name: 'Install component', exact: true })).toBeEnabled();
  const snippet = await page.locator('#snippet').inputValue();
  expect(snippet).toContain('integrity="sha384-');
  const host = await context.newPage();
  const errors: string[] = [];
  host.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  host.on('pageerror', error => errors.push(error.message));
  // A real second server preserves browser address-space checks, CORS and SRI.
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><html lang="en"><head><title>Independent host</title></head><body><main>${snippet}</main></body></html>`);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(5173, '127.0.0.1', resolve);
  });
  try {
    await host.goto('http://127.0.0.1:5173/');
    await expect(host.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
    await host.getByRole('searchbox').fill('breaks');
    await expect(host.getByRole('status')).toHaveText('1 of 3 sections found.');
  } catch (error) {
    throw new Error(`${error}\nBrowser errors: ${errors.join('\n')}`);
  } finally {
    await host.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('unavailable release leaves an actionable installer error', async ({ page }) => {
  await page.route('**/integrity.json', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/demo/plug-in');
  await expect(page.getByRole('status')).toContainText('npm run build');
  await expect(page.getByRole('button', { name: 'Install component', exact: true })).toBeDisabled();
  await expect(page.locator('alx-accessible-lesson')).toHaveCount(0);
});
