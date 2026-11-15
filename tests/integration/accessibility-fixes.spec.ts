import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('each edition exposes matching transcript seek times and blank caption gaps', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson').first();
  const video = lesson.locator('.video-column video');
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('en');
  await lesson.getByRole('searchbox').fill('Good design');
  const standard = lesson.getByRole('button', { name: 'Jump to 0:20', exact: true });
  await standard.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeCloseTo(20.92, 1);
  await expect(standard).toBeFocused();
  await lesson.getByRole('button', { name: 'Use audio-described video' }).click();
  const described = lesson.getByRole('button', { name: 'Jump to 0:31', exact: true });
  await expect(described).toBeVisible();
  await described.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeCloseTo(31.32, 1);
  await expect(described).toBeFocused();
  await expect(lesson.locator('.active-caption')).toHaveAttribute('lang', 'en');
  await expect(lesson.locator('.active-caption')).toContainText('Good design');
  await video.evaluate(element => { element.currentTime = 30; });
  await expect(lesson.locator('.active-caption')).toHaveText('');
  await lesson.getByRole('searchbox').fill('Essential');
  await lesson.getByRole('button', { name: 'Jump to 1:14', exact: true }).click();
  await expect.poll(() => video.evaluate(element => element.currentTime)).toBeCloseTo(74.1, 1);
  const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(scan.violations).toEqual([]);
});

test('selected caption language has truthful loading, gap and error states', async ({ page }) => {
  await page.route('**/manifest?version=1', async route => {
    const response = await route.fetch(); const lesson = await response.json();
    const track = lesson.media.caption_tracks.find((item: { language: string }) => item.language === 'am');
    track.status = 'human-reviewed'; track.src = '/api/v1/test-reviewed-am.vtt';
    await route.fulfill({ response, json: lesson });
  });
  let releaseCaptions: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { releaseCaptions = resolve; });
  await page.route('**/test-reviewed-am.vtt', async route => { await waiting; await route.fulfill({ contentType: 'text/vtt', body: 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nጥሩ\n' }); });
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('am');
  await expect(lesson.locator('.active-caption')).toHaveAttribute('lang', 'am');
  await expect(lesson.getByRole('status').filter({ hasText: 'Loading selected captions' })).toBeVisible();
  await expect(lesson.locator('.active-caption')).toHaveText('');
  releaseCaptions!();
  const video = lesson.locator('.video-column video');
  await video.evaluate(element => { element.currentTime = 2; });
  await expect(lesson.locator('.active-caption')).toHaveText('ጥሩ');
  await video.evaluate(element => { element.currentTime = 4; });
  await expect(lesson.locator('.active-caption')).toHaveText('');
  await page.unroute('**/test-reviewed-am.vtt');
  await page.route('**/test-reviewed-am.vtt', route => route.fulfill({ status: 503 }));
  await page.reload();
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('am');
  await expect(lesson.getByRole('status').filter({ hasText: 'Selected captions are unavailable' })).toBeVisible();
  await expect(lesson.locator('.active-caption')).toHaveText('');
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('off');
  await expect(lesson.getByRole('status').filter({ hasText: 'Selected captions are unavailable' })).toHaveCount(0);
});

test('native caption choice is preserved without duplicate custom captions', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('en');
  await lesson.getByRole('combobox', { name: 'Caption presentation' }).selectOption('native');
  const video = lesson.locator('.video-column video');
  await expect.poll(() => video.evaluate(element => element.textTracks[0].mode)).toBe('showing');
  await expect(lesson.locator('.active-caption')).toBeHidden();
  await lesson.getByLabel('Remember preferences on this device').check();
  await video.evaluate(element => { element.textTracks[0].mode = 'disabled'; });
  await expect(lesson.getByRole('combobox', { name: 'Captions', exact: true })).toHaveValue('off');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.includes('media-preferences'))!)!).captions)).toBe('off');
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('en');
  await lesson.getByRole('combobox', { name: 'Caption presentation' }).selectOption('inline');
  await expect.poll(() => video.evaluate(element => element.textTracks[0].mode)).toBe('hidden');
  await expect(lesson.locator('.active-caption')).toBeVisible();
});

test('described captions remain available when the standard English track is unpublished', async ({ page }) => {
  await page.route('**/manifest?version=1', async route => {
    const response = await route.fetch(); const lesson = await response.json();
    lesson.media.captions = null;
    lesson.media.caption_tracks[0].src = null; lesson.media.caption_tracks[0].status = 'review-pending';
    await route.fulfill({ response, json: lesson });
  });
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.locator('option[value="en"]')).toBeDisabled();
  await lesson.getByRole('button', { name: 'Use audio-described video' }).click();
  await expect(lesson.locator('option[value="en"]')).toBeEnabled();
  await lesson.getByRole('combobox', { name: 'Captions', exact: true }).selectOption('en');
  await lesson.getByRole('button', { name: 'Jump to 0:31', exact: true }).click();
  await expect(lesson.locator('.active-caption')).toContainText('Good design');
});

test('standard-timeline sign playback closes before switching to the described edition', async ({ page }) => {
  await page.route('**/manifest?version=1', async route => {
    const response = await route.fetch(); const lesson = await response.json();
    lesson.media.sign_src = lesson.media.src; lesson.media.sign_status = 'reviewed';
    await route.fulfill({ response, json: lesson });
  });
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await lesson.getByRole('button', { name: 'Show EthSL interpretation', exact: true }).click();
  await expect(lesson.locator('.sign-panel')).toBeVisible();
  await lesson.getByRole('button', { name: 'Use audio-described video' }).click();
  await expect(lesson.locator('.sign-panel')).toBeHidden();
  await expect(lesson.getByRole('button', { name: 'Show EthSL interpretation', exact: true })).toBeDisabled();
  await expect.poll(() => lesson.locator('.sign-panel video').evaluate(video => video.paused)).toBe(true);
});

test('failed downloads do not block lesson readiness and retry preserves search', async ({ page }) => {
  await page.route('**/exports?version=1', route => route.fulfill({ status: 503 }));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('heading', { name: 'Colors with Good Contrast' })).toBeVisible();
  await lesson.getByRole('searchbox').fill('contrast');
  await expect(lesson.getByRole('button', { name: 'Retry downloads' })).toBeVisible();
  await expect(lesson.getByRole('heading', { name: 'Lesson unavailable' })).toHaveCount(0);
  await page.unroute('**/exports?version=1');
  await lesson.getByRole('button', { name: 'Retry downloads' }).click();
  await expect(lesson.getByRole('link', { name: /Download offline pack/ })).toBeVisible();
  await expect(lesson.getByRole('searchbox')).toHaveValue('contrast');
});

test('preferences are opt-in, instance-scoped and safe with blocked storage', async ({ page }) => {
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson').first();
  const keys = () => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('access:')));
  expect(await keys()).toEqual([]);
  await lesson.getByRole('combobox', { name: 'Caption size' }).selectOption('1.5');
  expect(await keys()).toEqual([]);
  await lesson.getByRole('checkbox', { name: 'Remember preferences on this device' }).check();
  const stored = await keys(); expect(stored).toHaveLength(1);
  await lesson.evaluate(element => {
    const second = element.cloneNode(true) as HTMLElement; second.setAttribute('instance-id', 'second'); element.after(second);
  });
  const second = page.locator('alx-accessible-lesson').nth(1);
  await expect(second.getByRole('combobox', { name: 'Caption size' })).toHaveValue('1');
  await second.getByRole('checkbox', { name: 'Remember preferences on this device' }).check();
  expect(await keys()).toHaveLength(2);
  await lesson.getByRole('button', { name: 'Reset caption preferences' }).click();
  expect(await keys()).toHaveLength(1);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await page.reload();
  await lesson.getByRole('checkbox', { name: 'Remember preferences on this device' }).click();
  await expect(lesson.getByRole('checkbox', { name: 'Remember preferences on this device' })).not.toBeChecked();
  await expect(lesson.first().getByRole('status').filter({ hasText: 'Device storage is unavailable' })).toBeVisible();
});

test('rapid search dialog close focuses a live result or results heading', async ({ page }) => {
  await page.goto('/demo/careers');
  const gateway = page.locator('access-career-gateway');
  await expect(gateway.getByRole('heading', { name: 'Copywriter', exact: true })).toBeVisible();
  await gateway.evaluate(element => {
    const root = element.shadowRoot!;
    const input = root.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'copywriter'; input.dispatchEvent(new Event('input'));
    [...root.querySelectorAll<HTMLButtonElement>('[data-detail-job-id]')].find(button => button.dataset.detailJobId === 'demo-copywriter')!.click();
  });
  await expect(gateway.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await expect(gateway.getByRole('button', { name: 'View details — Copywriter', exact: true })).toBeFocused();
  await gateway.getByRole('button', { name: 'View details — Copywriter', exact: true }).click();
  await gateway.evaluate(element => {
    const input = element.shadowRoot!.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'nothing-matches'; input.dispatchEvent(new Event('input'));
  });
  await page.keyboard.press('Escape');
  await expect(gateway.getByRole('heading', { name: 'Job results', exact: true })).toBeFocused();
});

test('recorded job audio stops when hidden, reconfigured and disconnected', async ({ page }) => {
  await page.goto('/demo/careers');
  const gateway = page.locator('access-career-gateway');
  const play = async () => {
    await gateway.getByRole('button', { name: 'Play recorded summary — Copywriter', exact: true }).click();
    await expect.poll(() => gateway.getByLabel('Recorded job summary', { exact: true }).evaluate(audio => (audio as HTMLAudioElement).paused)).toBe(false);
  };
  await play();
  await gateway.evaluate(element => { element.hidden = true; });
  await expect.poll(() => gateway.getByLabel('Recorded job summary', { exact: true }).evaluate(audio => (audio as HTMLAudioElement).paused)).toBe(true);
  await gateway.evaluate(element => { element.hidden = false; });
  await play();
  const audio = await gateway.getByLabel('Recorded job summary', { exact: true }).elementHandle();
  await gateway.evaluate(element => element.setAttribute('api-base', '/api/v1/'));
  expect(await audio!.evaluate(element => element.paused)).toBe(true);
  await play();
  const nextAudio = await gateway.getByLabel('Recorded job summary', { exact: true }).elementHandle();
  await gateway.evaluate(element => element.remove());
  expect(await nextAudio!.evaluate(element => element.paused)).toBe(true);
});

test('pending direct sign source stays disabled and learner research tools stay absent', async ({ page }) => {
  await page.route('**/manifest?version=1', async route => {
    const response = await route.fetch(); const lesson = await response.json();
    lesson.media.sign_src = '/api/v1/test-pending.mp4'; lesson.media.sign_status = 'review-pending';
    await route.fulfill({ response, json: lesson });
  });
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  const lesson = page.locator('alx-accessible-lesson');
  await expect(lesson.getByRole('button', { name: 'EthSL recording awaiting review' })).toBeDisabled();
  await expect(lesson.getByRole('button', { name: 'Show 3D hands preview' })).toHaveCount(0);
  expect(requests.some(url => url.includes('test-pending'))).toBe(false);
});

test('offline entry page opens extracted local audio and text without network', async ({ page }) => {
  const directory = await mkdtemp(join(process.cwd(), 'artifacts/offline-test-'));
  try {
    await page.goto('/');
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: /Download offline pack/ }).click();
    const path = await (await download).path();
    execFileSync('.venv/bin/python', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path!, directory]);
    await page.context().setOffline(true);
    await page.goto(`file://${join(directory, 'index.html')}`);
    await expect(page.getByRole('heading', { name: 'Open this pack offline' })).toBeVisible();
    const audio = page.getByLabel('Standard lesson audio');
    await audio.evaluate(async element => { const player = element as HTMLAudioElement; player.muted = true; await player.play(); });
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    const scan = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(scan.violations).toEqual([]);
  } finally { await page.context().setOffline(false); await rm(directory, { recursive: true, force: true }); }
});

test('certificate retry and manual link copy preserve fictional zero-PII behavior', async ({ page, baseURL }) => {
  await page.route('**/demo-certificates/**', route => route.fulfill({ status: 503 }));
  await page.goto('/demo/certificates/DEMO-LEARNING-001?status=demo-valid');
  await expect(page.getByRole('button', { name: 'Retry verification' })).toBeVisible();
  await page.unroute('**/demo-certificates/**');
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page.locator('#verification')).toHaveText('Valid fictional demo record.');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } }));
  await page.getByRole('button', { name: 'Copy verification link' }).click();
  await expect(page.getByLabel('Verification link', { exact: true })).toHaveValue(`${baseURL}/demo/certificates/DEMO-LEARNING-001`);
  await expect(page.getByLabel('Verification link', { exact: true })).toBeFocused();
});
