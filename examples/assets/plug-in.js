const origin = new URL(import.meta.url).origin;
const base = `${origin}/api/v1`;
const bundle = `${origin}/components/0.1.0/lesson.js`;
const lesson = document.querySelector('#lesson');
const install = document.querySelector('#install');
const remove = document.querySelector('#remove');
const copy = document.querySelector('#copy');
const status = document.querySelector('#install-status');
const mount = document.querySelector('#mount');
const snippet = document.querySelector('#snippet');
const events = document.querySelector('#events');
let integrity;
let count = 0;

function updateSnippet() {
  if (!integrity) return;
  snippet.value = `<script type="module" src="${bundle}" integrity="${integrity}" crossorigin="anonymous"></script>\n<alx-accessible-lesson api-base="${base}" lesson-id="${lesson.value}" content-version="1" lang="en">\n  <p><a href="${base}/lessons/${lesson.value}/downloads/html?version=1">Download the accessible lesson</a></p>\n</alx-accessible-lesson>`;
}

for (const name of ['alx-media-ready', 'alx-media-error', 'alx-media-download']) {
  mount.addEventListener(name, event => {
    if (!count) events.replaceChildren();
    const item = document.createElement('li');
    item.textContent = `${++count}. ${name} — ${JSON.stringify(event.detail)}`;
    events.prepend(item);
    while (events.children.length > 10) events.lastElementChild.remove();
    if (name === 'alx-media-ready') status.textContent = 'Component ready. The lesson is loaded inside the host page.';
    if (name === 'alx-media-error') status.textContent = 'The lesson could not load. Use its retry button or download link.';
  });
}

install.addEventListener('click', () => {
  const element = document.createElement('alx-accessible-lesson');
  element.setAttribute('api-base', base);
  element.setAttribute('lesson-id', lesson.value);
  element.setAttribute('content-version', '1');
  element.setAttribute('lang', 'en');
  const fallback = document.createElement('a');
  fallback.href = `${base}/lessons/${lesson.value}/downloads/html?version=1`;
  fallback.textContent = 'Download the accessible lesson';
  element.append(fallback);
  mount.replaceChildren(element);
  remove.disabled = false;
  status.textContent = 'Loading the lesson inside the host page…';
});
remove.addEventListener('click', () => {
  const message = document.createElement('p');
  message.className = 'empty';
  message.textContent = 'Component removed. The training provider’s page remains available.';
  mount.replaceChildren(message);
  remove.disabled = true;
  install.focus();
  status.textContent = 'Component removed. Install it again to try another lesson.';
});
lesson.addEventListener('change', updateSnippet);
document.querySelector('#theme').addEventListener('change', event => {
  document.querySelector('.partner').classList.toggle('plum', event.target.value === 'plum');
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(snippet.value);
    status.textContent = 'Embed code copied. Configure the host origin before using it on another site.';
  } catch {
    snippet.focus();
    snippet.select();
    status.textContent = 'Select and copy the embed code manually. Clipboard access is unavailable.';
  }
});

try {
  const response = await fetch(`${origin}/components/0.1.0/integrity.json`, { credentials: 'omit' });
  if (!response.ok) throw new Error('Release unavailable');
  integrity = (await response.json())['lesson.js'];
  if (typeof integrity !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(integrity)) throw new Error('Invalid integrity');
  updateSnippet();
  const script = document.createElement('script');
  script.type = 'module';
  script.src = bundle;
  script.integrity = integrity;
  script.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  if (!customElements.get('alx-accessible-lesson')) throw new Error('Component unavailable');
  install.disabled = false;
  copy.disabled = false;
  status.textContent = 'Ready to install. Choose a lesson, then select Install component.';
} catch {
  status.textContent = 'The component release could not load. Build it with npm run build, then reload this page.';
}
