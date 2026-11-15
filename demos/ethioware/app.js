const productionOrigin = document.documentElement.dataset.pluginOrigin;
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const pluginOrigin = local ? 'http://127.0.0.1:8000' : productionOrigin;
const apiBase = `${pluginOrigin}/api/v1`;
const status = document.querySelector('#release-status');
const lesson = document.querySelector('alx-accessible-lesson');
const fallback = lesson?.querySelector('a');
const replaySearch = document.querySelector('#replay-search');
const replayItems = [...document.querySelectorAll('[data-replay-text]')];
const replayCount = document.querySelector('#replay-count');

function setExperience(mode, announce = true) {
  const selected = mode === 'before' ? 'before' : 'after';
  document.querySelectorAll('[data-experience-view]').forEach(view => {
    view.hidden = view.dataset.experienceView !== selected;
  });
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === selected));
  });
  if (announce) {
    document.querySelector('.comparison-status').textContent = selected === 'before'
      ? 'Showing the reconstructed standard course reader.'
      : 'Showing the lesson with Access learning tools.';
  }
  return selected;
}

const initialMode = new URLSearchParams(location.search).get('mode');
setExperience(initialMode === 'before' ? 'before' : 'after');
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = setExperience(button.dataset.mode);
  const url = new URL(location.href); url.searchParams.set('mode', mode); history.pushState({ mode }, '', url);
}));
addEventListener('popstate', () => setExperience(new URLSearchParams(location.search).get('mode')));

const courseSearch = document.querySelector('#course-search');
const courseCount = document.querySelector('#course-count');
const courseCards = [...document.querySelectorAll('.catalog-card')];

function filterCourses() {
  const query = courseSearch.value.trim().toLocaleLowerCase();
  let matches = 0;
  for (const card of courseCards) {
    card.hidden = !card.textContent.toLocaleLowerCase().includes(query);
    if (!card.hidden) matches++;
  }
  courseCount.textContent = `${matches} ${matches === 1 ? 'course' : 'courses'} found.`;
}

courseSearch.addEventListener('input', filterCourses);
courseSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter') location.hash = 'courses';
});
filterCourses();

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

replaySearch?.addEventListener('input', () => {
  const query = replaySearch.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const item of replayItems) {
    item.hidden = Boolean(query) && !item.textContent.toLocaleLowerCase().includes(query);
    if (!item.hidden) visible++;
  }
  replayCount.textContent = query ? `${visible} of ${replayItems.length} replay entries found.` : '';
});

const toggle = document.querySelector('#toggle-access');
toggle?.addEventListener('click', () => {
  const panel = document.querySelector('#access-panel');
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
  toggle.textContent = panel.hidden ? 'Show learning tools' : 'Hide learning tools';
});
