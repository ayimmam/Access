import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { chooseAmharic, mockAddisSpeech, recordAmharic, typeAmharic } from '../helpers/career-addis-speech';
import { useDemoApi } from '../helpers/demo-api';
import { mockCareerSpeech, typedCommand } from '../helpers/career-speech';

test.use({ video: process.env.ACCESS_RECORD_DEMO ? { mode: 'on', size: { width: 1280, height: 900 } } : 'off', viewport: { width: 1280, height: 900 } });

test('Amharic remains With Access only and hiding it stops capture', async ({ page, baseURL }) => {
  await useDemoApi(page, baseURL);
  const requests = await mockAddisSpeech(page, { apiBase: baseURL });
  await page.goto('http://127.0.0.1:5174/?mode=before');
  const guide = page.locator('.voice-guide');
  await expect(page.getByText('11 vacancies found.', { exact: true })).toBeVisible();
  await expect(guide).toBeHidden();
  await page.getByRole('button', { name: 'After With Access' }).click();
  await chooseAmharic(guide);
  await expect(guide.getByRole('checkbox')).toBeChecked();
  expect(requests).toEqual([]);
  await guide.getByRole('checkbox').uncheck();
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await page.getByRole('button', { name: 'Before Standard listings' }).click();
  await expect(guide).toBeHidden();
  expect(await page.evaluate(() => window.__careerAddis.recording)).toBe(false);
  expect(requests).toHaveLength(0);
  await expect(page.getByText('11 vacancies found.', { exact: true })).toBeVisible();
});

test('checked-in career policy permits only same-origin microphone and bounded blob playback', async ({ page }) => {
  const config = JSON.parse(readFileSync(new URL('../../demos/career-gateway/vercel.json', import.meta.url), 'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map((header: { key: string; value: string }) => [header.key, header.value]));
  expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(self), geolocation=()');
  expect(headers['Content-Security-Policy']).toContain('media-src blob: https://access-plugin.onrender.com;');
  expect(headers['Content-Security-Policy']).not.toContain('addisassistant.com');
  await page.route('http://127.0.0.1:5174/policy-check', route => route.fulfill({
    contentType: 'text/html', headers, body: '<!doctype html><html lang="en"><title>Policy check</title><p>Policy check</p></html>',
  }));
  await page.goto('http://127.0.0.1:5174/policy-check');
  expect(await page.evaluate(() => (document as Document & { featurePolicy: { allowsFeature(name: string): boolean } }).featurePolicy.allowsFeature('microphone'))).toBe(true);
  expect(await page.evaluate(() => (document as Document & { featurePolicy: { allowsFeature(name: string): boolean } }).featurePolicy.allowsFeature('camera'))).toBe(false);
});

test('pending language changes cannot start the previous microphone or leave a mismatched selector', async ({ page, baseURL }) => {
  await useDemoApi(page, baseURL);
  await mockCareerSpeech(page);
  await mockAddisSpeech(page, { apiBase: baseURL, catalogDelay: 1000 });
  await page.goto('http://127.0.0.1:5174/');
  const guide = page.locator('.voice-guide');
  await guide.getByRole('combobox').selectOption('am');
  await expect(guide).toHaveAttribute('aria-busy', 'true');
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await page.getByRole('button', { name: 'Before Standard listings' }).click();
  await page.getByRole('button', { name: 'After With Access' }).click();
  await expect(guide).toHaveAttribute('lang', 'en');
  await expect(guide.getByRole('combobox')).toHaveValue('en');
  await typedCommand(guide, 'all jobs');
  await expect(guide.locator('ol li')).toHaveCount(5);
});

test('captioned simulated Amharic walkthrough on the Afriwork-style host', async ({ page, baseURL }) => {
  await useDemoApi(page, baseURL);
  await mockAddisSpeech(page, { apiBase: baseURL });
  await page.goto('http://127.0.0.1:5174/');
  const guide = page.locator('.voice-guide');
  await guide.scrollIntoViewIfNeeded();
  const caption = async (text: string) => {
    await page.evaluate(text => {
      const root = document.querySelector('access-career-gateway')?.shadowRoot;
      const dialog = root?.querySelector<HTMLDialogElement>('.voice-guide dialog[open]');
      const caption = document.getElementById('recording-caption') || root?.getElementById('recording-caption') || document.createElement('div');
      caption.id = 'recording-caption'; caption.lang = 'en'; caption.textContent = text;
      Object.assign(caption.style, { position: 'fixed', bottom: '12px', left: '12px', right: '12px', zIndex: '99999', padding: '16px', background: '#102638', color: '#fff', font: 'bold 18px/1.4 system-ui', borderRadius: '8px', pointerEvents: 'none' });
      caption.setAttribute('aria-hidden', 'true'); (dialog || document.body).append(caption);
    }, text);
    if (process.env.ACCESS_RECORD_DEMO) await page.waitForTimeout(1100);
  };
  await caption('SIMULATED Amharic speech — no live microphone, Addis key, or generated audio.');
  await chooseAmharic(guide);
  await guide.getByRole('checkbox').check();
  await caption('Choose አማርኛ. Recording is opt-in; every transcript can be reviewed or edited.');
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await guide.getByRole('button', { name: 'ቀረጻውን ላክ', exact: true }).click();
  await expect(guide.getByRole('textbox')).toHaveValue('ሁሉም ሥራዎች');
  await caption('Recognized “all jobs”; confirm it before the search runs.');
  await guide.getByRole('button', { name: 'ትእዛዙን አስፈጽም', exact: true }).click();
  await expect(guide.locator('ol li')).toHaveCount(5);
  await guide.getByRole('heading', { name: 'የተመራ ፍለጋ ውጤቶች' }).scrollIntoViewIfNeeded();
  await caption('11 fictional jobs. Read the first five in Amharic; equivalent text stays visible.');
  await recordAmharic(page, guide, 'ሶስት እና አራት አስቀምጥ');
  await caption('Save jobs 3 and 4 using stable job IDs: machine operator and web developer.');
  await typeAmharic(guide, 'ቀጣይ');
  await expect(guide.getByText('11 ሥራዎች ተገኝተዋል። ውጤቶች ከ6 እስከ 10።', { exact: true })).toBeVisible();
  await caption('Next reads jobs 6–10. The original saved jobs remain unchanged.');
  await typeAmharic(guide, 'የተቀመጡ ሥራዎች');
  await typeAmharic(guide, 'ቀጣይ');
  await caption('Review the shortlist one job at a time, then prepare a fictional draft.');
  await typeAmharic(guide, 'ረቂቅ አዘጋጅ');
  const draft = guide.getByRole('dialog');
  await draft.getByLabel('የፈጠራ ስም (አስፈላጊ)', { exact: true }).fill('ምሳሌ እጩ');
  await draft.getByRole('button', { name: 'ቀጣይ መስክ' }).click();
  await draft.getByLabel('መግቢያ (አስፈላጊ)', { exact: true }).fill('ይህ የማሳያ ረቂቅ ብቻ ነው።');
  await draft.getByRole('button', { name: 'ቀጣይ መስክ' }).click();
  await draft.getByRole('button', { name: 'አማራጭ ልምድን ዝለል' }).click();
  await caption('Drafts are typed-only and stay in this page. Nothing is sent to Addis or an employer.');
  await expect(draft.getByRole('heading', { name: 'ረቂቅዎን ይገምግሙ' })).toBeFocused();
  await draft.getByRole('button', { name: 'ዝጋና ረቂቁን አስወግድ' }).click();
  await caption('Closing deletes the draft. Native-speaker, live Addis, NVDA and TalkBack checks remain pending.');
  if (!process.env.ACCESS_RECORD_DEMO) {
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
