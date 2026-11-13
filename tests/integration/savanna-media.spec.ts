import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

function testAnimationGlb() {
  const values = Buffer.alloc(40);
  [0, 2, 0, 0, 0, 1, 0, .3, 0, .953939].forEach((value, index) => values.writeFloatLE(value, index * 4));
  const document = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'TestHand' }],
    buffers: [{ byteLength: values.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 8 }, { buffer: 0, byteOffset: 8, byteLength: 32 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [2] }, { bufferView: 1, componentType: 5126, count: 2, type: 'VEC4' }],
    animations: [{ name: 'test-action', samplers: [{ input: 0, output: 1 }], channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }] }],
  };
  const text = JSON.stringify(document);
  const json = Buffer.from(text + ' '.repeat((4 - Buffer.byteLength(text) % 4) % 4));
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + values.length, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8); binaryHeader.writeUInt32LE(values.length, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binaryHeader, values]);
}

test('Savanna demo plays the supplied video with caption and transcript controls', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  const video = lesson.locator('video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate(element => element.duration)).toBeGreaterThan(120);
  await expect(lesson.locator('track')).toHaveAttribute('srclang', 'en');
  await lesson.getByRole('button', { name: 'Jump to 0:41', exact: true }).click();
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeGreaterThan(40);
  await expect(lesson.locator('.active-caption')).toContainText("you're going to meet incredible people");
  await expect(lesson.getByRole('button', { name: 'Jump to 0:41', exact: true })).toBeFocused();
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('off');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('on');
  await video.evaluate(async element => { element.muted = true; await element.play(); });
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(false);
  await video.evaluate(element => element.pause());
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true);
});

test('3D timing prototype is explicitly labeled and follows seek/pause and docking', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('button', { name: 'Show 3D timing prototype' }).click();
  const panel = lesson.getByRole('complementary', { name: '3D avatar timing prototype' });
  await expect(panel.getByText('Ethiopian Sign Language review pending. Procedural motions demonstrate timing only.')).toBeVisible();
  await expect(panel.getByRole('status')).toHaveText('Timing preview ready. EthSL review pending.');
  await expect(panel.locator('canvas')).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await lesson.getByRole('button', { name: 'Jump to 0:50', exact: true }).click();
  await expect(panel).toHaveAttribute('data-cue-id', 'cue-8');
  await expect(panel.locator('.avatar-clock')).toHaveText('Video time 0:50');
  await lesson.getByRole('combobox', { name: 'Avatar position' }).selectOption('below');
  await expect(lesson.locator('.media-stage')).toHaveClass(/avatar-below/);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await lesson.getByRole('button', { name: 'Hide 3D timing prototype' }).click();
  await expect(panel).toBeHidden();
  await expect(panel.locator('canvas')).toHaveCount(0);
});

test('host navigation and demo completion are independent of playback', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Mark demo lesson complete' })).toBeEnabled();
  await page.getByRole('button', { name: 'Mark demo lesson complete' }).click();
  await expect(page.locator('#completion-status')).toHaveText('Completed in this demo session.');
  await expect(page.locator('#progress-text')).toHaveText('1 of 1 lessons completed in this demo');
});

test('language selection prepares distinct EthSL and ASL motion worksheets', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('combobox', { name: 'Avatar sign language' }).selectOption('asl');
  await lesson.getByRole('button', { name: 'Generate avatar preview', exact: true }).click();
  const panel = lesson.getByRole('complementary', { name: '3D avatar timing prototype' });
  await expect(panel).toHaveAttribute('data-sign-language', 'asl');
  await expect(panel.getByRole('status')).toHaveText('Timing preview ready. ASL review pending.');
  await expect(panel.locator('.prototype-label')).toContainText('American Sign Language review pending');
  await lesson.getByText('Free sign-motion authoring tools', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await lesson.getByRole('button', { name: 'Download caption-to-motion worksheet' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toContain('-asl-motion-worksheet.json');
  const document = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(document.target_sign_language).toBe('asl');
  expect(document.character).toBe('African woman');
  expect(document.cues[0].source_text).toBe('[Music]');
  expect(document.cues.every((cue: { motion_asset: unknown }) => cue.motion_asset === null)).toBe(true);
  await lesson.getByRole('combobox', { name: 'Avatar sign language' }).selectOption('ethsl');
  await expect(panel).toHaveAttribute('data-sign-language', 'ethsl');
  await expect(panel.getByRole('status')).toHaveText('Timing preview ready. EthSL review pending.');
});

test('free external workspace loads on request and can be closed', async ({ page }) => {
  await page.route('https://performs.gti.upf.edu/**', route => route.fulfill({ contentType: 'text/html', body: '<html lang="en"><title>Performs test workspace</title></html>' }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.locator('iframe')).toHaveCount(0);
  await lesson.getByText('Free sign-motion authoring tools', { exact: true }).click();
  await lesson.getByRole('button', { name: 'Load free Performs workspace' }).click();
  await expect(lesson.locator('iframe')).toHaveAttribute('src', 'https://performs.gti.upf.edu/?controls=true&autoplay=false');
  await lesson.getByRole('button', { name: 'Close Performs workspace' }).click();
  await expect(lesson.locator('iframe')).toHaveCount(0);
});

test('reviewed GLB clips follow seeks and language changes clear prior assets', async ({ page }) => {
  const bytes = testAnimationGlb();
  const hash = createHash('sha256').update(bytes).digest('hex');
  const asset = { url: '/api/v1/lessons/alx-transforming-africa/signing-assets/test.glb?version=1', sha256: hash };
  await page.route('**/signing-assets/test.glb?version=1', route => route.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
  await page.route('**/signing-manifest?**', async route => {
    const language = new URL(route.request().url()).searchParams.get('lang');
    await route.fulfill({ json: {
      schema_version: '1.0', language, media_id: 'alx-africa-intro-v1', content_version: 1,
      rig: language === 'ethsl' ? asset : null, approved_count: language === 'ethsl' ? 1 : 0,
      segments: language === 'ethsl' ? [{ id: 'reviewed-test-only', start: 1, end: 9, status: 'approved', motion: asset, clip_name: 'test-action', natural_duration: 2, playback_rate: 1 }] : [],
    } });
  });
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('button', { name: 'Show 3D timing prototype' }).click();
  const panel = lesson.getByRole('complementary', { name: '3D avatar timing prototype' });
  await expect(panel.getByRole('status')).toHaveText('Timing preview ready. EthSL review pending.');
  await lesson.getByRole('button', { name: 'Jump to 0:01', exact: true }).click();
  await expect(panel).toHaveAttribute('data-review-status', 'approved');
  await expect(panel.getByRole('status')).toHaveText('EthSL reviewed motion · reviewed-test-only');
  await lesson.getByRole('button', { name: 'Jump to 0:41', exact: true }).click();
  await expect(panel).toHaveAttribute('data-review-status', 'awaiting-recording');
  await lesson.getByRole('button', { name: 'Jump to 0:01', exact: true }).click();
  await expect(panel).toHaveAttribute('data-review-status', 'approved');
  await lesson.getByRole('combobox', { name: 'Avatar sign language' }).selectOption('asl');
  await expect(panel).toHaveAttribute('data-review-status', 'awaiting-recording');
  await expect(panel.getByRole('status')).toHaveText('Timing preview ready. ASL review pending.');
});
