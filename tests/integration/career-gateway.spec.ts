import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('job search filters locally, saves and opens accessible details', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/demo/careers');
  const gateway = page.locator('access-career-gateway');
  await expect(gateway.getByText('4 jobs found.', { exact: true })).toBeVisible();
  requests.length = 0;
  await gateway.getByLabel('Written interview', { exact: true }).check();
  await expect(gateway.getByText('2 jobs found.', { exact: true })).toBeVisible();
  await gateway.getByRole('searchbox').fill('data');
  await expect(gateway.getByText('1 job found.', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  const save = gateway.getByRole('button', { name: 'Save job — Learning data assistant' });
  await save.click(); await expect(save).toHaveAttribute('aria-pressed', 'true');
  const open = gateway.getByRole('button', { name: 'View details — Learning data assistant' });
  await open.click();
  await expect(gateway.getByRole('dialog')).toBeVisible();
  await expect(gateway.getByRole('button', { name: 'Close job details' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
  await gateway.getByRole('button', { name: 'Clear filters' }).click();
  await gateway.getByLabel('Show jobs').selectOption('Saved jobs');
  await expect(gateway.locator('article')).toHaveCount(1);
  await gateway.getByRole('button', { name: 'Save job — Learning data assistant' }).click();
  await expect(gateway.getByText(/No jobs match/)).toBeVisible();
});

test('career page and job dialog have no automated accessibility violations', async ({ page }) => {
  await page.goto('/demo/careers');
  await expect(page.getByRole('heading', { name: 'Copywriter', exact: true })).toBeVisible();
  for (const dialog of [false, true]) {
    if (dialog) await page.getByRole('button', { name: 'View details — Copywriter', exact: true }).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
    expect(result.violations).toEqual([]);
  }
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('certificate verifier handles valid, revoked and unknown demo records', async ({ page }) => {
  for (const [identifier, message] of [['DEMO-LEARNING-001','Valid fictional demo record.'],['DEMO-REVOKED-001','Revoked fictional demo record.'],['unknown','No matching demo record was found.']]) {
    await page.goto(`/demo/certificates/${identifier}?status=demo-valid`);
    await expect(page.getByRole('status')).toHaveText(message);
    await expect(page.getByText('DEMO — NOT AN ALX-ISSUED CREDENTIAL')).toBeVisible();
  }
});

test('Ethioware-style host uses the same working lesson and supports hide/show', async ({ page }) => {
  await page.goto('/demo/ethioware');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('heading', { name: 'Make a learning plan' })).toBeVisible();
  await lesson.getByRole('searchbox').fill('breaks');
  await expect(lesson.getByRole('status')).toHaveText('1 of 3 sections found.');
  await page.getByRole('button', { name: 'Hide Access learning tools' }).click();
  await expect(lesson).toBeHidden();
  await page.getByRole('button', { name: 'Show Access learning tools' }).click();
  await expect(lesson).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
