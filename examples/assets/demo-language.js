const languages = ['en', 'am', 'om', 'ti'];
const preference = 'access:demo-page-language';
const componentSelector = 'alx-accessible-lesson, access-career-gateway';
const excluded = 'script, style, textarea, [contenteditable], [translate="no"], .active-caption, .voice-guide';
const attributes = ['aria-label', 'title', 'placeholder', 'alt'];
const selector = document.querySelector('#demo-language');
const status = document.querySelector('#demo-language-status');
const catalogs = new Map();
const roots = new Set([document.body]);
const initialized = new WeakSet();
const originals = new WeakMap();
let language = 'en';
let catalog = {};
let revision = 0;
let requested = 'en';
let updatingCaption = false;

const key = text => text.trim().replace(/\s+/g, ' ');
const lookup = text => Object.hasOwn(catalog, text) ? catalog[text] : text;

function translate(text) {
  const source = key(text);
  const exact = lookup(source);
  if (exact !== source) return exact;
  const command = /^(Jump to|Video time|Version) (\d[\d:.]*)$/.exec(source);
  if (command) return `${lookup(command[1])} ${command[2]}`;
  const action = /^(View details|Save job|Play recorded summary) — (.+)$/.exec(source);
  if (action) return `${lookup(action[1])} — ${lookup(action[2])}`;
  const saved = /^(.+) (saved for this session|removed from saved jobs)\.$/.exec(source);
  if (saved) return `${lookup(saved[1])} · ${lookup(saved[2] === 'saved for this session' ? 'Saved for this session' : 'Removed from saved jobs')}.`;
  const recording = /^Playing the recorded synthetic demo summary for (.+)\.$/.exec(source);
  if (recording) return `${lookup('Playing the recorded synthetic demo summary for')} ${lookup(recording[1])}.`;
  const deadline = /^(.+) \((Ethiopian|Gregorian)\)$/.exec(source);
  if (deadline) return `${deadline[1]} (${lookup(deadline[2])})`;
  const result = /^(\d+) jobs? found( in saved jobs)?\.$/i.exec(source);
  if (result) return `${result[1]} ${lookup(result[2] ? 'Jobs found in saved jobs' : 'Jobs found')}.`;
  const sections = /^(\d+) of (\d+) sections found\.$/.exec(source);
  if (sections) return `${sections[1]}/${sections[2]} ${lookup('Sections found')}.`;
  const fileSize = /^(.+) (\([\d.,]+ KB\))$/.exec(source);
  if (fileSize) return `${lookup(fileSize[1])} ${fileSize[2]}`;
  const review = /^(.+)\. Human review is pending\.$/.exec(source);
  if (review) return `${translate(review[1])}. ${lookup('Human review is pending.')}`;
  if (source.includes(' · ')) return source.split(' · ').map(part => {
    if (part === 'review pending') return lookup('Review pending');
    return translate(part);
  }).join(' · ');
  return source;
}

function retainSource(node, field, value, write) {
  const fields = originals.get(node) || {};
  const previous = fields[field];
  const source = previous?.output === value ? previous.source : value;
  const normalized = key(source);
  if (!normalized) return;
  const translated = language === 'en' ? normalized : translate(source);
  const output = translated === normalized ? source : source.replace(source.trim(), translated);
  fields[field] = { source, output };
  originals.set(node, fields);
  if (value !== output) write(output);
}

function setCaption(root) {
  const select = root.querySelector('[data-caption-language]');
  if (!select || select.value === language || !Array.from(select.options).some(option => option.value === language)) return;
  initialized.add(select);
  updatingCaption = true;
  select.value = language;
  select.dispatchEvent(new Event('change'));
  updatingCaption = false;
}

function register(node) {
  if (!node.shadowRoot || roots.has(node.shadowRoot)) return;
  roots.add(node.shadowRoot);
  node.demoTranslation = text => language === 'en' ? text : translate(text);
  localize(node.shadowRoot);
  observe(node.shadowRoot);
}

function visit(node) {
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!element || element.closest?.(excluded)) return;
  if (node.nodeType === Node.TEXT_NODE) {
    retainSource(node, 'text', node.data, value => { node.data = value; });
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.matches(componentSelector)) register(node);
    if (node.matches('article[aria-label]') && node.lang !== language) {
      node.lang = language;
    }
    if (node.matches('[data-caption-language]') && !initialized.has(node)) {
      initialized.add(node);
      if (language !== 'en') setCaption(node.getRootNode());
    }
    for (const name of attributes) {
      if (node.hasAttribute(name)) retainSource(node, name, node.getAttribute(name), value => node.setAttribute(name, value));
    }
  }
}

function localize(node) {
  if (node.nodeType === Node.TEXT_NODE) { visit(node); return; }
  if (node.closest?.(excluded)) return;
  visit(node);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: target => target.matches?.(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (walker.nextNode()) visit(walker.currentNode);
}

const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'childList') record.addedNodes.forEach(node => { if (node.isConnected) localize(node); });
    else if (record.target.isConnected) visit(record.target);
  }
});
function observe(root) {
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributes });
}

const preview = 'Machine translation preview. Human review is pending. Voice and offline content have separate language settings.';
const failed = 'This page language could not load. The current language is still active.';

async function selectLanguage(next, changeCaption = false) {
  if (!languages.includes(next)) return;
  requested = next;
  const attempt = ++revision;
  try {
    if (next !== 'en' && !catalogs.has(next)) {
      const response = await fetch(new URL(`./locales/${next}.json`, import.meta.url));
      if (!response.ok) throw new Error('Catalog unavailable');
      catalogs.set(next, await response.json());
    }
    if (attempt !== revision) return;
  } catch {
    if (attempt !== revision) return;
    requested = language;
    selector.value = language;
    status.textContent = translate(failed);
    return;
  }
  language = next;
  catalog = catalogs.get(language) || {};
  document.documentElement.lang = language;
  selector.value = language;
  try { localStorage.setItem(preference, language); } catch { /* The current page still uses the selected language. */ }
  for (const root of roots) {
    localize(root);
    if (changeCaption) setCaption(root);
  }
  document.title = language === 'en' ? originalTitle : translate(originalTitle);
  status.textContent = language === 'en' ? '' : translate(preview);
}

const originalTitle = document.title;
observe(document.body);
for (const tag of componentSelector.split(', ')) {
  if (document.querySelector(tag)) void customElements.whenDefined(tag).then(() => document.querySelectorAll(tag).forEach(register));
}
selector.addEventListener('change', () => void selectLanguage(selector.value, true));
document.addEventListener('alx-caption-language', event => {
  if (!updatingCaption && event.target.getAttribute?.('lesson-id') === 'alx-transforming-africa' &&
      event.detail.language !== requested) void selectLanguage(event.detail.language);
});
try {
  const saved = localStorage.getItem(preference);
  if (languages.includes(saved) && saved !== 'en') void selectLanguage(saved, true);
} catch { /* English remains available when storage is blocked. */ }
