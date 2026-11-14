import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('EthioWare host loads the lesson tools and reflows at 320px', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Software Engineering Basics' })).toBeVisible();
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide learning tools' }).click();
  await expect(lesson).toBeHidden();
  await page.getByRole('button', { name: 'Show learning tools' }).click();
  await page.getByLabel('Practice content').selectOption('alx-transforming-africa');
  await expect(lesson.getByRole('heading', { name: 'We Are Transforming Africa' })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Career Gateway filters jobs and restores dialog focus', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/');
  await expect(page.getByText('4 jobs found.')).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search jobs by title, skill or employer' });
  await search.fill('developer');
  await expect(page.getByText('1 job found.')).toBeVisible();
  const open = page.getByRole('button', { name: 'View details — Junior web developer' });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close job details' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Open fictional certificate verification' })).toHaveAttribute('href', 'http://127.0.0.1:5174/certificates/DEMO-LEARNING-001');
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('fictional certificate page exposes only the public record fields', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/certificate.html?id=DEMO-LEARNING-001');
  await expect(page.getByRole('status')).toHaveText('Valid fictional demo record.');
  await expect(page.getByText('DEMO — NOT AN ALX-ISSUED CREDENTIAL')).toBeVisible();
  await expect(page.locator('#record dt')).toHaveText(['Course', 'Issued']);
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
});
