// Shared demo loader. Hosts use the same versioned artifacts and integrity file.
const origin = new URL(import.meta.url).origin;
const status = document.querySelector('#release-status');
const selectLesson = event => {
  const lesson = document.querySelector('alx-accessible-lesson');
  lesson.setAttribute('lesson-id', event.target.value);
  const fallback = lesson.querySelector('a');
  if (fallback) fallback.href = `${origin}/api/v1/lessons/${event.target.value}/downloads/html?version=1`;
};
document.querySelector('#host-lesson')?.addEventListener('change', selectLesson);
try {
  const response = await fetch(`${origin}/api/v1/release`, { credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Release unavailable');
  const release = await response.json();
  if (!/^[0-9a-f]{64}$/.test(release.release_id) || release.base_path !== `/components/releases/${release.release_id}/`) throw new Error('Invalid release');
  const metadata = await fetch(`${origin}${release.base_path}integrity.json`, { credentials: 'omit' });
  if (!metadata.ok) throw new Error('Integrity unavailable');
  const manifest = await metadata.json();
  const entries = document.querySelector('access-career-gateway') ? ['jobs.js'] : ['lesson.js'];
  for (const entry of entries) {
    if (typeof manifest[entry] !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(manifest[entry])) throw new Error('Invalid integrity');
    const script = document.createElement('script'); script.type = 'module'; script.src = `${origin}${release.base_path}${entry}`;
    script.integrity = manifest[entry]; script.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
  }
  if (status) status.textContent = 'Access component loaded. This is a local integration demonstration.';
} catch {
  if (status) status.textContent = 'The component could not load. Run npm run build and reload, or use the fallback links.';
}
const toggle = document.querySelector('#toggle-access');
toggle?.addEventListener('click', () => {
  const panel = document.querySelector('#access-panel');
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
  toggle.textContent = panel.hidden ? 'Show Access learning tools' : 'Hide Access learning tools';
});
