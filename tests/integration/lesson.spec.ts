import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('read, search, resize and download independently in two instances', async ({ page }) => {
  await page.goto('/demo/independent');
  const first = page.locator('alx-accessible-lesson').first();
  await expect(first.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await first.getByRole('searchbox').fill('breaks');
  await expect(first.getByRole('status')).toHaveText('1 of 3 sections found.');
  await first.getByRole('combobox').selectOption('1.5');
  await page.getByText('Independent second component instance').click();
  const second = page.locator('alx-accessible-lesson').nth(1);
  await expect(second.getByRole('searchbox')).toHaveValue('');
  await expect(second.getByRole('heading', { name: 'Choose one goal' })).toBeVisible();
  const download = page.waitForEvent('download');
  await first.getByRole('link', { name: /Download offline pack/ }).click();
  expect((await download).suggestedFilename()).toBe('demo-learning-plan-v1.zip');
});

test('API failure recovers with retry and preserves the fallback', async ({ page }) => {
  await page.route('**/manifest?version=1', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/demo/independent');
  const first = page.locator('alx-accessible-lesson').first();
  await expect(first.getByRole('heading', { name: 'Lesson unavailable' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download the accessible lesson', exact: true })).toBeVisible();
  await page.unroute('**/manifest?version=1');
  await first.getByRole('button', { name: 'Try again' }).click();
  await expect(first.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await expect(first.getByRole('heading', { name: 'Make a learning plan' })).toBeFocused();
});

test('context changes discard old lesson state', async ({ page }) => {
  await page.goto('/demo/independent');
  const first = page.locator('alx-accessible-lesson').first();
  await expect(first.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await first.evaluate(element => element.setAttribute('content-version', '2'));
  await expect(first.getByRole('heading', { name: 'Lesson unavailable' })).toBeVisible();
  await first.evaluate(element => element.setAttribute('content-version', '1'));
  await expect(first.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
});

test('keyboard reaches controls and source markup remains inert', async ({ page }) => {
  await page.route('**/manifest?version=1', async route => {
    const response = await route.fetch();
    const lesson = await response.json();
    lesson.segments[0].text = '<img src=x onerror="window.injected=true">';
    await route.fulfill({ response, json: lesson });
  });
  await page.goto('/demo/independent');
  const first = page.locator('alx-accessible-lesson').first();
  await expect(first.getByRole('searchbox')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(first.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first.getByRole('combobox')).toBeFocused();
  await expect(first.locator('img')).toHaveCount(0);
  await expect(first.getByText('<img src=x onerror="window.injected=true">', { exact: true })).toBeVisible();
});

test('removing and reconnecting an instance emits readiness once', async ({ page }) => {
  await page.goto('/demo/independent');
  const first = page.locator('alx-accessible-lesson').first();
  await expect(first.getByRole('searchbox')).toBeVisible();
  await first.evaluate(element => {
    element.setAttribute('data-ready-count', '0');
    element.addEventListener('alx-media-ready', () => {
      element.setAttribute('data-ready-count', String(Number(element.getAttribute('data-ready-count')) + 1));
    });
    const parent = element.parentElement!;
    element.remove();
    parent.prepend(element);
  });
  await expect(first).toHaveAttribute('data-ready-count', '1');
  await expect(first.getByRole('searchbox')).toBeVisible();
});

test('host fixture has named controls and passes an automated WCAG A/AA scan', async ({ page }) => {
  await page.goto('/demo/savanna');
  await expect(page.getByRole('searchbox')).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
