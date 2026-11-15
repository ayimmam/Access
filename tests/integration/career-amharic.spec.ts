import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { chooseAmharic, mockAddisSpeech, recordAmharic, typeAmharic } from '../helpers/career-addis-speech';
import { mockCareerSpeech, typedCommand } from '../helpers/career-speech';

test('Amharic opt-in, first five, stable saves 3 and 4, paging, shortlist and private draft', async ({ page }) => {
  await mockCareerSpeech(page);
  const requests = await mockAddisSpeech(page);
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  const output = guide.getByRole('checkbox', { name: 'ጥያቄዎችንና ውጤቶችን በድምፅ አንብብ' });
  await expect(output).not.toBeChecked();
  expect(requests).toHaveLength(0);
  expect(await page.evaluate(() => window.__careerAddis.starts)).toBe(0);
  await output.check();
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  expect(requests[0]).toEqual({ operation: 'speak', body: { kind: 'role', consent: true } });
  await guide.getByRole('button', { name: 'ቀረጻውን ላክ', exact: true }).click();
  await expect(guide.getByRole('textbox')).toHaveValue('ሁሉም ሥራዎች');
  await expect(guide.getByRole('textbox')).toBeFocused();
  await expect(guide.locator('ol li')).toHaveCount(0);
  await guide.getByRole('button', { name: 'ትእዛዙን አስፈጽም', exact: true }).click();
  await expect(guide.locator('ol li')).toHaveCount(5);
  await expect(guide.getByText('11 ሥራዎች ተገኝተዋል። ውጤቶች ከ1 እስከ 5።', { exact: true })).toBeVisible();
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  expect(requests.filter(request => request.operation === 'speak').at(-1)?.body).toEqual({
    consent: true, kind: 'results', total: 11, start: 1,
    job_ids: ['demo-copywriter', 'demo-data-assistant', 'demo-machine-operator', 'demo-web-developer', 'demo-library-assistant'],
  });
  await recordAmharic(page, guide, 'ሶስት እና አራት አስቀምጥ', false);
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
  await guide.getByRole('button', { name: 'ትእዛዙን አስፈጽም', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save job — CNC bending operator', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Save job — Junior web developer', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  await recordAmharic(page, guide, 'ቀጣይ');
  await expect(guide.getByText('11 ሥራዎች ተገኝተዋል። ውጤቶች ከ6 እስከ 10።', { exact: true })).toBeVisible();
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  await typeAmharic(guide, 'ድገም');
  await expect(guide.locator('ol li')).toHaveCount(5);
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
  await recordAmharic(page, guide, 'የተቀመጡ ሥራዎች');
  await expect(guide.getByRole('heading', { name: /የተቀመጠ ሥራ 1 ከ2/ })).toBeFocused();
  await expect(page.getByLabel('Show jobs')).toHaveValue('Saved jobs');
  await typeAmharic(guide, 'ቀጣይ');
  await expect(guide.getByRole('heading', { name: /የተቀመጠ ሥራ 2 ከ2 — ጀማሪ የድር ገንቢ/ })).toBeVisible();
  await typeAmharic(guide, 'ረቂቅ አዘጋጅ');
  const draft = guide.getByRole('dialog', { name: 'የማሳያ የሥራ ማመልከቻ ረቂቅ' });
  const countBeforeDraft = requests.length;
  await expect(draft.getByLabel('የፈጠራ ስም (አስፈላጊ)', { exact: true })).toBeFocused();
  await expect(draft.getByLabel('መግቢያ (አስፈላጊ)', { exact: true })).toHaveCount(0);
  await draft.getByRole('button', { name: 'ቀጣይ መስክ' }).click();
  await expect(draft.getByRole('alert')).not.toBeEmpty();
  await draft.getByLabel('የፈጠራ ስም (አስፈላጊ)', { exact: true }).fill('ምሳሌ እጩ');
  await draft.getByRole('button', { name: 'ቀጣይ መስክ' }).click();
  await draft.getByLabel('መግቢያ (አስፈላጊ)', { exact: true }).fill('ይህ የፈጠራ ልምምድ መግቢያ ነው።');
  await draft.getByRole('button', { name: 'ቀጣይ መስክ' }).click();
  await draft.getByRole('button', { name: 'አማራጭ ልምድን ዝለል' }).click();
  await expect(draft.getByRole('heading', { name: 'ረቂቅዎን ይገምግሙ' })).toBeFocused();
  await draft.getByRole('button', { name: 'መግቢያ አርም' }).click();
  await draft.getByLabel('መግቢያ (አስፈላጊ)', { exact: true }).fill('የተሻሻለ የማሳያ መግቢያ።');
  await draft.getByRole('button', { name: 'ረቂቁን አዘምን' }).click();
  expect(requests).toHaveLength(countBeforeDraft);
  expect(JSON.stringify(requests)).not.toContain('ምሳሌ እጩ');
  expect(await page.evaluate(() => window.__careerAddis.overlaps)).toEqual([]);
  expect(await page.evaluate(() => window.__careerAddis.recording || window.__careerAddis.speaking)).toBe(false);
  expect(await page.evaluate(() => window.__careerSpeech.starts)).toBe(0);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await draft.getByRole('button', { name: 'ዝጋና ረቂቁን አስወግድ' }).click();
  await expect(guide.getByRole('textbox')).toBeFocused();
  await expect(guide.getByText('ምሳሌ እጩ', { exact: true })).toHaveCount(0);
});

test('denied microphone, ambiguous numbers, no results and typed cancellation in Amharic', async ({ page }) => {
  const requests = await mockAddisSpeech(page, { denied: true });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide.getByRole('alert')).toContainText('ፈቃድ ተከልክሏል');
  await typeAmharic(guide, 'የጠፈር ተመራማሪ');
  await expect(guide.getByText(/ምንም ሥራ አልተገኘም/)).toBeVisible();
  await typeAmharic(guide, 'ሁሉም ሥራዎች ፈልግ');
  await typeAmharic(guide, 'ሶስት ወይም አራት አስቀምጥ');
  await expect(guide.getByRole('alert')).toContainText('ምንም አልተቀየረም');
  await expect(page.locator('access-career-gateway .results [aria-pressed=true]')).toHaveCount(0);
  await typeAmharic(guide, '፫ እና ፬ አስቀምጥ');
  await typeAmharic(guide, 'የተቀመጡ ሥራዎች');
  await typeAmharic(guide, 'ረቂቅ አዘጋጅ');
  await guide.getByRole('dialog').getByRole('textbox').fill('ለጊዜው የፈጠራ ስም');
  await page.keyboard.press('Escape');
  await expect(guide.getByRole('dialog')).toHaveCount(0);
  await expect(guide.getByText('ለጊዜው የፈጠራ ስም', { exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(0);
});

test('unconfigured Amharic speech preserves typed search and stable numbering', async ({ page }) => {
  await mockAddisSpeech(page, { enabled: false });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await expect(guide.getByRole('button', { name: 'ትእዛዝ በድምፅ ስጥ', exact: true })).toBeDisabled();
  await typeAmharic(guide, 'የድር ገንቢ');
  await expect(guide.locator('ol li')).toHaveCount(1);
  await expect(guide.getByRole('heading', { name: 'ጀማሪ የድር ገንቢ' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search jobs by title, skill or employer', exact: true }).fill('library');
  await expect(guide.getByText(/ቁጥሮቹ ተቀይረዋል/)).toBeVisible();
  await typeAmharic(guide, 'አንድ አስቀምጥ');
  await expect(guide.getByRole('alert')).toContainText('ፍለጋው ተቀይሯል');
  await typeAmharic(guide, 'ድገም');
  await typeAmharic(guide, 'አንድ አስቀምጥ');
  await expect(page.getByRole('button', { name: 'Save job — Library assistant', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('unsupported recording falls back to keyboard, including unexpected role input', async ({ page }) => {
  const requests = await mockAddisSpeech(page, { unsupported: true });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide.getByRole('alert')).toContainText('ድምፅን መለየት አይቻልም');
  await typeAmharic(guide, 'constructor');
  await expect(guide.getByText(/ምንም ሥራ አልተገኘም/)).toBeVisible();
  await typeAmharic(guide, 'የድር ገንቢ ፈልግ');
  await expect(guide.locator('ol li')).toHaveCount(1);
  expect(requests).toHaveLength(0);
});

test('Stop discards unsubmitted audio and delayed permission cannot restart capture', async ({ page }) => {
  const requests = await mockAddisSpeech(page, { pending: true });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'starting');
  await guide.getByRole('button', { name: 'አቁም', exact: true }).click();
  await page.evaluate(() => window.__careerAddis.grant());
  await expect.poll(() => page.evaluate(() => window.__careerAddis.stops)).toBe(1);
  expect(await page.evaluate(() => window.__careerAddis.starts)).toBe(0);
  expect(requests).toHaveLength(0);
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
});

test('language changes cancel a late transcript and keep English usable', async ({ page }) => {
  await mockCareerSpeech(page);
  const requests = await mockAddisSpeech(page, { transcriptionDelay: 500 });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await guide.getByRole('button', { name: 'ትእዛዝ በድምፅ ስጥ', exact: true }).click();
  await guide.getByRole('button', { name: 'ቀረጻውን ላክ', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await guide.getByRole('combobox').selectOption('en');
  await expect(guide).toHaveAttribute('lang', 'en');
  await typedCommand(guide, 'web developer');
  await expect(guide.locator('ol li')).toHaveCount(1);
  await expect(guide.getByRole('textbox')).toHaveValue('');
  await expect(guide).toHaveAttribute('data-speech-state', 'off');
});

test('provider limits restore live errors without automatic retries or speech overlap', async ({ page }) => {
  const requests = await mockAddisSpeech(page, { speechStatus: 429 });
  await page.goto('/demo/careers');
  const guide = page.locator('.voice-guide');
  await chooseAmharic(guide);
  await guide.getByRole('checkbox').check();
  await guide.getByRole('button', { name: 'በድምፅ ፍለጋ ጀምር', exact: true }).click();
  await expect(guide.getByRole('alert')).toContainText('ገደቡ');
  await expect(guide.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  await expect(guide.getByRole('checkbox')).not.toBeChecked();
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => window.__careerAddis.starts)).toBe(0);
  await typeAmharic(guide, 'ሁሉም ሥራዎች');
  await expect(guide.locator('ol li')).toHaveCount(5);
});
