import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { createHash } from 'node:crypto';

let directory: string;
let calibration: Record<string, any>;
let bytes: Buffer;
let videoBytes: Buffer;
test.beforeAll(async () => {
  directory = await mkdtemp(join(process.cwd(), 'artifacts/hands-test-'));
  const builder = join(directory, 'builder.mjs');
  buildSync({ entryPoints: ['tests/fixtures/hands-calibration.mjs'], outfile: builder, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  execFileSync(process.execPath, [builder, directory], { stdio: 'pipe' });
  calibration = JSON.parse(await readFile(join(directory, 'calibration.json'), 'utf8'));
  bytes = await readFile(join(directory, 'calibration.glb'));
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=160x160:rate=24',
    '-pix_fmt', 'yuv420p', '-c:v', 'libx264', join(directory, 'calibration.mp4')]);
  videoBytes = await readFile(join(directory, 'calibration.mp4'));
});
test.afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

test('source playback, caption and transcript controls remain independent', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  const video = lesson.locator('.video-column video');
  await expect.poll(() => video.evaluate(element => element.duration)).toBeGreaterThan(120);
  const captions = lesson.getByRole('combobox', { name: 'Captions', exact: true });
  const root = page.locator('html');
  const captionSize = lesson.getByRole('combobox', { name: 'Caption size', exact: true });
  const baseSize = await root.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  await captionSize.selectOption('1.5');
  expect(await root.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(baseSize);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await root.evaluate(element => element.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await lesson.getByRole('button', { name: 'Reset caption preferences' }).click();
  expect(await root.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(baseSize);
  await expect(captions).toHaveValue('off');
  await captions.selectOption('on');
  await lesson.getByRole('button', { name: 'Jump to 0:41', exact: true }).click();
  await expect(lesson.locator('.active-caption')).toContainText("you're going to meet incredible people");
  expect(await video.evaluate(element => Array.from(element.textTracks, track => track.mode))).toEqual(['hidden']);
  await expect(lesson.getByRole('button', { name: 'Jump to 0:41', exact: true })).toBeFocused();
  await captions.selectOption('off');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await captions.selectOption('on');
  await video.evaluate(async element => { element.muted = true; await element.play(); });
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(false);
  await video.evaluate(element => element.pause());
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true);
  await expect(page.getByRole('button', { name: 'Mark demo lesson complete' })).toBeEnabled();
});

test('Savanna comparison shows the reconstructed baseline and returns to Access', async ({ page }) => {
  await page.goto('/demo/savanna?mode=before');
  await expect(page.locator('.comparison-status')).toHaveText('Showing the reconstructed standard Savanna video lesson.');
  await expect(page.getByText('Reconstructed baseline:', { exact: true })).toBeVisible();
  await expect(page.locator('.baseline-video video')).toBeVisible();
  await expect(page.locator('.baseline-video track')).toHaveCount(0);
  await expect(page.locator('alx-accessible-lesson')).toBeHidden();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'After With Access' }).click();
  await expect(page).toHaveURL(/mode=after/);
  await expect(page.locator('alx-accessible-lesson')).toBeVisible();
});

test('neutral hands load on demand, remain still, and support keyboard docking', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.locator('.media-view')).toBeVisible();
  await expect.poll(() => lesson.locator('.video-column video').evaluate(element => element.readyState >= 2)).toBe(true);
  expect(requests.some(url => url.includes('timing-avatar-'))).toBe(false);
  const toggle = lesson.getByRole('button', { name: 'Show 3D hands preview' });
  await toggle.focus(); await page.keyboard.press('Enter');
  const panel = lesson.locator('.avatar-panel');
  await expect(panel.getByRole('heading')).toHaveText('3D hands preview · EthSL review pending');
  await expect(panel.getByRole('status')).toContainText('EthSL interpretation unavailable');
  const canvas = panel.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const before = await canvas.screenshot();
  await lesson.getByRole('button', { name: 'Jump to 0:50', exact: true }).click();
  await expect(panel).toHaveAttribute('data-cue-id', 'cue-8');
  await expect(panel.locator('.avatar-clock')).toHaveText('Video time 0:50');
  await canvas.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  expect(await canvas.screenshot()).toEqual(before);
  await lesson.getByRole('combobox', { name: 'Signing panel position' }).selectOption('below');
  await expect(lesson.locator('.media-stage')).toHaveClass(/avatar-below/);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const panelBox = (await panel.boundingBox())!;
  const controlsBox = (await lesson.locator('.media-options').boundingBox())!;
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(controlsBox.y);
  await lesson.getByRole('button', { name: 'Hide 3D hands preview' }).click();
  await expect(panel.locator('canvas')).toHaveCount(0);
});

test('worksheet preserves all 16 cue IDs with empty EthSL motion slots', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByText('EthSL recording and review', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await lesson.getByRole('button', { name: 'Download caption-to-motion worksheet' }).click();
  const download = await pending;
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(data.target_sign_language).toBe('ethsl');
  expect(data.cues).toHaveLength(16);
  expect(data.cues.map((cue: { id: string }) => cue.id)).toEqual(Array.from({ length: 16 }, (_, index) => `cue-${index + 1}`));
  expect(data.cues.every((cue: { motion: unknown; interpreter_video: unknown }) => cue.motion === null && cue.interpreter_video === null)).toBe(true);
  await expect(lesson.locator('iframe')).toHaveCount(0);
  await expect(lesson.getByRole('combobox', { name: 'Avatar sign language' })).toHaveCount(0);
});

test('upstream caption controls survive and extended timelines clear the hands panel', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.locator('.media-view')).toBeVisible();
  await lesson.evaluate(element => element.setAttribute('lesson-id', 'w3c-colors-with-good-contrast'));
  await expect(lesson.getByRole('heading', { name: 'Colors with Good Contrast', exact: true })).toBeVisible();
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('am');
  await expect(lesson.getByRole('status').filter({ hasText: 'Amharic · review pending. Human review is pending.' })).toBeVisible();
  await lesson.getByRole('combobox', { name: 'Caption appearance', exact: true }).selectOption('yellow');
  await lesson.getByRole('button', { name: 'Reset caption preferences', exact: true }).click();
  await expect(lesson.getByRole('combobox', { name: 'Caption appearance', exact: true })).toHaveValue('default');
  await lesson.getByText('Low-data audio and offline media', { exact: true }).click();
  await expect(lesson.getByRole('link', { name: 'Download audio only · 48 kbps', exact: true })).toHaveAttribute('href', /\/media\/audio\?version=1$/);
  await lesson.getByRole('button', { name: 'Show 3D hands preview', exact: true }).click();
  await expect(lesson.locator('.avatar-panel canvas')).toBeVisible();
  await lesson.getByRole('button', { name: 'Use audio-described video', exact: true }).click();
  await expect(lesson.locator('.avatar-panel')).toBeHidden();
  await expect(lesson.getByRole('button', { name: 'Show 3D hands preview', exact: true })).toBeDisabled();
  await lesson.getByRole('button', { name: 'Use standard video', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Show 3D hands preview', exact: true })).toBeEnabled();
});

test('synthetic GLB regression follows seeks, holds, gaps, rates and replay', async ({ page }) => {
  await page.route('**/signing-assets/calibration.glb?version=1', route => route.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
  await page.route('**/signing-manifest?**', route => route.fulfill({ json: calibration }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  const source = lesson.locator('.video-column video');
  await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
  const panel = lesson.locator('.avatar-panel');
  await expect(panel.getByRole('status')).toContainText('unavailable');
  for (const time of [1, 2, 7, 2, 1]) {
    await source.evaluate((element, value) => { element.currentTime = value; }, time);
    await expect(panel).toHaveAttribute('data-review-status', 'approved');
  }
  await source.evaluate(element => { element.currentTime = 10; });
  await expect(panel).toHaveAttribute('data-review-status', 'awaiting-recording');
  const empty = await panel.locator('canvas').screenshot();
  await source.evaluate(element => { element.currentTime = 2; element.playbackRate = 1.5; });
  await expect(panel).toHaveAttribute('data-review-status', 'approved');
  expect(await panel.locator('canvas').screenshot()).not.toEqual(empty);
  await source.evaluate(async element => { element.muted = true; await element.play(); });
  await expect.poll(() => source.evaluate(element => element.currentTime)).toBeGreaterThan(2.1);
  await source.evaluate(element => element.pause());
  const paused = await panel.locator('canvas').screenshot();
  await page.waitForTimeout(200);
  expect(await panel.locator('canvas').screenshot()).toEqual(paused);
  await source.evaluate(element => { element.currentTime = 0; });
  await expect(panel).toHaveAttribute('data-review-status', 'awaiting-recording');
});

test('changed hashes or legacy rigs fail closed without losing captions', async ({ page }) => {
  const changed = structuredClone(calibration);
  changed.rig.sha256 = '0'.repeat(64);
  await page.route('**/signing-assets/calibration.glb?version=1', route => route.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
  await page.route('**/signing-manifest?**', route => route.fulfill({ json: changed }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('assets unavailable');
  await lesson.getByRole('button', { name: 'Jump to 0:41', exact: true }).click();
  await expect(lesson.locator('.active-caption')).toContainText('incredible people');
  await lesson.getByRole('button', { name: 'Hide 3D hands preview' }).click();
  changed.rig.sha256 = calibration.rig.sha256;
  changed.rig_version = 'legacy-full-character';
  await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('assets unavailable');
  await expect(lesson.locator('.active-caption')).toContainText('incredible people');
});

test('reviewed video works without 3D and follows time, rate, stalls and gaps', async ({ page }) => {
  await page.route('**/timing-avatar-*.js', route => route.fulfill({ status: 503 }));
  const manifest = structuredClone(calibration);
  manifest.rig = null;
  const asset = { url: '/api/v1/lessons/alx-transforming-africa/signing-assets/calibration.mp4?version=1',
    sha256: createHash('sha256').update(videoBytes).digest('hex') };
  Object.assign(manifest.segments[0], { motion: null, clip_name: null, presentation: 'interpreter-video',
    interpreter_video: asset, requires_non_manual: true });
  await page.route('**/signing-assets/calibration.mp4?version=1', route => route.fulfill({ contentType: 'video/mp4', body: videoBytes }));
  await page.route('**/signing-manifest?**', route => route.fulfill({ json: manifest }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  const source = lesson.locator('.video-column video');
  const signed = lesson.locator('.interpreter-video');
  await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('unavailable');
  await source.evaluate(element => { element.currentTime = 1.5; element.playbackRate = 1.5; });
  await expect(signed).toBeVisible();
  await expect.poll(() => signed.evaluate(element => element.currentTime)).toBeCloseTo(.5, 1);
  await expect.poll(() => signed.evaluate(element => element.readyState >= 3 && !element.seeking)).toBe(true);
  expect(await signed.evaluate(element => element.playbackRate)).toBe(1.5);
  expect(await signed.evaluate(element => element.muted)).toBe(true);
  await source.evaluate(async element => { element.muted = true; await element.play(); });
  await expect.poll(() => signed.evaluate(element => element.currentTime)).toBeGreaterThan(.6);
  await expect.poll(() => signed.evaluate(element => !element.seeking)).toBe(true);
  await signed.evaluate(element => element.dispatchEvent(new Event('waiting')));
  await expect.poll(() => source.evaluate(element => element.paused)).toBe(true);
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('Playback paused');
  await expect.poll(() => signed.evaluate(element => element.paused)).toBe(true);
  await signed.evaluate(element => element.dispatchEvent(new Event('canplay')));
  await expect(lesson.locator('.avatar-panel')).toHaveAttribute('data-review-status', 'approved-video');
  await source.evaluate(element => { element.currentTime = 10; });
  await expect(signed).toBeHidden();
  await expect(signed).not.toHaveAttribute('src');
  await source.evaluate(element => { element.currentTime = 1.25; });
  await expect(signed).toBeVisible();
  await expect.poll(() => signed.evaluate(element => element.currentTime)).toBeCloseTo(.25, 1);
});

test('missing interpreter video pauses playback and retains text fallback', async ({ page }) => {
  const manifest = structuredClone(calibration);
  manifest.rig = null;
  Object.assign(manifest.segments[0], { motion: null, clip_name: null, presentation: 'interpreter-video',
    interpreter_video: { url: '/api/v1/missing.mp4', sha256: '0'.repeat(64) }, hands_ambiguous: true });
  await page.route('**/signing-manifest?**', route => route.fulfill({ json: manifest }));
  await page.route('**/api/v1/missing.mp4', route => route.fulfill({ status: 404 }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  const source = lesson.locator('.video-column video');
  await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('unavailable');
  await source.evaluate(async element => {
    element.currentTime = 1; element.muted = true;
    try { await element.play(); } catch (error) { if (error.name !== 'AbortError') throw error; }
  });
  await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('Playback paused');
  await expect.poll(() => source.evaluate(element => element.paused)).toBe(true);
  await expect(lesson.locator('.active-caption')).toContainText('community');
  await expect(lesson.locator('.interpreter-video')).toBeHidden();
});

for (const [name, width, height] of [['desktop', 1440, 1100], ['mobile', 320, 900]] as const) {
  test(`capture ${name} hands preview`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const lesson = page.locator('alx-accessible-lesson');
    await lesson.getByRole('button', { name: 'Show 3D hands preview' }).click();
    await expect(lesson.locator('.avatar-panel canvas')).toBeVisible();
    await expect(lesson.locator('.avatar-panel').getByRole('status')).toContainText('unavailable');
    await expect.poll(() => lesson.locator('.video-column video').evaluate(element => element.readyState >= 2)).toBe(true);
    await lesson.locator('.avatar-panel').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await lesson.locator('.avatar-panel').screenshot({ path: testInfo.outputPath(`hands-${name}-panel.png`) });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: testInfo.outputPath(`hands-${name}.png`), fullPage: true });
    if (name === 'desktop') {
      await lesson.getByRole('combobox', { name: 'Signing panel position' }).selectOption('below');
      await lesson.locator('.avatar-panel').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await lesson.locator('.avatar-panel').screenshot({ path: testInfo.outputPath('hands-desktop-below-panel.png') });
    }
  });
}
