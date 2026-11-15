import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildSync } from 'esbuild';

let directory: string;
let studyFiles: string[];
let manifestPath: string;
test.beforeAll(async () => {
  directory = await mkdtemp(join(process.cwd(), 'artifacts/hands-review-'));
  const builder = join(directory, 'builder.mjs');
  const source = join(directory, 'source');
  const output = join(directory, 'study');
  execFileSync('.venv/bin/python', ['scripts/prepare_signing.py', '--language', 'ethsl', '--output-dir', source]);
  buildSync({ entryPoints: ['scripts/build_hands_preview.mjs'], outfile: builder, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  execFileSync(process.execPath, [builder, '--manifest', join(source, 'alx-transforming-africa-v1-ethsl.json'), '--output', output]);
  studyFiles = (await readdir(output)).map(name => join(output, name));
  manifestPath = studyFiles.find(path => path.endsWith('.json'))!;
});
test.afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

test('exact local rig review hides source before observation and never grants approval', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/demo/avatar-review');
  await page.getByLabel('Load a language manifest and its GLB files').setInputFiles(studyFiles);
  await page.getByRole('button', { name: 'Load draft performance', exact: true }).click();
  await expect(page.locator('#status')).toContainText('0 draft clips · 16 phrase slots');
  await expect(page.locator('#avatar canvas')).toBeVisible();
  await expect(page.locator('#video')).toBeHidden();
  expect(await page.locator('#video').evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(page.locator('#caption')).toContainText('Caption hidden');
  await expect(page.locator('#reveal')).toBeDisabled();
  await page.getByLabel('Observation', { exact: true }).fill('Neutral rig only; no interpretation to review.');
  await page.getByRole('button', { name: 'Save observation at current time' }).click();
  await page.locator('#reveal').click();
  await expect(page.locator('#video')).toBeVisible();
  await expect(page.locator('#caption')).toHaveText('[Music]');
  await page.locator('#video').evaluate((element: HTMLVideoElement) => { element.muted = false; });
  await page.locator('#cue').selectOption('cue-2');
  await expect(page.locator('#video')).toBeHidden();
  expect(await page.locator('#video').evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(page.locator('#reveal')).toBeDisabled();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download feedback JSON' }).click();
  const downloaded = await pending;
  const report = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(report.review_status).toBe('feedback-only');
  expect(report.translation_status).toBe('pending');
  expect(report.manifest_sha256).toBe(createHash('sha256').update(await readFile(manifestPath)).digest('hex'));
  expect(report.observations[0].phase).toBe('blind-comprehension');
  expect(report.rig_version).toBe('access-hands-v1');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('local importer rejects changed rig bytes and ASL studies', async ({ page }) => {
  await page.goto('/demo/avatar-review');
  const data = JSON.parse(await readFile(manifestPath, 'utf8'));
  data.rig.sha256 = '0'.repeat(64);
  const files = await Promise.all(studyFiles.filter(path => path.endsWith('.glb')).map(async path => ({ name: basename(path), mimeType: 'model/gltf-binary', buffer: await readFile(path) })));
  for (const expected of ['hash mismatch', 'EthSL hands-only']) {
    await page.getByLabel('Load a language manifest and its GLB files').setInputFiles([
      ...files, { name: 'manifest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) },
    ]);
    await page.getByRole('button', { name: 'Load draft performance' }).click();
    await expect(page.locator('#status')).toContainText(expected);
    await expect(page.locator('#avatar canvas')).toHaveCount(0);
    data.language = 'asl';
  }
});

test('local importer preserves source phrase traceability', async ({ page }) => {
  await page.goto('/demo/avatar-review');
  const original = JSON.parse(await readFile(manifestPath, 'utf8'));
  const files = await Promise.all(studyFiles.filter(path => path.endsWith('.glb')).map(async path => ({
    name: basename(path), mimeType: 'model/gltf-binary', buffer: await readFile(path),
  })));
  for (const changed of [
    { ...original, course_version_id: 'unrelated-course' },
    { ...original, segments: [{ ...original.segments[1], cue_ids: ['cue-2', 'cue-4'] }] },
    { ...original, segments: [{ ...original.segments[1], source_text: 'Guessed translation' }] },
  ]) {
    await page.getByLabel('Load a language manifest and its GLB files').setInputFiles([
      ...files, { name: 'manifest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) },
    ]);
    await page.getByRole('button', { name: 'Load draft performance' }).click();
    await expect(page.locator('#status')).toContainText('Study unavailable.');
    await expect(page.locator('#avatar canvas')).toHaveCount(0);
  }
});

test('legacy capture baking still preserves whole takes and rejects timing overflow', async () => {
  const capturePath = join(directory, 'single-take.jsonl');
  const frames = [0, .5, 1, 1.5, 2].map(time => ({ type: 'frame', time,
    pose_world: Array.from({ length: 33 }, () => [0, 0, 0]), pose_visibility: Array(33).fill(1),
    handedness_ambiguous: false, hands: {}, face_blendshapes: {} }));
  const capture = (selected: typeof frames) => [{ type: 'metadata', source_sha256: '0'.repeat(64), fps: 2 },
    ...selected, { type: 'summary', frames: selected.length }].map(record => JSON.stringify(record)).join('\n');
  await writeFile(capturePath, capture(frames.filter(frame => frame.time < 1)));
  const source = JSON.parse(await readFile(manifestPath, 'utf8'));
  source.segments = [{ ...source.segments[0], id: 'test-cue', start: 0, end: 2 }];
  const pending = join(directory, 'pending.json');
  await writeFile(pending, JSON.stringify(source));
  const output = join(directory, 'legacy-single-take');
  const args = ['scripts/build_avatar_study.mjs', '--manifest', pending, '--capture', capturePath,
    '--output', output, '--source-kind', 'interpreter-draft', '--segment', 'test-cue'];
  execFileSync(process.execPath, args);
  const result = JSON.parse(await readFile(join(output, 'alx-transforming-africa-v1-ethsl.json'), 'utf8'));
  expect(result.segments[0].status).toBe('machine-draft');
  expect(result.segments[0].natural_duration).toBe(1);
  await writeFile(capturePath, capture(frames));
  expect(() => execFileSync(process.execPath, args, { stdio: 'pipe' })).toThrow(/Complete take must fit/);
});
