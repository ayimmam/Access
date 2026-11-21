import type { Job } from './career-element';
import { normalizeSpeechText } from './career-speech';

export interface SpeechPrompt {
  kind: 'welcome' | 'role' | 'results' | 'details' | 'saved' | 'shortlist' | 'changed' | 'lesson-guide';
  job_ids?: string[];
  total?: number;
  start?: number;
}
export interface AmharicCatalog {
  language: 'am';
  ui: Record<string, string>;
  jobs: Record<string, Pick<Job, 'title' | 'organization' | 'summary' | 'responsibilities' | 'support'>>;
  privacy: string; help: string; speech_help: string; speech_enabled: boolean;
}

export const welcomePrompt = 'Welcome to the Access Career Gateway. Voice navigation is ready.';
export const rolePrompt = 'What role would you like? Say or type a role, or “all jobs” to clear filters and explore every fictional listing.';
export const resultHelp = 'Use Next, Previous, Repeat, Details with a result number, Save with result numbers, Shortlist, or Stop. Press Listen for a command or use the typed controls.';
export const emptyResults = '0 jobs found. No results. Try Search followed by another role, or Search all jobs.';
export const unavailableSpeech = 'Amharic speech is temporarily unavailable. Nothing was changed. Use typed controls; no automatic retry occurs.';
export const unconfiguredSpeech = 'Amharic voice is not configured. Use typed commands and buttons, or choose English.';

export async function boundedBody(response: Response, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.body) throw new Error('Empty response');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Response too large');
      parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

export async function loadAmharicCatalog(base: URL, signal: AbortSignal): Promise<AmharicCatalog> {
  const response = await fetch(new URL('career-speech/catalog', base), { credentials: 'omit', cache: 'no-store', signal, referrerPolicy: 'no-referrer' });
  if (!response.ok || response.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw new Error('Catalog unavailable');
  const value = JSON.parse(new TextDecoder().decode(await boundedBody(response, 180000))) as AmharicCatalog;
  if (value?.language !== 'am' || typeof value.speech_enabled !== 'boolean' || !value.ui || !value.jobs ||
    ![value.privacy, value.help, value.speech_help].every(item => typeof item === 'string' && item.length <= 3000) ||
    Object.entries(value.ui).length > 200 || !Object.entries(value.ui).every(([key, text]) => key.length < 500 && typeof text === 'string' && text.length < 3000) ||
    Object.keys(value.jobs).length !== 11 || !Object.entries(value.jobs).every(([id, job]) => /^demo-[a-z-]+$/.test(id) && job &&
      [job.title, job.organization, job.summary].every(text => typeof text === 'string' && text.length <= 1000) &&
      [job.responsibilities, job.support].every(items => Array.isArray(items) && items.length <= 10 && items.every(text => typeof text === 'string' && text.length <= 1000)))) {
    throw new Error('Invalid catalog');
  }
  return value;
}

const commandAliases: Record<string, string> = {
  'እንግሊዝኛ': 'language english', 'ወደ እንግሊዝኛ': 'language english',
  'አቁም': 'stop', 'ቁም': 'stop', 'ሰርዝ': 'cancel', 'ቀጣይ': 'next', 'ቀጥል': 'next', 'ቀዳሚ': 'previous', 'ያለፈው': 'previous',
  'ድገም': 'repeat', 'ደግመህ አንብብ': 'repeat', 'ዝርዝር': 'details', 'አስቀምጥ': 'save',
  'ቀጣይ ገጽ': 'next', 'ወደ ቀጣዩ ገጽ ሂድ': 'next', 'ወደ ቀጣዩ ገጽ ይሂዱ': 'next',
  'ቀዳሚ ገጽ': 'previous', 'ወደ ቀዳሚው ገጽ ተመለስ': 'previous',
  'የተቀመጡ ሥራዎች': 'shortlist', 'የተቀመጡ ስራዎች': 'shortlist', 'የተቀመጡ ሥራዎችን ክፈት': 'shortlist',
  'ወደ ውጤቶች ተመለስ': 'back to results', 'አዲስ ፍለጋ': 'new search', 'ረቂቅ አዘጋጅ': 'prepare draft',
};
const roleAliases: Record<string, string> = {
  'ሁሉም ሥራዎች': 'all jobs', 'ሁሉም ስራዎች': 'all jobs', 'ሁሉንም ሥራዎች': 'all jobs', 'ሁሉንም ስራዎች': 'all jobs',
  'ሁሉንም ሥራዎች አሳይ': 'all jobs', 'ሁሉንም ስራዎች አሳይ': 'all jobs',
  'የማስታወቂያ ጽሑፍ አዘጋጅ': 'copywriter', 'ጽሑፍ አዘጋጅ': 'copywriter', 'ጽሁፍ አዘጋጅ': 'copywriter',
  'የትምህርት መረጃ ረዳት': 'learning data assistant', 'የመረጃ ረዳት': 'learning data assistant',
  'የሲኤንሲ ማጠፊያ ማሽን ኦፕሬተር': 'CNC bending operator', 'የማሽን ኦፕሬተር': 'CNC bending operator', 'ማሽን': 'machine',
  'ጀማሪ የድር ገንቢ': 'junior web developer', 'የድር ገንቢ': 'web developer', 'ድር ገንቢ': 'web developer',
  'የቤተ መጻሕፍት ረዳት': 'library assistant', 'ቤተ መጻሕፍት': 'library', 'ቤተ መጻህፍት': 'library',
  'የደንበኛ ድጋፍ ረዳት': 'customer support assistant', 'የደንበኛ ድጋፍ': 'customer support',
  'ጀማሪ የሂሳብ መዝገብ ያዥ': 'bookkeeper', 'የሂሳብ መዝገብ ያዥ': 'bookkeeper', 'ሂሳብ': 'bookkeeper',
  'የአትክልት ረዳት': 'garden assistant', 'አትክልት': 'garden', 'የግራፊክ ንድፍ አዘጋጅ': 'graphic designer', 'ግራፊክ ዲዛይነር': 'graphic designer',
  'የሎጂስቲክስ ረዳት': 'logistics assistant', 'ሎጂስቲክስ': 'logistics', 'የትምህርት አመቻች': 'learning facilitator', 'ረዳት': 'assistant',
};
const numberAliases: Record<string, string> = {
  'አንድ': '1', 'ሁለት': '2', 'ሶስት': '3', 'ሦስት': '3', 'አራት': '4', 'አምስት': '5', 'ስድስት': '6',
  'ሰባት': '7', 'ስምንት': '8', 'ዘጠኝ': '9', 'አስር': '10', 'አሥር': '10', 'አስራ አንድ': '11', 'አሥራ አንድ': '11',
  '፩': '1', '፪': '2', '፫': '3', '፬': '4', '፭': '5', '፮': '6', '፯': '7', '፰': '8', '፱': '9', '፲': '10', '፲፩': '11',
};

export function amharicCommand(value: string): string {
  const text = normalizeSpeechText(value).replace(/^(?:እባክህ|እባክዎ)\s+/, '');
  if (Object.hasOwn(commandAliases, text)) return commandAliases[text];
  const save = /^(?:አስቀምጥ|save) (.+)$/.exec(text) || /^(.+) አስቀምጥ$/.exec(text);
  const details = /^(?:ዝርዝር|details) (.+)$/.exec(text) || /^(.+) ዝርዝር$/.exec(text);
  if (save || details) {
    const value = (save || details)![1].replace(/^(?:ውጤት|ውጤቶች|ሥራ|ሥራዎች) /, '');
    const tokens = value.split(/\s+(?:እና|and)\s+|\s*[,፣]\s*/).map(token => {
      const number = token.replace(/ን$/, '');
      return Object.hasOwn(numberAliases, number) ? numberAliases[number] : number;
    });
    return `${save ? 'save' : 'details'} ${tokens.join(' and ')}`;
  }
  const search = /^(?:ፈልግ|search) (.+)$/.exec(text) || /^(.+) ፈልግ$/.exec(text);
  if (search) return `search ${Object.hasOwn(roleAliases, search[1]) ? roleAliases[search[1]] : search[1]}`;
  return Object.hasOwn(roleAliases, text) ? roleAliases[text] : text;
}
