const productionOrigin = document.documentElement.dataset.pluginOrigin;
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const pluginOrigin = local ? 'http://127.0.0.1:8000' : productionOrigin;
const apiBase = `${pluginOrigin}/api/v1`;
const certificateBase = local ? 'http://127.0.0.1:5174/certificates/' : `${location.origin}/certificates/`;
const status = document.querySelector('#release-status');
const gateway = document.querySelector('access-career-gateway');

function setExperience(mode, announce = true) {
  const selected = mode === 'before' ? 'before' : 'after';
  document.documentElement.dataset.accessMode = selected;
  document.querySelectorAll('[data-experience-view]').forEach(view => { view.hidden = view.dataset.experienceView !== selected; });
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === selected)));
  if (announce) document.querySelector('.comparison-status').textContent = selected === 'before'
    ? 'Showing the reconstructed standard vacancy listings.'
    : 'Showing Access career tools and the readable page appearance.';
  return selected;
}

const initialMode = new URLSearchParams(location.search).get('mode');
setExperience(initialMode === 'before' ? 'before' : 'after');
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = setExperience(button.dataset.mode); const url = new URL(location.href);
  url.searchParams.set('mode', mode); history.pushState({ mode }, '', url);
}));
addEventListener('popstate', () => setExperience(new URLSearchParams(location.search).get('mode')));

async function loadBaselineJobs() {
  const count = document.querySelector('#baseline-count');
  const list = document.querySelector('#baseline-jobs');
  const search = document.querySelector('#baseline-search');
  const sector = document.querySelector('#baseline-sector');
  if (!count || !list || !search || !sector) return;
  try {
    const response = await fetch(`${apiBase}/jobs`, { credentials: 'omit' });
    if (!response.ok) throw new Error('Jobs unavailable');
    const jobs = await response.json();
    if (!Array.isArray(jobs) || jobs.length > 100 || !jobs.every(job => job?.demo === true && typeof job.id === 'string' && typeof job.title === 'string' && typeof job.organization === 'string' && typeof job.summary === 'string' && typeof job.sector === 'string')) throw new Error('Invalid jobs');
    [...new Set(jobs.map(job => job.sector))].sort().forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; sector.append(option); });
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const matches = jobs.filter(job => (!query || `${job.title} ${job.organization} ${job.summary}`.toLocaleLowerCase().includes(query)) && (!sector.value || sector.value === job.sector));
      count.textContent = `${matches.length} ${matches.length === 1 ? 'vacancy' : 'vacancies'} found.`;
      list.replaceChildren(...matches.map(job => {
        const article = document.createElement('article'); const heading = document.createElement('h3'); const company = document.createElement('p'); const summary = document.createElement('p'); const meta = document.createElement('p');
        heading.textContent = job.title; company.textContent = `${job.organization} · ${job.location}`; company.className = 'baseline-company'; summary.textContent = job.summary; meta.textContent = `${job.sector} · ${job.workplace} · ${job.employment_type}`; meta.className = 'baseline-meta';
        article.append(heading, company, summary, meta); return article;
      }));
    };
    search.addEventListener('input', render); sector.addEventListener('change', render); render();
  } catch {
    count.textContent = 'The fictional vacancy fixture could not load. Try again shortly.';
  }
}

void loadBaselineJobs();

if (gateway) {
  gateway.setAttribute('api-base', apiBase);
  gateway.setAttribute('certificate-base', certificateBase);
}

try {
  const response = await fetch(`${pluginOrigin}/components/0.1.0/integrity.json`, { credentials: 'omit' });
  if (!response.ok) throw new Error('Release unavailable');
  const manifest = await response.json();
  const integrity = manifest['jobs.js'];
  if (typeof integrity !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(integrity)) throw new Error('Invalid release integrity');
  const script = document.createElement('script');
  script.type = 'module'; script.src = `${pluginOrigin}/components/0.1.0/jobs.js`;
  script.integrity = integrity; script.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
  status.textContent = 'Career tools connected. All vacancies on this page are fictional public fixtures.';
} catch {
  status.textContent = 'Career tools could not connect. Open the public fixture link or try again shortly.';
}
