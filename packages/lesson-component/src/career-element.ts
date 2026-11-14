interface Job {
  id: string; title: string; organization: string; location: string; sector: string;
  employment_type: string; workplace: string; experience: string; salary: string;
  deadline: string; summary: string; responsibilities: string[]; skills: string[];
  support: string[]; demo: true;
}

const css = `
:host { display:block; font:1rem/1.6 system-ui,sans-serif; color:var(--access-text,#192131); }
* { box-sizing:border-box; } [hidden] { display:none !important; }
h2,h3,h4 { line-height:1.3; } h2 { font-size:2rem; margin-top:0; } h3 { margin:0 0 .4rem; font-size:1.35rem; }
p { max-width:75ch; } a { color:var(--access-link,#a8174d); text-underline-offset:.2em; }
button,input,select { font:inherit; color:inherit; background:white; border:1px solid #8290a3; border-radius:.5rem; min-height:44px; padding:.55rem .8rem; max-width:100%; }
button,summary { cursor:pointer; } button:disabled { color:#586371; background:#edf0f3; cursor:default; }
:focus-visible { outline:3px solid #7141b0; outline-offset:3px; }
label { display:grid; gap:.35rem; font-weight:600; } input[type=checkbox] { width:1.2rem; height:1.2rem; min-height:0; flex-shrink:0; }
.search { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:1rem; margin-bottom:1.5rem; }
.layout { display:grid; grid-template-columns:minmax(0,1fr) 18rem; gap:1.75rem; align-items:start; }
.filters { grid-column:2; grid-row:1; border:1px solid #d6dce5; border-radius:.8rem; background:white; padding:1.5rem; }
.filters h3 { margin-bottom:1rem; } fieldset { border:0; margin:1.3rem 0 0; padding:0; } legend { font-weight:700; }
.check { display:flex; gap:.7rem; align-items:center; min-height:44px; font-weight:400; }
.results { grid-column:1; grid-row:1; min-width:0; }
.result-header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.7rem; margin-bottom:1rem; }
.result-header p { margin:0; } article { background:white; padding:clamp(1rem,3vw,1.8rem); border:1px solid #d6dce5; border-radius:.8rem; margin-bottom:1rem; }
.company { color:#4b596a; margin-top:0; } .tags { list-style:none; display:flex; flex-wrap:wrap; gap:.45rem; padding:0; }
.tags li { background:#f1f3f7; border:1px solid #d4dae4; border-radius:1rem; padding:.2rem .65rem; font-size:.85rem; }
.support li { background:#edf6ef; border-color:#bad3c0; color:#254d32; }
dl { display:flex; flex-wrap:wrap; gap:1rem 2rem; margin-block:1.5rem; } dt { color:#505c6e; font-size:.85rem; } dd { margin:0; font-weight:600; }
.actions { display:flex; gap:.6rem; flex-wrap:wrap; } .primary { color:#a8174d; border-color:#a8174d; font-weight:600; }
.note { color:#4b596a; font-size:.9rem; } .empty { padding:2rem; border:1px dashed #8290a3; background:white; }
dialog { color:inherit; border:1px solid #8290a3; border-radius:.8rem; max-width:min(46rem,calc(100vw - 2rem)); max-height:85vh; overflow:auto; padding:1.5rem; }
dialog::backdrop { background:#101827a6; } .close { float:right; margin:0 0 1rem 1rem; }
summary { min-height:44px; padding:.5rem 0; font-weight:600; } textarea { font:inherit; width:100%; min-height:6rem; }
@media(max-width:850px) { .layout { display:flex; flex-direction:column; } .filters,.results { width:100%; } .search { grid-template-columns:1fr; } }
@media(prefers-contrast:more) { button,input,select,article { border:2px solid currentColor; } }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  if (text !== undefined) value.textContent = text;
  return value;
}
function button(text: string, action: () => void) {
  const value = el('button', text); value.type = 'button'; value.addEventListener('click', action); return value;
}
function options(label: string, values: string[]) {
  const wrapper = el('label', label); const select = el('select');
  for (const value of ['', ...values]) { const option = el('option', value || 'All'); option.value = value; select.append(option); }
  wrapper.append(select); return { wrapper, select };
}

export class CareerGateway extends HTMLElement {
  static observedAttributes = ['api-base'];
  private root = this.attachShadow({ mode: 'open' });
  private controller?: AbortController;
  private saved = new Set<string>();
  private utterance?: SpeechSynthesisUtterance;
  private cleanupVoice?: () => void;
  private timer?: ReturnType<typeof setTimeout>;

  connectedCallback() { void this.load(); }
  attributeChangedCallback() { if (this.isConnected) void this.load(); }
  disconnectedCallback() { this.controller?.abort(); this.cleanup(); }
  private cleanup() {
    clearTimeout(this.timer); this.cleanupVoice?.(); this.cleanupVoice = undefined;
    if (this.utterance) { window.speechSynthesis?.cancel(); this.utterance = undefined; }
  }
  private emit(name: string, jobId: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: { jobId, demo: true } }));
  }
  private async load() {
    this.controller?.abort(); this.cleanup();
    const controller = new AbortController(); this.controller = controller;
    const style = el('style', css); const status = el('p', 'Loading demonstration jobs…'); status.setAttribute('role', 'status');
    this.root.replaceChildren(style, status);
    try {
      const base = new URL((this.getAttribute('api-base') || '/api/v1').replace(/\/$/, '') + '/', document.baseURI);
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid API');
      const response = await fetch(new URL('jobs', base), { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Jobs unavailable');
      const jobs = await response.json() as Job[];
      if (!Array.isArray(jobs) || jobs.length > 100 || !jobs.every(job => job.demo === true &&
        ['id','title','organization','location','sector','employment_type','workplace','experience','salary','deadline','summary'].every(key => typeof job[key as keyof Job] === 'string') &&
        /^[a-z0-9-]+$/.test(job.id) && /^\d{4}-\d{2}-\d{2}$/.test(job.deadline) &&
        ['responsibilities','skills','support'].every(key => Array.isArray(job[key as keyof Job]) && (job[key as keyof Job] as unknown[]).every(value => typeof value === 'string')))) throw new Error('Invalid jobs');
      if (controller.signal.aborted) return;
      status.remove(); this.render(jobs, base);
    } catch {
      if (controller.signal.aborted) return;
      status.textContent = 'Jobs could not load. Check your connection and try again.';
      this.root.append(button('Try again', () => void this.load()), el('slot'));
    }
  }

  private render(jobs: Job[], base: URL) {
    const heading = el('h2', 'Discover jobs');
    const introduction = el('p', 'Explore fictional opportunities and try the accessible career gateway. No applications are sent and no account is needed.');
    const searchRow = el('div'); searchRow.className = 'search';
    const searchLabel = el('label', 'Search jobs by title, skill or employer');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search for a job'; searchLabel.append(search);
    const view = options('Show jobs', ['Saved jobs']); searchRow.append(searchLabel, view.wrapper);
    const layout = el('div'); layout.className = 'layout';
    const filters = el('section'); filters.className = 'filters'; filters.setAttribute('aria-label', 'Filter jobs');
    filters.append(el('h3', 'Filter jobs'));
    const sector = options('Sector', [...new Set(jobs.map(job => job.sector))]); filters.append(sector.wrapper);
    const checks = (title: string, values: string[]) => {
      const group = el('fieldset'); group.append(el('legend', title));
      const inputs = values.map(value => {
        const label = el('label'); label.className = 'check'; const input = el('input'); input.type = 'checkbox'; input.value = value;
        label.append(input, el('span', value)); group.append(label); return input;
      }); filters.append(group); return inputs;
    };
    const types = checks('Job type', ['Full-time', 'Part-time', 'Freelance']);
    const sites = checks('Workplace', ['On-site', 'Remote', 'Hybrid']);
    const support = checks('Support offered in this demo', [...new Set(jobs.flatMap(job => job.support))]);
    const privacy = el('p', 'Support filters stay on this page. They are not sent to employers or stored.'); privacy.className = 'note'; filters.append(privacy);
    const results = el('section'); results.className = 'results'; results.setAttribute('aria-label', 'Job results');
    const resultHeader = el('div'); resultHeader.className = 'result-header';
    const count = el('p'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
    const calendar = options('Deadline calendar', ['Ethiopian']); resultHeader.append(count, calendar.wrapper);
    const list = el('div'); results.append(resultHeader, list);
    const dialog = el('dialog'); dialog.setAttribute('aria-labelledby', 'job-dialog-title');
    const soundStatus = el('p'); soundStatus.setAttribute('role', 'status'); soundStatus.className = 'note';
    const stop = button('Stop reading', () => { window.speechSynthesis?.cancel(); this.utterance = undefined; soundStatus.textContent = 'Reading stopped.'; });
    const soundControls = el('div'); soundControls.append(stop, soundStatus);
    const localVoice = () => 'speechSynthesis' in window ? window.speechSynthesis.getVoices().find(voice => voice.localService && voice.lang.toLowerCase().startsWith('en')) : undefined;
    const voiceNotice = () => { if (!this.utterance) soundStatus.textContent = localVoice() ? 'Read aloud uses an on-device English voice. The same summary is available as text.' : 'An on-device English voice is unavailable. Read the equivalent text summary; recorded audio is still pending.'; };
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', voiceNotice);
      this.cleanupVoice = () => window.speechSynthesis.removeEventListener('voiceschanged', voiceNotice);
    }
    voiceNotice();
    const read = (job: Job) => {
      const voice = localVoice();
      if (!voice) { voiceNotice(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${job.title}. ${job.organization}. ${job.summary}`);
      utterance.voice = voice; utterance.lang = voice.lang; this.utterance = utterance;
      soundStatus.textContent = `Reading the summary for ${job.title}.`;
      utterance.onend = () => { if (this.utterance === utterance) { this.utterance = undefined; soundStatus.textContent = 'Summary reading finished.'; } };
      utterance.onerror = () => { if (this.utterance === utterance) { this.utterance = undefined; soundStatus.textContent = 'Reading could not finish. The full text summary remains available.'; } };
      window.speechSynthesis.speak(utterance);
    };
    let trigger: HTMLButtonElement | undefined;
    dialog.addEventListener('close', () => { if (this.utterance) { window.speechSynthesis?.cancel(); this.utterance = undefined; } trigger?.focus(); });
    const dateText = (date: string) => {
      try { return new Intl.DateTimeFormat(calendar.select.value ? 'en-ET-u-ca-ethiopic' : 'en', { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`)) + (calendar.select.value ? ' (Ethiopian)' : ' (Gregorian)'); }
      catch { return `${date} (Gregorian)`; }
    };
    const detail = (job: Job, opener: HTMLButtonElement) => {
      trigger = opener;
      const close = button('Close job details', () => dialog.close()); close.className = 'close';
      const title = el('h2', job.title); title.id = 'job-dialog-title';
      const tasks = el('ul'); job.responsibilities.forEach(task => tasks.append(el('li', task)));
      const supports = el('ul'); job.support.forEach(item => supports.append(el('li', item)));
      const verify = el('a', 'Open fictional certificate verification'); verify.href = new URL('/demo/certificates/DEMO-LEARNING-001', base).href;
      const schema = el('a', 'Inspect this demo job’s JobPosting data'); schema.href = new URL(`jobs/${job.id}/structured-data`, base).href;
      const steps = el('ol');
      ['Read the responsibilities and support offered.', 'Prepare a short introduction and examples of relevant work.', 'Check the issuer verification link before sharing a certificate.'].forEach(step => steps.append(el('li', step)));
      dialog.replaceChildren(close, title, el('p', `${job.organization} · ${job.location}`), el('p', job.summary),
        el('h3', 'Responsibilities'), tasks, el('h3', 'Support offered in this fictional role'), supports,
        el('h3', 'Prepare an application'), steps, el('p', 'Practice only. There is no real vacancy, upload or application submission on this page.'), verify, el('p'));
      dialog.lastElementChild?.append(schema);
      dialog.showModal(); close.focus(); this.emit('access-job-open', job.id);
    };
    const selected = (inputs: HTMLInputElement[]) => inputs.filter(input => input.checked).map(input => input.value);
    const update = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const wantedTypes = selected(types), wantedSites = selected(sites), wantedSupport = selected(support);
      const matches = jobs.filter(job => (!query || `${job.title} ${job.organization} ${job.summary} ${job.skills.join(' ')}`.toLocaleLowerCase().includes(query)) &&
        (!sector.select.value || sector.select.value === job.sector) && (!view.select.value || this.saved.has(job.id)) &&
        (!wantedTypes.length || wantedTypes.includes(job.employment_type)) && (!wantedSites.length || wantedSites.includes(job.workplace)) && wantedSupport.every(value => job.support.includes(value)));
      count.textContent = `${matches.length} ${matches.length === 1 ? 'job' : 'jobs'} found${view.select.value ? ' in saved jobs' : ''}.`;
      list.replaceChildren();
      if (!matches.length) { const empty = el('p', 'No jobs match these filters. Clear filters or try another search.'); empty.className = 'empty'; list.append(empty); }
      for (const job of matches) {
        const article = el('article'); article.setAttribute('aria-labelledby', `title-${job.id}`);
        const title = el('h3', job.title); title.id = `title-${job.id}`;
        const company = el('p', `${job.organization} · ${job.location}`); company.className = 'company';
        const tags = el('ul'); tags.className = 'tags'; tags.setAttribute('aria-label', 'Skills'); job.skills.forEach(skill => tags.append(el('li', skill)));
        const offers = el('ul'); offers.className = 'tags support'; offers.setAttribute('aria-label', 'Support offered'); job.support.forEach(item => offers.append(el('li', item)));
        const facts = el('dl');
        for (const [label, value] of [['Pay',job.salary],['Experience',job.experience],['Job type',`${job.workplace} · ${job.employment_type}`],['Deadline',dateText(job.deadline)]]) {
          const group = el('div'); group.append(el('dt',label),el('dd',value)); facts.append(group);
        }
        const actions = el('div'); actions.className = 'actions';
        const open = button(`View details — ${job.title}`, () => detail(job, open)); open.className = 'primary';
        const save = button(`Save job — ${job.title}`, () => {
          this.saved.has(job.id) ? this.saved.delete(job.id) : this.saved.add(job.id);
          save.setAttribute('aria-pressed', String(this.saved.has(job.id)));
          count.textContent = `${job.title} ${this.saved.has(job.id) ? 'saved for this session' : 'removed from saved jobs'}.`;
          if (view.select.value) { update(); view.select.focus(); }
        }); save.setAttribute('aria-pressed', String(this.saved.has(job.id)));
        const audio = button(`Read summary — ${job.title}`, () => read(job));
        actions.append(open, save, audio);
        article.append(title, company, el('p',job.summary), tags, offers, facts, actions);
        list.append(article);
      }
    };
    filters.append(button('Clear filters', () => { search.value = ''; sector.select.value = ''; view.select.value = ''; [...types,...sites,...support].forEach(input => input.checked = false); update(); }));
    search.addEventListener('input', () => { clearTimeout(this.timer); this.timer = setTimeout(update, 200); });
    [sector.select,view.select,calendar.select,...types,...sites,...support].forEach(input => input.addEventListener('change',update));
    layout.append(filters, results);
    this.root.append(heading, introduction, searchRow, soundControls, layout, dialog);
    update();
  }
}
