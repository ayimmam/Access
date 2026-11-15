const menu = document.querySelector('.menu-button');
menu.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('navigation-collapsed');
  menu.setAttribute('aria-expanded', String(!collapsed));
});

function pauseLessonMedia(mode) {
  if (mode === 'after') document.querySelector('.baseline-video video')?.pause();
  if (mode === 'before') document.querySelector('alx-accessible-lesson')?.shadowRoot?.querySelector('video')?.pause();
}

function setExperience(mode, announce = true) {
  const selected = mode === 'before' ? 'before' : 'after';
  document.documentElement.dataset.accessMode = selected;
  document.querySelectorAll('[data-experience-view]').forEach(view => { view.hidden = view.dataset.experienceView !== selected; });
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === selected)));
  pauseLessonMedia(selected);
  if (announce) document.querySelector('.comparison-status').textContent = selected === 'before'
    ? 'Showing the reconstructed standard Savanna video lesson.'
    : 'Showing Access learning tools and the readable page appearance.';
  return selected;
}

document.querySelector('alx-accessible-lesson')?.addEventListener('alx-caption-size', event => {
  const size = event.detail.size;
  if (['1', '1.25', '1.5'].includes(size)) document.documentElement.dataset.captionSize = size;
});

const initialMode = new URLSearchParams(location.search).get('mode');
setExperience(initialMode === 'before' ? 'before' : 'after');
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = setExperience(button.dataset.mode); const url = new URL(location.href);
  url.searchParams.set('mode', mode); history.pushState({ mode }, '', url);
}));
addEventListener('popstate', () => setExperience(new URLSearchParams(location.search).get('mode')));

const completion = document.querySelector('#mark-complete');
completion.addEventListener('click', () => {
  completion.disabled = true;
  completion.textContent = 'Demo lesson completed';
  document.querySelector('#completion-status').textContent = 'Completed in this demo session.';
  document.querySelector('#progress-text').textContent = '1 of 1 lessons completed in this demo';
  document.querySelector('.progress-fill').style.width = '100%';
});
