// Shared demo loader. Hosts use the same versioned artifacts and integrity file.
const origin = new URL(import.meta.url).origin;
const status = document.querySelector('#release-status');
try {
  const response = await fetch(`${origin}/components/0.1.0/integrity.json`, { credentials: 'omit' });
  if (!response.ok) throw new Error('Release unavailable');
  const manifest = await response.json();
  const entries = document.querySelector('access-career-gateway') ? ['jobs.js'] : ['lesson.js'];
  for (const entry of entries) {
    if (typeof manifest[entry] !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(manifest[entry])) throw new Error('Invalid integrity');
    const script = document.createElement('script'); script.type = 'module'; script.src = `${origin}/components/0.1.0/${entry}`;
    script.integrity = manifest[entry]; script.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
  }
  if (status) status.textContent = 'Access component loaded. This is a local integration demonstration.';
} catch {
  if (status) status.textContent = 'The component could not load. Run npm run build and reload, or use the fallback links.';
}
const toggle = document.querySelector('#toggle-access');
document.querySelector('#host-lesson')?.addEventListener('change', event => {
  const lesson = document.querySelector('alx-accessible-lesson');
  lesson.setAttribute('lesson-id', event.target.value);
  const fallback = lesson.querySelector('a');
  if (fallback) fallback.href = `${origin}/api/v1/lessons/${event.target.value}/downloads/html?version=1`;
});
toggle?.addEventListener('click', () => {
  const panel = document.querySelector('#access-panel');
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
  toggle.textContent = panel.hidden ? 'Show Access learning tools' : 'Hide Access learning tools';
});
