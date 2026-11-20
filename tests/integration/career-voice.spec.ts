import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { automaticCommand, mockCareerSpeech, respond, typedCommand, voiceCommand } from '../helpers/career-speech';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('saved microphone permission greets automatically and listens after every spoken response', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted' });
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  const output = guide.getByLabel('Read prompts and results aloud');
  await expect(output).toBeChecked();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(1);
  expect(await page.evaluate(() => window.__careerSpeech.spoken.slice(0, 2))).toEqual([
    'Welcome to the Access Career Gateway. Voice navigation is ready.',
    'What role would you like? Say or type a role, or “all jobs” to clear filters and explore every fictional listing.',
  ]);
  await respond(page, 'all jobs');
  await expect(guide.getByText('11 jobs found. Results 1 to 5.', { exact: true })).toBeVisible();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(2);
  await automaticCommand(page, guide, 'save three and four');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(3);
  expect(await page.evaluate(() => window.__careerSpeech.overlaps)).toEqual([]);
});

for (const permission of ['prompt', 'denied'] as const) {
  test(`${permission} microphone permission allows greeting but requires explicit Start for capture`, async ({ page }) => {
    await mockCareerSpeech(page, { permission });
    await page.goto('/demo/careers');
    const guide = page.locator('.voice-guide');
    await expect(guide.getByLabel('Read prompts and results aloud')).toBeChecked();
    await expect.poll(() => page.evaluate(() => window.__careerSpeech.spoken.length)).toBe(2);
    await expect(guide).toHaveAttribute('data-speech-state', 'off');
    expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
    await guide.getByRole('button', { name: 'Start voice search', exact: true }).press('Enter');
    await automaticCommand(page, guide, 'all jobs');
    await expect(guide).toHaveAttribute('data-speech-state', 'listening');
    expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(2);
    await automaticCommand(page, guide, 'new search');
    await expect(guide).toHaveAttribute('data-speech-state', 'listening');
    await automaticCommand(page, guide, 'stop');
    await expect(guide).toHaveAttribute('data-speech-state', 'off');
    expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
    expect(await page.evaluate(() => window.__careerSpeech.overlaps)).toEqual([]);
  });
}

test('turning read-aloud off during the greeting cancels automatic capture', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted', delay: 600 });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await expect(guide).toHaveAttribute('data-speech-state', 'speaking');
  await guide.getByLabel('Read prompts and results aloud').uncheck();
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  await expect(guide.getByRole('status').filter({ hasText: 'Microphone off.' })).toHaveAttribute('aria-live', 'polite');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
});

test('a delayed permission check cannot restart voice after Stop', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'permissions', { configurable: true, value: {
    query: () => new Promise(resolve => { Object.assign(window, { resolveVoicePermission: () => resolve({ state: 'granted' }) }); }),
  } }));
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await guide.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.evaluate(() => (window as unknown as { resolveVoicePermission(): void }).resolveVoicePermission());
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => [window.__careerSpeech.starts, window.__careerSpeech.spoken])).toEqual([0, []]);
});

test('unavailable permission lookup greets without requesting microphone access', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined }));
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await expect.poll(() => page.evaluate(() => window.__careerSpeech.spoken.length)).toBe(2);
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await automaticCommand(page, guide, 'all jobs');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
});

test('a paused guide greets on first reveal but never restarts after hiding an active session', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted' });
  await page.route('**/demo/careers', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('voice-auto-start', 'voice-auto-start voice-paused') });
  });
  await page.goto('/demo/careers');
  const gateway = page.locator('access-career-gateway');
  const guide = page.locator('.voice-guide');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => [window.__careerSpeech.starts, window.__careerSpeech.spoken])).toEqual([0, []]);
  await gateway.evaluate(node => node.removeAttribute('voice-paused'));
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.spoken[0])).toContain('Welcome');
  await gateway.evaluate(node => { node.setAttribute('voice-paused', ''); node.removeAttribute('voice-paused'); });
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(1);
});

test('hosts without automatic startup stay silent but explicit Start still enables follow-up listening', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted' });
  await page.route('**/demo/careers', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('voice-auto-start', '') });
  });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await expect(guide.getByLabel('Read prompts and results aloud')).not.toBeChecked();
  expect(await page.evaluate(() => [window.__careerSpeech.starts, window.__careerSpeech.spoken])).toEqual([0, []]);
  await guide.getByLabel('Read prompts and results aloud').check();
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await automaticCommand(page, guide, 'all jobs');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(2);
});

test('explicit Listen also continues automatically after spoken results', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await voiceCommand(page, guide, 'all jobs');
  await automaticCommand(page, guide, 'next');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(3);
  expect(await page.evaluate(() => window.__careerSpeech.overlaps)).toEqual([]);
});

test('missing English synthesis leaves the microphone off until explicit Listen', async ({ page }) => {
  await mockCareerSpeech(page, { synthesisAvailable: false });
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  const output = guide.getByLabel('Read prompts and results aloud');
  await expect(guide.getByRole('alert')).toContainText('No English browser voice is available');
  await expect(guide.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  await expect(output).not.toBeChecked();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).press('Enter');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
});

test('blocked English read-aloud can be repeated by keyboard without starting the microphone', async ({ page }) => {
  await mockCareerSpeech(page, { permission: 'granted', blockedOnce: true });
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  const output = guide.getByLabel('Read prompts and results aloud');
  await expect(guide.getByRole('alert')).toContainText('Your browser blocked read aloud');
  await expect(output).not.toBeChecked();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await output.check();
  await guide.getByRole('button', { name: 'Repeat', exact: true }).press('Enter');
  await expect.poll(() => page.evaluate(() => window.__careerSpeech.spoken.at(-1))).toContain('What role would you like?');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).press('Enter');
  await automaticCommand(page, guide, 'all jobs');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
});

test('voice acceptance: five results, stable saves 3 and 4, paging, shortlist and editable fictional draft', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/careers');
  const gateway = page.locator('access-career-gateway');
  const guide = gateway.getByRole('region', { name: 'Optional voice navigation' });
  await expect(guide).toBeVisible();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  await expect(guide.getByRole('button', { name: 'Start voice search', exact: true })).toBeFocused();
  await guide.getByLabel('Read prompts and results aloud').check();
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await expect(guide.getByRole('textbox', { name: 'Role or command' })).toBeFocused();
  await respond(page, 'all jobs');
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await expect(guide.getByText('11 jobs found. Results 1 to 5.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__careerSpeech.spoken.filter(text => /^Result \d+\./.test(text)))).toHaveLength(5);
  await automaticCommand(page, guide, 'save three and four');
  await expect(gateway.getByRole('button', { name: 'Save job — CNC bending operator', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(gateway.getByRole('button', { name: 'Save job — Junior web developer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await automaticCommand(page, guide, 'next');
  await expect(guide.getByText('11 jobs found. Results 6 to 10.', { exact: true })).toBeVisible();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(await page.evaluate(() => window.__careerSpeech.spoken.filter(text => /^Result \d+\./.test(text)))).toHaveLength(10);
  await automaticCommand(page, guide, 'next');
  await expect(guide.getByText('11 jobs found. Results 11 to 11.', { exact: true })).toBeVisible();
  await expect(guide.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await automaticCommand(page, guide, 'shortlist');
  await expect(guide.getByRole('heading', { name: 'Shortlist 1 of 2 — CNC bending operator' })).toBeFocused();
  await expect(gateway.getByLabel('Show jobs')).toHaveValue('Saved jobs');
  await expect(gateway.locator('.results article')).toHaveCount(2);
  await automaticCommand(page, guide, 'next');
  await expect(guide.getByRole('heading', { name: 'Shortlist 2 of 2 — Junior web developer' })).toBeVisible();
  await automaticCommand(page, guide, 'prepare draft');
  const draft = guide.getByRole('dialog', { name: 'Fictional application draft' });
  await expect(draft.getByLabel('Fictional name (required)', { exact: true })).toBeFocused();
  await expect(draft.getByLabel('Introduction (required)', { exact: true })).toHaveCount(0);
  await draft.getByRole('button', { name: 'Next field' }).click();
  await expect(draft.getByRole('alert')).toContainText('Enter fictional name');
  await draft.getByLabel('Fictional name (required)', { exact: true }).fill('Demo Candidate');
  await draft.getByRole('button', { name: 'Next field' }).click();
  await expect(draft.getByLabel('Introduction (required)', { exact: true })).toBeFocused();
  await draft.getByLabel('Introduction (required)', { exact: true }).fill('I enjoy building clear practice pages.');
  await draft.getByRole('button', { name: 'Next field' }).click();
  await draft.getByRole('button', { name: 'Skip optional experience' }).click();
  await expect(draft.getByRole('heading', { name: 'Review your draft' })).toBeFocused();
  await expect(draft.getByText('Not provided', { exact: true })).toBeVisible();
  await draft.getByRole('button', { name: 'Edit introduction', exact: true }).click();
  await draft.getByLabel('Introduction (required)', { exact: true }).fill('I test fictional pages with a keyboard.');
  await draft.getByRole('button', { name: 'Update draft' }).click();
  await expect(draft.getByText('I test fictional pages with a keyboard.', { exact: true })).toBeVisible();
  await expect(draft.getByText(/No employer submission, eligibility decision/)).toBeVisible();
  expect(await page.evaluate(() => window.__careerSpeech.overlaps)).toEqual([]);
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  expect(await page.evaluate(() => window.__careerSpeech.spoken.some(text => text.includes('Demo Candidate') || text.includes('I test fictional')))).toBe(false);
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  await draft.getByRole('button', { name: 'Close and discard draft' }).click();
  await expect(guide.getByRole('textbox', { name: 'Role or command' })).toBeFocused();
  await expect(guide.getByText(/Draft review finished/)).toBeVisible();
  await expect(gateway.getByText('Demo Candidate', { exact: true })).toHaveCount(0);
});

test('permission denial, ambiguous speech, no results and stop all preserve a usable typed path', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await page.evaluate(() => window.__careerSpeech.deny());
  await expect(guide.getByRole('alert')).toContainText('Microphone permission was denied');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  await typedCommand(guide, 'astronaut');
  await expect(guide.getByText(/0 jobs found\. No results/)).toBeVisible();
  await typedCommand(guide, 'search all jobs');
  await voiceCommand(page, guide, 'save three or four');
  await expect(guide.getByRole('alert')).toContainText('Nothing was changed');
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await respond(page, 'save three', 0.9, 'save four');
  await expect(guide.getByRole('alert')).toContainText('ambiguous');
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
  await typedCommand(guide, 'save');
  await expect(guide.getByRole('alert')).toContainText('ambiguous');
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await page.evaluate(() => window.__careerSpeech.capture());
  await guide.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.evaluate(() => window.__careerSpeech.deliverLate('save three'));
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
  await expect(guide.getByRole('button', { name: 'Stop', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(4);
  await typedCommand(guide, 'save three');
  await expect(page.getByRole('button', { name: 'Save job — CNC bending operator', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('number snapshots reject stale filtering and previous pages, and multi-save is atomic', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await typedCommand(guide, 'all jobs');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await typedCommand(guide, 'save 6 and 3');
  await expect(guide.getByRole('alert')).toContainText('Nothing was changed');
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await page.evaluate(() => window.__careerSpeech.capture());
  await page.getByRole('searchbox').fill('developer');
  await page.evaluate(() => window.__careerSpeech.deliverLate('save six'));
  await expect(guide.getByText(/Search or filters changed/)).toBeVisible();
  await typedCommand(guide, 'save one');
  await expect(guide.getByRole('alert')).toContainText('Use Repeat');
  await guide.getByRole('button', { name: 'Repeat', exact: true }).click();
  await typedCommand(guide, 'save one');
  await expect(page.getByRole('button', { name: 'Save job — Junior web developer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await typedCommand(guide, 'shortlist');
  await expect(guide.getByRole('heading', { name: 'Shortlist 1 of 1 — Junior web developer' })).toBeVisible();
  await typedCommand(guide, 'back');
  await expect(page.getByRole('searchbox')).toHaveValue('developer');
  await expect(page.locator('access-career-gateway').getByLabel('Show jobs')).toHaveValue('');
  await page.locator('access-career-gateway').getByLabel('Show jobs').selectOption('Saved jobs');
  await guide.getByRole('button', { name: 'Repeat', exact: true }).click();
  await page.getByRole('button', { name: 'Save job — Junior web developer', exact: true }).click();
  await expect(guide.getByText(/0 jobs found\. Search or filters changed/)).toBeVisible();
  await expect(guide.locator('li[data-job-id]')).toHaveCount(0);
});

test('unsupported speech is keyboard accessible, draft cancellation erases content without network or storage', async ({ page }) => {
  await mockCareerSpeech(page, { supported: false });
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await expect(guide.getByRole('button', { name: 'Listen for a command', exact: true })).toBeDisabled();
  await guide.getByRole('button', { name: 'Use typed search', exact: true }).focus();
  await page.keyboard.press('Enter');
  const command = guide.getByRole('textbox', { name: 'Role or command' });
  await expect(command).toBeFocused();
  await command.fill('all jobs'); await command.press('Enter');
  await expect(guide.getByRole('heading', { name: 'Guided search results' })).toBeFocused();
  await typedCommand(guide, 'details three');
  await expect(guide.getByRole('heading', { name: 'Details — CNC bending operator' })).toBeFocused();
  await typedCommand(guide, 'save');
  await typedCommand(guide, 'shortlist');
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await guide.getByRole('button', { name: 'Prepare fictional draft' }).click();
  const draft = guide.getByRole('dialog');
  await draft.getByLabel('Fictional name (required)', { exact: true }).fill('Fictional Privacy Canary');
  await draft.getByRole('button', { name: 'Next field' }).click();
  await draft.getByLabel('Introduction (required)', { exact: true }).fill('<img src=x onerror=alert(1)>');
  await draft.getByRole('button', { name: 'Next field' }).click();
  await draft.getByRole('button', { name: 'Skip optional experience' }).click();
  await expect(draft.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  expect(await draft.locator('img').count()).toBe(0);
  await page.keyboard.press('Escape');
  await expect(guide.getByRole('button', { name: 'Prepare fictional draft' })).toBeFocused();
  await expect(guide.getByText('Fictional Privacy Canary', { exact: true })).toHaveCount(0);
  await guide.getByRole('button', { name: 'Prepare fictional draft' }).click();
  await expect(draft.getByLabel('Fictional name (required)', { exact: true })).toHaveValue('');
  await draft.getByRole('button', { name: 'Cancel draft' }).click();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
});

test('speech is serialized, stopped on hide, and uses an available English browser voice', async ({ page }) => {
  await mockCareerSpeech(page, { delay: 600, localVoice: false });
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await guide.getByLabel('Read prompts and results aloud').check();
  await guide.getByRole('button', { name: 'Start voice search', exact: true }).click();
  await automaticCommand(page, guide, 'all jobs');
  await expect(guide).toHaveAttribute('data-speech-state', 'speaking');
  await guide.getByRole('button', { name: 'Stop', exact: true }).click();
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(1);
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await page.evaluate(() => document.querySelector('access-career-gateway')?.remove());
  expect(await page.evaluate(() => window.__careerSpeech.microphone)).toBe(false);
  expect(await page.evaluate(() => window.__careerSpeech.overlaps)).toEqual([]);
  await page.goto('/demo/careers');
  await guide.getByLabel('Read prompts and results aloud').check();
  await typedCommand(guide, 'all jobs');
  await expect.poll(() => page.evaluate(() => window.__careerSpeech.spoken.length)).toBeGreaterThan(0);
  await expect(guide.getByLabel('Read prompts and results aloud')).toBeChecked();
});

test('guided results and draft fields reflow and expose useful live status without duplicate app speech', async ({ page }) => {
  await mockCareerSpeech(page);
  await page.goto('/demo/careers');
  const guide = page.getByRole('region', { name: 'Optional voice navigation' });
  await guide.getByRole('button', { name: 'Use typed search', exact: true }).click();
  const spokenBeforeTypedSearch = await page.evaluate(() => [...window.__careerSpeech.spoken]);
  await page.getByRole('searchbox').fill('developer');
  await expect(page.locator('access-career-gateway .result-header [role=status]')).toHaveText('1 job found.');
  await expect(page.locator('access-career-gateway .result-header [role=status]')).toHaveAttribute('aria-live', 'polite');
  await typedCommand(guide, 'all jobs');
  expect(await page.evaluate(() => window.__careerSpeech.spoken)).toEqual(spokenBeforeTypedSearch);
  await expect(guide.getByRole('status').filter({ hasText: '11 jobs found' })).not.toHaveAttribute('aria-live', 'off');
  await expect(page.locator('access-career-gateway .result-header [role=status]')).toHaveAttribute('aria-live', 'off');
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await typedCommand(guide, 'save four');
  await typedCommand(guide, 'shortlist');
  await guide.getByRole('button', { name: 'Prepare fictional draft' }).click();
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
