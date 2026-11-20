import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('API dashboard shows live, redacted traffic and recovers from failed refreshes', async ({ page, request }) => {
  const path = '/api/dashboard/metrics';
  const before = await (await request.get(path)).json();
  const privateValue = 'dashboard-fixture-should-not-appear-in-metrics';
  await request.get('/api/v1/jobs');
  await request.get('/api/v1/lessons/' + privateValue + '/manifest?version=1');
  const response = await request.get(path);
  const snapshot = await response.json();
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(snapshot.total).toBeGreaterThanOrEqual(before.total + 2);
  expect(snapshot.recent).toEqual(expect.arrayContaining([
    expect.objectContaining({ route: '/api/v1/jobs', status: 200 }),
    expect.objectContaining({ route: '/api/v1/lessons/{lesson_id}/manifest', status: 404 }),
  ]));
  expect(JSON.stringify(snapshot)).not.toContain(privateValue);

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/api/dashboard');
  await expect(page.getByText('API operational')).toBeVisible();
  await expect(page.locator('#chart .bar')).toHaveCount(30);
  expect(await page.locator('#chart .bar').evaluateAll(bars => bars.some(bar => bar.getBoundingClientRect().height > 0))).toBe(true);
  await page.getByText('View traffic as a table').click();
  await expect(page.locator('#traffic tr')).toHaveCount(30);
  await page.getByLabel('Status', { exact: true }).selectOption('errors');
  await expect(page.locator('#recent')).toContainText('404');
  await expect(page.locator('#recent')).not.toContainText(privateValue);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);

  const toggle = page.getByRole('button', { name: 'Auto-refresh' });
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await page.route('**' + path, route => route.fulfill({ status: 503 }));
  await page.route('**/healthz', route => route.fulfill({ status: 503 }));
  const refresh = page.getByRole('button', { name: 'Refresh now' });
  await refresh.click();
  await expect(page.getByText('Health check failed')).toBeVisible();
  await expect(page.getByText('Refresh failed. Displaying the last available metrics.')).toBeVisible();
  await page.unroute('**' + path);
  await page.unroute('**/healthz');
  await refresh.click();
  await expect(page.getByText('API operational')).toBeVisible();
  await expect(page.locator('#notice')).toBeHidden();
});
