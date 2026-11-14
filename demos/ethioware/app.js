const productionOrigin = document.documentElement.dataset.pluginOrigin;
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const pluginOrigin = local ? 'http://127.0.0.1:8000' : productionOrigin;
const apiBase = `${pluginOrigin}/api/v1`;
const status = document.querySelector('#release-status');
const lesson = document.querySelector('alx-accessible-lesson');
const fallback = lesson?.querySelector('a');

if (lesson) lesson.setAttribute('api-base', apiBase);

try {
  const response = await fetch(`${pluginOrigin}/components/0.1.0/integrity.json`, { credentials: 'omit' });
  if (!response.ok) throw new Error('Release unavailable');
  const manifest = await response.json();
  const integrity = manifest['lesson.js'];
  if (typeof integrity !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(integrity)) throw new Error('Invalid release integrity');
  const script = document.createElement('script');
  script.type = 'module'; script.src = `${pluginOrigin}/components/0.1.0/lesson.js`;
  script.integrity = integrity; script.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
  status.textContent = 'Access learning tools connected to the public-fixture service.';
} catch {
  status.textContent = 'Learning tools could not connect. Use the offline fallback or try again shortly.';
}

document.querySelector('#host-lesson')?.addEventListener('change', event => {
  const id = event.target.value;
  lesson?.setAttribute('lesson-id', id);
  if (fallback) fallback.href = `${apiBase}/lessons/${id}/downloads/html?version=1`;
});

const toggle = document.querySelector('#toggle-access');
toggle?.addEventListener('click', () => {
  const panel = document.querySelector('#access-panel');
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
  toggle.textContent = panel.hidden ? 'Show learning tools' : 'Hide learning tools';
});
