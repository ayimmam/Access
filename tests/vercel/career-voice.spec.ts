import { test, expect } from '@playwright/test';
import { mockCareerSpeech, typedCommand, voiceCommand } from '../helpers/career-speech';
import { useDemoApi } from '../helpers/demo-api';

test.use({ video: process.env.ACCESS_RECORD_DEMO ? { mode: 'on', size: { width: 1280, height: 900 } } : 'off', viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page, baseURL }) => {
  await useDemoApi(page, baseURL);
  await mockCareerSpeech(page);
});

test('Without Access stays unchanged and leaving With Access cancels microphone and discards drafts', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/?mode=before');
  await expect(page.getByText('11 vacancies found.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start voice search', exact: true })).toBeHidden();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await page.getByRole('button', { name: 'After With Access' }).click();
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await page.getByRole('button', { name: 'Before Standard listings' }).click();
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  await page.getByRole('button', { name: 'After With Access' }).click();
  await typedCommand(guide, 'all jobs');
  await typedCommand(guide, 'save three');
  await typedCommand(guide, 'shortlist');
  await guide.getByRole('button', { name: 'Prepare fictional draft' }).click();
  await guide.getByRole('dialog').getByLabel('Fictional name (required)', { exact: true }).fill('Temporary Fictional Candidate');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('data-access-mode', 'before');
  await expect(page.getByRole('button', { name: 'Before Standard listings' })).toBeFocused();
  await expect(page.locator('access-career-gateway dialog[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'After With Access' }).click();
  await guide.getByRole('button', { name: 'Prepare fictional draft' }).click();
  await expect(guide.getByRole('dialog').getByLabel('Fictional name (required)', { exact: true })).toHaveValue('');
});

test.describe('short demo recording', () => {
  test('captioned simulated voice walkthrough on the Afriwork-style host', async ({ page }) => {
    await page.goto('http://127.0.0.1:5174/');
    const guide = page.getByRole('region', { name: 'Optional voice navigation' });
    await expect(guide).toBeVisible();
    const caption = async (text: string) => {
      if (!process.env.ACCESS_RECORD_DEMO) return;
      await page.evaluate(text => {
        let banner = document.querySelector<HTMLElement>('#recording-caption');
        if (!banner) { banner = document.createElement('div'); banner.id = 'recording-caption'; banner.style.cssText = 'position:fixed;inset:0 0 auto;z-index:10000;padding:12px 24px;background:#152537;color:white;font:18px/1.5 system-ui;pointer-events:none'; document.body.append(banner); }
        banner.textContent = `SIMULATED SPEECH · Fictional demo · ${text}`;
      }, text);
      await page.waitForTimeout(1500);
    };
    await guide.scrollIntoViewIfNeeded();
    await caption('Opt in to voice search, or use the equivalent keyboard controls.');
    await guide.getByLabel('Read prompts and results aloud').check();
    await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
    await expect(guide).toHaveAttribute('data-speech-state', 'listening');
    await caption('The microphone listens for one response: “all jobs”.');
    await page.evaluate(() => window.__careerSpeech.respond('all jobs'));
    await expect(guide).toHaveAttribute('data-speech-state', 'off');
    await expect(guide.getByText('11 jobs found. Results 1 to 5.', { exact: true })).toBeVisible();
    await caption('11 matches. The first five summaries are queued for read-aloud.');
    await guide.getByRole('button', { name: 'Save result 3 — CNC bending operator' }).scrollIntoViewIfNeeded();
    await voiceCommand(page, guide, 'save three and four');
    await caption('“Save three and four” saves the operator and web developer by stable ID.');
    await voiceCommand(page, guide, 'next');
    await expect(guide.getByText('11 jobs found. Results 6 to 10.', { exact: true })).toBeVisible();
    await caption('“Next” reads five more results. Earlier numbers cannot save a different job.');
    await voiceCommand(page, guide, 'shortlist');
    await expect(guide.getByRole('heading', { name: 'Shortlist 1 of 2 — CNC bending operator' })).toBeVisible();
    await caption('“Shortlist” returns to the same saved jobs, one at a time.');
    await voiceCommand(page, guide, 'next');
    await voiceCommand(page, guide, 'prepare draft');
    const draft = guide.getByRole('dialog');
    await caption('Microphone off for draft privacy. Required fields are asked individually.');
    await draft.getByLabel('Fictional name (required)', { exact: true }).fill('Demo Candidate');
    await draft.getByRole('button', { name: 'Next field' }).click();
    await draft.getByLabel('Introduction (required)', { exact: true }).fill('I enjoy testing accessible practice websites.');
    await draft.getByRole('button', { name: 'Next field' }).click();
    await draft.getByRole('button', { name: 'Skip optional experience' }).click();
    await expect(draft.getByRole('heading', { name: 'Review your draft' })).toBeVisible();
    await caption('Review and edit only what you supplied. No application is submitted.');
    await draft.getByRole('button', { name: 'Close and discard draft' }).click();
    await caption('Closing discards the draft. NVDA, TalkBack and real microphone checks are pending.');
  });
});
