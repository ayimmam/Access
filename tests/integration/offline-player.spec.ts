import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';

for (const [lesson, languages] of [
  ['alx-transforming-africa', ['en', 'am', 'om', 'ti']],
  ['w3c-colors-with-good-contrast', ['en', 'am', 'ti']],
] as const) {
  test(`downloaded ${lesson} plays from a local file offline`, async ({ page, context }, info) => {
    await page.goto('/demo/savanna?lesson=' + lesson);
    const download = page.waitForEvent('download');
    const link = page.getByRole('link', { name: 'Download for offline access', exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    const file = await download;
    expect(file.suggestedFilename()).toBe(lesson + '-v1-player.html');
    const path = info.outputPath(file.suggestedFilename());
    await file.saveAs(path);
    await context.setOffline(true);
    const external: string[] = [];
    page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await page.goto(pathToFileURL(path).href);
    const media = page.locator('video');
    await expect.poll(() => media.evaluate(v => v.duration)).toBeGreaterThan(60);
    const language = page.getByLabel('Caption and transcript language');
    for (const code of languages) {
      await language.selectOption(code);
      await expect(page.locator('ol')).toHaveAttribute('lang', code);
      await expect.poll(() => media.evaluate(v => v.querySelector('track')?.track.cues?.length ?? 0)).toBeGreaterThan(0);
    }
    const jump = page.getByRole('button', { name: /Jump to/ }).nth(2);
    await jump.focus();
    await page.keyboard.press('Enter');
    await expect(jump).toBeFocused();
    const passage = await jump.locator('..').textContent();
    await expect.poll(() => media.evaluate(v => Array.from(v.querySelector('track')?.track.activeCues ?? [],
      cue => (cue as VTTCue).text))).toContain(passage!.slice((await jump.textContent())!.length).trim());
    await media.evaluate(async v => { v.muted = true; await v.play(); });
    await expect.poll(() => media.evaluate(v => v.paused)).toBe(false);
    if (lesson.startsWith('alx')) {
      await page.getByLabel('Avatar language').selectOption('ethsl');
      await expect(page.locator('#canvas canvas')).toBeVisible();
      await page.getByLabel('Avatar language').selectOption('off');
      await expect(page.locator('#canvas')).toBeHidden();
    } else {
      await page.getByLabel('Media edition').selectOption('described');
      await expect.poll(() => media.evaluate(v => v.duration)).toBeGreaterThan(98);
      await expect(language.locator('option')).toHaveCount(1);
      await page.getByLabel('Media edition').selectOption('described-audio');
      await expect.poll(() => media.evaluate(v => v.duration)).toBeGreaterThan(98);
    }
    await page.getByLabel('Show captions').uncheck();
    await expect.poll(() => media.evaluate(v => v.querySelector('track')?.track.mode)).toBe('disabled');
    await page.getByLabel('Find text in the transcript').fill('no-such-passage');
    await expect(page.locator('#matches')).toHaveText('0 matching passages');
    expect(external).toEqual([]);
  });
}
