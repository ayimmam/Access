import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('synthetic motion is opt-in, visibly moves, pauses and resets without review data', async ({ page }) => {
  const errors: string[] = [];
  const signingRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/signing-(manifest|assets)/.test(request.url())) signingRequests.push(request.url());
  });
  await page.goto('/demo/avatar-review');
  const stage = page.locator('#motion-test-stage');
  const canvas = stage.locator('canvas');
  await expect(stage).toBeHidden();
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Hands motion test — not sign language' })).toBeVisible();
  await page.getByRole('button', { name: 'Start motion test', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(canvas).toBeVisible();
  await expect(page.locator('#motion-test-status')).toContainText('not sign language or a lesson translation');
  const first = await canvas.screenshot();
  await expect.poll(async () => (await canvas.screenshot()).equals(first)).toBe(false);
  await page.getByRole('button', { name: 'Pause motion test', exact: true }).click();
  const paused = await canvas.screenshot();
  await page.waitForTimeout(250);
  expect(await canvas.screenshot()).toEqual(paused);
  await page.getByRole('button', { name: 'Resume motion test', exact: true }).press('Space');
  await expect.poll(async () => (await canvas.screenshot()).equals(paused)).toBe(false);
  await page.getByRole('button', { name: 'Reset motion test', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await expect(stage).toBeHidden();
  await page.getByRole('button', { name: 'Start motion test', exact: true }).click();
  await expect(canvas).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset motion test', exact: true }).click();
  await expect(page.locator('#video')).toBeHidden();
  expect(await page.locator('#video').evaluate((video: HTMLVideoElement) => video.paused && video.currentTime === 0)).toBe(true);
  await expect(page.locator('#save')).toBeDisabled();
  await expect(page.locator('#download')).toBeDisabled();
  await expect(page.locator('#reveal')).toBeDisabled();
  await expect(page.locator('#observations li')).toHaveCount(0);
  expect(signingRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('motion test pauses in the background and disposes on page exit', async ({ page }) => {
  await page.goto('/demo/avatar-review');
  await page.getByRole('button', { name: 'Start motion test', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause motion test', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#motion-test-status')).toContainText('Paused while the tab is hidden');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Resume motion test', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume motion test', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('#motion-test-stage canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start motion test', exact: true })).toBeEnabled();
});

test('motion test respects reduced motion and remains accessible at 320 pixels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/demo/avatar-review');
  await expect(page.locator('#motion-test-stage canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start motion test', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause motion test', exact: true })).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#motion-test-status')).toContainText('Paused for reduced motion');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('WebGL failure leaves a readable error and the study importer usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
      return contextId.includes('webgl') ? null : Reflect.apply(original, this, [contextId, options]);
    } as typeof original;
  });
  await page.goto('/demo/avatar-review');
  await page.getByRole('button', { name: 'Start motion test', exact: true }).click();
  await expect(page.locator('#motion-test-status')).toContainText('Motion test unavailable');
  await expect(page.locator('#motion-test-stage canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start motion test', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Load draft performance', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});
