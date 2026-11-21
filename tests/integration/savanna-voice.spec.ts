import { expect, test, type Locator } from '@playwright/test';
import { mockAddisSpeech } from '../helpers/career-addis-speech';
import { mockCareerSpeech, respond } from '../helpers/career-speech';

async function typeCommand(guide: Locator, words: string) {
  const input = guide.getByRole('textbox');
  await input.fill(words);
  await input.press('Enter');
}

test('Savanna voice uses lesson controls and cancels for video, reflection, comparison and navigation', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/savanna');
  const guide = page.getByRole('region', { name: 'Lesson voice navigation' });
  const listen = guide.getByRole('button', { name: 'Listen for a command' });
  const expectMic = (state: string) => expect(guide).toHaveAttribute('data-speech-state', state);
  await expect.poll(() => page.evaluate(() => window.__careerSpeech.spoken)).toContain('Welcome to the Savanna learning demo.');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await listen.focus();
  await listen.press('Enter');
  await expectMic('listening');
  await page.evaluate(() => window.__careerSpeech.deny());
  await expect(guide.getByRole('alert')).toContainText('Microphone permission was denied');
  await expectMic('off');
  await listen.click();
  await respond(page, 'Amharic captions', .9, 'Amharic captions.');
  const captions = page.locator('alx-accessible-lesson select[data-caption-language]');
  await expect(captions).toHaveValue('am');
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expectMic('listening');
  await respond(page, 'English captions');
  await expect(captions).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectMic('listening');
  await respond(page, 'Open transcript');
  await expect(page.getByRole('searchbox', { name: 'Find text in this lesson' })).toBeFocused();
  await expectMic('listening');
  await respond(page, 'Offline formats');
  await expect(page.getByRole('heading', { name: 'Save for offline reading' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Download for offline access' })).toHaveAttribute('download', '');
  await expectMic('listening');
  await typeCommand(guide, 'Play video');
  const video = page.locator('alx-accessible-lesson .video-column video');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await expectMic('off');
  await typeCommand(guide, 'Pause video');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await listen.click();
  await respond(page, 'write my reflection');
  await expect(guide.getByRole('alert')).toContainText('Use a lesson command');
  await listen.click();
  await page.evaluate(() => window.__careerSpeech.capture());
  await page.getByLabel('What would you like to learn with this community?').fill('Private reflection fixture');
  await expectMic('off');
  await page.evaluate(() => window.__careerSpeech.deliverLate('Play video'));
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  expect(await page.evaluate(() => window.__careerSpeech.spoken.join(' '))).not.toContain('Private reflection fixture');
  await listen.click();
  await guide.getByRole('button', { name: 'Stop', exact: true }).press('Enter');
  await expectMic('off');
  await listen.click();
  await page.getByRole('button', { name: 'Before Standard video' }).click();
  await expect(guide).toBeHidden();
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  await page.getByRole('button', { name: 'After With Access' }).click();
  await expectMic('off');
  await listen.click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expectMic('off');
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); });
  await page.getByRole('combobox', { name: 'Demo lesson' }).selectOption('w3c-colors-with-good-contrast');
  await expect(guide).toBeVisible();
  await expectMic('off');
  expect(await page.evaluate(() => window.__careerSpeech.spoken.filter(text => text === 'Welcome to the Savanna learning demo.'))).toHaveLength(1);
  await page.route('https://access-career-gateway.vercel.app/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Career destination test</h1>' }));
  await typeCommand(guide, 'Open Career Gateway');
  await expect(page).toHaveURL('https://access-career-gateway.vercel.app/?lesson=w3c-colors-with-good-contrast');
});

test('Savanna career voice navigation rejects unapproved external destinations', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/savanna');
  const guide = page.getByRole('region', { name: 'Lesson voice navigation' });
  for (const destination of ['https://access-career-gateway.vercel.app.example.com/', 'https://access-career-gateway.vercel.app/other', 'https://username@access-career-gateway.vercel.app/']) {
    await page.locator('#savanna-career-link').evaluate((link, destination) => { link.setAttribute('href', destination); }, destination);
    await typeCommand(guide, 'Open Career Gateway');
    await expect(guide.getByRole('alert')).toContainText('Career Gateway is unavailable');
    await expect(page).toHaveURL(/\/demo\/savanna$/);
  }
});

test('removing an active Savanna lesson aborts capture and drops late results', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted' });
  await page.goto('/demo/savanna');
  const guide = page.getByRole('region', { name: 'Lesson voice navigation' });
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await page.evaluate(() => {
    window.__careerSpeech.capture();
    document.querySelector('alx-accessible-lesson')?.remove();
    window.__careerSpeech.deliverLate('Open Career Gateway');
  });
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  await expect(guide).toHaveCount(0);
  await expect(page).toHaveURL(/\/demo\/savanna$/);
});

test('Savanna Amharic needs an explicit provider action and transcript review, and Stop discards capture', async ({ page }) => {
  await mockCareerSpeech(page);
  const requests = await mockAddisSpeech(page);
  await page.goto('/demo/savanna');
  const guide = page.locator('.lesson-voice');
  const language = guide.getByRole('combobox');
  await language.selectOption('am');
  await expect(guide).toHaveAttribute('lang', 'am');
  const readAloud = guide.getByRole('checkbox');
  await expect(readAloud).toBeChecked();
  expect(requests).toEqual([]);
  await guide.getByRole('button', { name: 'የትእዛዝ እርዳታን በድምፅ አንብብ' }).click();
  await expect.poll(() => page.evaluate(() => window.__careerAddis.plays)).toBe(1);
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => window.__careerAddis.starts)).toBe(0);
  expect(requests).toEqual([{ operation: 'speak', body: { kind: 'lesson-guide', consent: true } }]);
  await readAloud.uncheck();
  await language.selectOption('en');
  await expect(guide).toHaveAttribute('lang', 'en');
  await expect(readAloud).not.toBeChecked();
  await language.selectOption('am');
  await expect(guide).toHaveAttribute('lang', 'am');
  await expect(readAloud).not.toBeChecked();

  const listen = guide.getByRole('button', { name: 'ትእዛዝ በድምፅ ስጥ' });
  await listen.click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await guide.getByRole('button', { name: 'አቁም', exact: true }).click();
  expect(requests).toHaveLength(1);
  await listen.click();
  await page.evaluate(() => { window.__careerAddis.transcript = 'የአማርኛ መግለጫ'; });
  await guide.getByRole('button', { name: 'ቀረጻውን ላክ', exact: true }).click();
  const input = guide.getByRole('textbox');
  await expect(input).toHaveValue('የአማርኛ መግለጫ');
  await expect(input).toBeFocused();
  const captions = page.locator('alx-accessible-lesson select[data-caption-language]');
  await expect(captions).toHaveValue('off');
  await input.press('Enter');
  await expect(captions).toHaveValue('am');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(requests.map(request => request.operation)).toEqual(['speak', 'transcribe']);
  expect(await page.evaluate(() => window.__careerAddis.overlaps)).toEqual([]);
});
