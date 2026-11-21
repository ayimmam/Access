import { amharicCommand } from './career-amharic';
import { normalizeSpeechText } from './career-speech';

const aliases = {
  amharic: 'amharic', 'switch to amharic': 'amharic', 'speak amharic': 'amharic', 'language amharic': 'amharic',
  english: 'english', 'switch to english': 'english', 'speak english': 'english', 'language english': 'english',
  stop: 'stop', cancel: 'stop',
  shortlist: 'shortlist', 'open shortlist': 'shortlist', 'saved jobs': 'shortlist',
  'new search': 'new search',
  next: 'next', 'next page': 'next', 'go to the next page': 'next',
  previous: 'previous', 'previous page': 'previous', 'go to the previous page': 'previous',
  repeat: 'repeat', 'repeat that': 'repeat',
  back: 'back', 'back to results': 'back', results: 'back',
  'prepare draft': 'draft', 'prepare fictional draft': 'draft', draft: 'draft',
  save: 'save current', details: 'details without number',
} as const;
const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
type Action = typeof aliases[keyof typeof aliases];

export type CareerCommand = { kind: Action | 'empty' }
  | { kind: 'search' | 'role'; query: string }
  | { kind: 'save' | 'details'; numbers: number[] }
  | { kind: 'invalid numbers'; text: string };

export function parseCareerCommand(value: string, language: 'en' | 'am'): CareerCommand {
  const text = language === 'am' ? amharicCommand(value) : normalizeSpeechText(value);
  if (!text || value.length > 160) return { kind: 'empty' };
  const words = text.replace(/^please /, '');
  if (Object.hasOwn(aliases, words)) return { kind: aliases[words as keyof typeof aliases] };
  if (['all jobs', 'show all jobs', 'show me all jobs', 'search all jobs', 'search for all jobs'].includes(words)) {
    return { kind: 'search', query: '' };
  }
  const search = /^search (?:for )?(.+)$/.exec(words);
  if (search) return { kind: 'search', query: search[1] };

  const numbered = /^(save|details)(?: (?:jobs?|results?))? (.+)$/.exec(words);
  if (numbered) {
    const selected = numbered[2].split(/\s+and\s+|\s*,\s*/)
      .map(token => /^\d+$/.test(token) ? Number(token) : numbers.indexOf(token));
    const kind = numbered[1] === 'save' ? 'save' : 'details';
    if (selected.length > 5 || (kind === 'details' && selected.length !== 1) || selected.some(number => number < 1 || !Number.isSafeInteger(number))) {
      return { kind: 'invalid numbers', text };
    }
    return { kind, numbers: [...new Set(selected)] };
  }
  return { kind: 'role', query: text };
}

export function careerCommandKey(value: string, language: 'en' | 'am', expectingRole: boolean): string {
  const command = parseCareerCommand(value, language);
  if (command.kind === 'empty') return normalizeSpeechText(value);
  if (command.kind === 'role' && expectingRole) return JSON.stringify({ kind: 'search', query: command.query });
  return JSON.stringify(command);
}
