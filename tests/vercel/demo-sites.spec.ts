import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { useDemoApi } from '../helpers/demo-api';

test.beforeEach(async ({ page, baseURL }) => useDemoApi(page, baseURL));

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('EthioWare host loads the lesson tools and reflows at 320px', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Software Engineering Basics' })).toBeVisible();
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('heading', { name: 'Colors with Good Contrast' })).toBeVisible();
  const captions = lesson.getByRole('combobox', { name: 'Captions', exact: true });
  const video = lesson.locator('video').first();
  await expect(captions).toHaveValue('off');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await captions.selectOption('am');
  await expect(lesson.getByText('Amharic · review pending. Human review is pending.')).toBeVisible();
  expect(await video.evaluate(element => Array.from(element.textTracks, track => track.mode))).not.toContain('showing');
  await lesson.getByRole('button', { name: 'Use audio-described video' }).click();
  await expect(lesson.getByText('Audio-described video selected.')).toBeVisible();
  await expect(captions).toHaveValue('off');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await lesson.getByRole('button', { name: 'Reset caption preferences' }).click();
  await expect(lesson.getByText('Caption preferences reset.')).toBeVisible();
  await expect(captions).toHaveValue('off');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await expect(lesson.getByRole('link', { name: /tagged PDF prototype/ })).toBeVisible();
  await expect(lesson.getByRole('link', { name: /BRF prototype/ })).toBeVisible();
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

test('EthioWare recorded-session fixture remains searchable and clearly fictional', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  await page.getByText('Recorded-session replay demo').click();
  await expect(page.getByText('Fictional replay:', { exact: true })).toBeVisible();
  await page.getByLabel('Find in replay').fill('checker');
  await expect(page.locator('#replay-count')).toHaveText('2 of 3 replay entries found.');
  await expect(page.locator('#replay-log li:visible')).toHaveCount(2);
});

test('EthioWare comparison preserves a realistic baseline and shareable mode', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/?mode=before', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.comparison-status')).toHaveText('Showing the reconstructed standard course reader.');
  await expect(page.getByText('Reconstructed baseline:', { exact: true })).toBeVisible();
  await expect(page.locator('[data-experience-view="before"] video track')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Choose one goal' })).toBeVisible();
  await expect(page.locator('alx-accessible-lesson')).toBeHidden();
  await page.getByRole('button', { name: 'After With Access' }).click();
  await expect(page).toHaveURL(/mode=after/);
  await expect(page.locator('alx-accessible-lesson')).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
});

test('Career Gateway filters jobs and restores dialog focus', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/');
  await expect(page.getByText('11 jobs found.')).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search jobs by title, skill or employer' });
  await search.fill('developer');
  await expect(page.getByText('1 job found.')).toBeVisible();
  const open = page.getByRole('button', { name: 'View details — Junior web developer' });
  await page.getByRole('button', { name: 'Play recorded summary — Junior web developer' }).click();
  await expect(page.getByLabel('Recorded job summary')).toBeVisible();
  await expect(page.getByLabel('Recorded job summary')).toHaveAttribute('src', /demo-web-developer\.mp3$/);
  await expect.poll(() => page.getByLabel('Recorded job summary').evaluate((audio: HTMLAudioElement) => audio.duration || 0)).toBeGreaterThan(10);
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

test('Career Gateway comparison filters the baseline and switches to Access', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/?mode=before');
  await expect(page.locator('.comparison-status')).toHaveText('Showing the reconstructed standard vacancy listings.');
  await expect(page.getByText('11 vacancies found.')).toBeVisible();
  await page.getByLabel('Search vacancies').fill('developer');
  await expect(page.getByText('1 vacancy found.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Junior web developer' })).toBeVisible();
  await expect(page.locator('access-career-gateway')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-access-mode', 'before');
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'After With Access' }).click();
  await expect(page).toHaveURL(/mode=after/);
  await expect(page.getByText('11 jobs found.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-access-mode', 'after');
  await expect(page.getByRole('heading', { name: 'Listen to job summaries' })).toBeVisible();
});

test('fictional certificate page exposes only the public record fields', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/certificate.html?id=DEMO-LEARNING-001');
  await expect(page.getByRole('status')).toHaveText('Valid fictional demo record.');
  await expect(page.getByText('DEMO — NOT AN ALX-ISSUED CREDENTIAL')).toBeVisible();
  await expect(page.locator('#record dt')).toHaveText(['Course', 'Issued']);
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
});

test('Ethioware catalog search opens the matching course preview and practice reader', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');
  const search = page.getByRole('searchbox', { name: 'Search courses' });
  await search.fill('Research Scholars');
  await expect(page.locator('.catalog-card:visible')).toHaveCount(1);
  await search.press('Enter');
  await expect(page).toHaveURL(/#courses$/);
  await page.getByRole('link', { name: 'Get started with Research Scholars' }).click();
  const preview = page.getByRole('region', { name: 'Research Scholars' });
  await expect(preview).toBeVisible();
  await expect(preview).toBeFocused();
  await preview.getByRole('link', { name: 'Open Access practice lesson' }).click();
  await expect(page.locator('#lesson-workspace')).toBeFocused();
  await expect(page.locator('alx-accessible-lesson').getByRole('heading', { name: 'Colors with Good Contrast' })).toBeVisible();
});
