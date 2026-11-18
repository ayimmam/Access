import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('judging walkthrough seeks on the correct edition, preserves focus and opens the same lesson in the installer', async ({ page }) => {
  await page.goto('/demo/judging');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('heading', { name: 'Colors with Good Contrast' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(lesson.getByText('Reviewed EthSL interpretation is unavailable for this lesson.')).toBeVisible();
  await expect(lesson.getByRole('button', { name: 'Show 3D hands preview' })).toHaveCount(0);

  const video = lesson.getByLabel('Lesson video', { exact: true });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.duration)).toBeGreaterThan(60);
  const search = lesson.getByRole('searchbox');
  await search.fill('poor contrast');
  const standardJump = lesson.getByRole('button', { name: 'Jump to 0:15', exact: true });
  await standardJump.focus();
  await standardJump.press('Enter');
  await expect(standardJump).toBeFocused();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(15.02, 2);

  const captions = lesson.getByRole('combobox', { name: 'Captions', exact: true });
  const cue = lesson.locator('.active-caption');
  await captions.selectOption('en');
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true;
    await element.play();
  });
  await expect(cue).toContainText('poor contrast');
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await captions.selectOption('am');
  await expect(cue).toHaveAttribute('lang', 'am');
  await expect(cue).toContainText('ደካማ');
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = 0; });
  await expect(cue).toBeEmpty();

  await captions.selectOption('en');
  await lesson.getByRole('button', { name: 'Use audio-described video' }).press('Enter');
  await expect(lesson.getByRole('heading', { name: 'Transcript for the audio-described edition' })).toBeVisible();
  await expect(search).toHaveValue('poor contrast');
  const describedJump = lesson.getByRole('button', { name: 'Jump to 0:23', exact: true });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.duration)).toBeGreaterThan(98);
  await describedJump.press('Enter');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(23.58, 2);
  await search.fill('useful for all');
  await lesson.getByRole('button', { name: 'Jump to 1:14', exact: true }).press('Enter');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(74.1, 2);
  await expect(cue).toContainText('useful for all');

  await lesson.getByRole('button', { name: 'Use standard video' }).press('Enter');
  await expect(lesson.getByRole('button', { name: 'Jump to 0:51', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);

  await page.getByRole('link', { name: 'Open the installer with this lesson selected' }).click();
  await expect(page.getByRole('combobox', { name: 'Lesson', exact: true })).toHaveValue('w3c-colors-with-good-contrast');
  await page.getByRole('button', { name: 'Install component', exact: true }).click();
  await expect(lesson.getByRole('heading', { name: 'Colors with Good Contrast' })).toBeVisible();
  await expect(page.locator('#events')).toContainText('alx-media-ready');
  await expect(page.locator('#snippet')).toHaveValue(/lesson-id="w3c-colors-with-good-contrast" content-version="1"/);
});
