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
const lessonSelect = document.querySelector('#demo-lesson');
const continueLink = document.querySelector('#continue-careers');
const completedLessons = new Set();
function renderCompletion() {
  const key = 'access:demo:completed:v1:' + lessonSelect.value;
  let complete = completedLessons.has(lessonSelect.value);
  try { complete ||= sessionStorage.getItem(key) === '1'; } catch { /* Storage is optional. */ }
  completion.disabled = complete;
  continueLink.hidden = !complete;
  completion.textContent = complete ? 'Demo lesson completed' : 'Mark demo lesson complete';
  document.querySelector('#completion-status').textContent = complete ? 'Completed in this demo session.' : 'Completion here applies to this demo session.';
  document.querySelector('#progress-text').textContent = (complete ? '1' : '0') + ' of 1 lessons completed in this demo';
  document.querySelector('.progress-fill').style.width = complete ? '100%' : '0%';
  for (const link of document.querySelectorAll('[data-careers]')) link.href = '/demo/careers?lesson=' + encodeURIComponent(lessonSelect.value);
}
completion.addEventListener('click', () => {
  completedLessons.add(lessonSelect.value);
  try { sessionStorage.setItem('access:demo:completed:v1:' + lessonSelect.value, '1'); } catch { /* Use in-memory completion. */ }
  renderCompletion();
  continueLink.focus();
});

const lessons = {
  'alx-transforming-africa': {
    title: 'We Are Transforming Africa',
    introduction: 'Meet the learners and community behind ALX. Watch the introduction, follow the captions, or jump to a passage in the transcript.',
    duration: '2 min video', download: 'Save lesson video · 20.4 MB',
    excerpt: [[0, '[Music]'], [1, 'I call this the experience of a lifetime.'], [41, "You're going to meet incredible people."]],
    addition: 'EthSL concept animation with an optional ASL draft',
  },
  'w3c-colors-with-good-contrast': {
    title: 'Colors with Good Contrast',
    introduction: 'An attributed W3C WAI practice lesson with Amharic and Tigrigna captions awaiting human review, and standard and audio-described editions.',
    duration: '1 min video', download: 'Save standard lesson video',
    excerpt: [[5, "There's something about great design"], [7, 'that allows it to go practically unnoticed.'], [15, 'Choosing colors with poor contrast makes navigating, reading, and interacting a real pain.']],
    addition: 'Audio-described video and low-data described audio from the attributed W3C source',
  },
};

function setLesson(lessonId) {
  const selected = Object.hasOwn(lessons, lessonId) ? lessonId : 'alx-transforming-africa';
  const details = lessons[selected];
  const base = `/api/v1/lessons/${selected}`;
  lessonSelect.value = selected;
  document.title = `${details.title} · Savanna learning demo`;
  document.querySelector('.lesson-heading').textContent = details.title;
  document.querySelector('.savanna-styles p').textContent = details.introduction;
  const outline = document.querySelector('#course-outline .current');
  const duration = document.createElement('span'); duration.textContent = details.duration;
  outline.replaceChildren(document.createTextNode(`${details.title} `), duration);
  const baseline = document.querySelector('.baseline-video video');
  baseline.pause(); baseline.querySelector('source').src = `${base}/media/video?version=1`; baseline.load();
  baseline.querySelector('a').href = `${base}/media/video?version=1`;
  const transcript = document.querySelector('.baseline-video details');
  const summary = document.createElement('summary'); summary.textContent = 'Transcript excerpt';
  transcript.replaceChildren(summary);
  for (const [start, text] of details.excerpt) {
    const passage = document.createElement('p');
    const clock = document.createElement('strong'); clock.textContent = `0:${String(start).padStart(2, '0')}`;
    passage.append(clock, document.createTextNode(` ${text}`)); transcript.append(passage);
  }
  const transcriptLink = document.createElement('a');
  transcriptLink.href = `${base}/downloads/html?version=1`; transcriptLink.textContent = 'Open the complete static transcript';
  const linkParagraph = document.createElement('p'); linkParagraph.append(transcriptLink); transcript.append(linkParagraph);
  const component = document.querySelector('alx-accessible-lesson');
  component.toggleAttribute('asl-demo-preview', selected === 'alx-transforming-africa');
  component.setAttribute('lesson-id', selected);
  component.querySelector('a').href = `${base}/downloads/html?version=1`;
  document.querySelector('.change-summary li:last-child').textContent = details.addition;
  const download = document.querySelector('#lesson-resources a');
  download.href = `${base}/media/video?version=1`; download.textContent = details.download;
  renderCompletion();
}

renderCompletion();
if (new URLSearchParams(location.search).get('lesson') === 'w3c-colors-with-good-contrast') setLesson('w3c-colors-with-good-contrast');
lessonSelect.addEventListener('change', () => {
  setLesson(lessonSelect.value);
  const url = new URL(location.href); url.searchParams.set('lesson', lessonSelect.value);
  history.pushState({}, '', url);
});
addEventListener('popstate', () => setLesson(new URLSearchParams(location.search).get('lesson')));
