import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';

let directory: string;
let studyFiles: string[];
let manifestPath: string;
test.beforeAll(async ({ request }) => {
  directory = await mkdtemp(join(tmpdir(), 'access-avatar-test-'));
  const pose = Array.from({ length: 33 }, () => [0, 0, 0]);
  for (const [index, position] of [
    [11, [.3, -.5, 0]], [12, [-.3, -.5, 0]], [23, [.2, .1, 0]], [24, [-.2, .1, 0]],
    [13, [.5, -.2, 0]], [14, [-.5, -.2, 0]], [15, [.4, -.6, -.2]], [16, [-.4, -.6, -.2]],
    [2, [.05, -.85, -.1]], [5, [-.05, -.85, -.1]], [7, [.1, -.8, 0]], [8, [-.1, -.8, 0]],
    [9, [.03, -.75, -.1]], [10, [-.03, -.75, -.1]],
  ] as [number, number[]][]) pose[index] = position;
  const hand = Array.from({ length: 21 }, (_, i) => [(i % 4 - 1.5) * .02, -.02 * i, 0]);
  const frames = [0, .5, 1, 1.5, 2].map(time => ({ type: 'frame', time, pose_world: pose,
    pose_visibility: Array(33).fill(1), handedness_ambiguous: false,
    hands: { Left: { world: hand, confidence: 1 }, Right: { world: hand, confidence: 1 } },
    face_blendshapes: { jawOpen: time / 2, browInnerUp: .5 },
  }));
  const capture = [{ type: 'metadata', source_sha256: '0'.repeat(64) }, ...frames, { type: 'summary', frames: frames.length }];
  await writeFile(join(directory, 'capture.jsonl'), capture.map(item => JSON.stringify(item)).join('\n'));
  const binding = await (await request.get('/api/v1/lessons/alx-transforming-africa/signing-manifest?lang=ethsl&version=1')).json();
  const source = { schema_version: '1.0', lesson_id: 'alx-transforming-africa', content_version: 1,
    course_version_id: 'alx-demo-v1', media_id: 'alx-africa-intro-v1', language: 'ethsl',
    video_sha256: binding.video_sha256, captions_sha256: binding.captions_sha256, rig: null,
    segments: [{ id: 'test-cue', cue_ids: ['cue-1'], start: 0, end: 2, source_text: 'Synthetic calibration test',
      text_sha256: '0'.repeat(64), status: 'awaiting-recording', motion: null, playback_rate: 1 }],
  };
  await writeFile(join(directory, 'pending.json'), JSON.stringify(source));
  const output = join(directory, 'study');
  execFileSync(process.execPath, ['scripts/build_avatar_study.mjs', '--manifest', join(directory, 'pending.json'),
    '--capture', join(directory, 'capture.jsonl'), '--output', output, '--source-kind', 'presenter-study']);
  studyFiles = (await readdir(output)).filter(name => name.endsWith('.glb') || name.endsWith('-ethsl.json')).map(name => join(output, name));
  manifestPath = studyFiles.find(path => path.endsWith('.json'))!;
});
test.afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

test('local articulated draft plays and feedback preserves pending review', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/demo/avatar-review');
  await expect(page.getByText('Unreviewed motion study.', { exact: true })).toBeVisible();
  await page.getByLabel('Load a language manifest and its GLB files').setInputFiles(studyFiles);
  await page.getByRole('button', { name: 'Load draft performance', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Loaded 1 ETHSL-target draft clips');
  await expect(page.locator('#avatar canvas')).toBeVisible();
  await page.locator('video').evaluate(element => { element.currentTime = 1; });
  await expect(page.locator('#motion')).toHaveAttribute('data-motion-id', 'test-cue');
  await page.getByLabel('Observation', { exact: true }).fill('Synthetic test observation');
  await page.getByRole('button', { name: 'Save observation at current time' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download feedback JSON' }).click();
  const downloaded = await pending;
  const report = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(report.review_status).toBe('feedback-only');
  expect(report.translation_status).toBe('pending');
  expect(report.manifest_sha256).toBe(createHash('sha256').update(await readFile(manifestPath)).digest('hex'));
  expect(report.observations[0].notes).toBe('Synthetic test observation');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('local draft import rejects changed GLB hashes', async ({ page }) => {
  await page.goto('/demo/avatar-review');
  const data = JSON.parse(await readFile(manifestPath, 'utf8'));
  data.rig.sha256 = '0'.repeat(64);
  await page.getByLabel('Load a language manifest and its GLB files').setInputFiles([
    ...await Promise.all(studyFiles.filter(path => path.endsWith('.glb')).map(async path => ({
      name: basename(path), mimeType: 'model/gltf-binary', buffer: await readFile(path),
    }))),
    { name: 'changed-ethsl.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) },
  ]);
  await page.getByRole('button', { name: 'Load draft performance', exact: true }).click();
  await expect(page.locator('#status')).toContainText('hash mismatch');
  await expect(page.getByRole('button', { name: 'Save observation at current time' })).toBeDisabled();
});

test('single-phrase baking preserves complete duration and rejects overflow', async () => {
  const capturePath = join(directory, 'single-take.jsonl');
  const records = (await readFile(join(directory, 'capture.jsonl'), 'utf8')).split('\n').map(line => JSON.parse(line));
  const frames = records.filter(record => record.type === 'frame' && record.time < 1);
  await writeFile(capturePath, [{ type: 'metadata', source_sha256: '0'.repeat(64), fps: 2 }, ...frames,
    { type: 'summary', frames: frames.length }].map(record => JSON.stringify(record)).join('\n'));
  const output = join(directory, 'single-take');
  execFileSync(process.execPath, ['scripts/build_avatar_study.mjs', '--manifest', join(directory, 'pending.json'),
    '--capture', capturePath, '--output', output, '--source-kind', 'interpreter-draft', '--segment', 'test-cue']);
  const manifest = JSON.parse(await readFile(join(output, 'alx-transforming-africa-v1-ethsl.json'), 'utf8'));
  expect(manifest.segments[0].status).toBe('machine-draft');
  expect(manifest.segments[0].natural_duration).toBe(1);
  expect(() => execFileSync(process.execPath, ['scripts/build_avatar_study.mjs', '--manifest', join(directory, 'pending.json'),
    '--capture', join(directory, 'capture.jsonl'), '--output', join(directory, 'overflow'),
    '--source-kind', 'interpreter-draft', '--segment', 'test-cue'], { stdio: 'pipe' })).toThrow(/Complete take must fit/);
});
