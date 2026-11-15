import type { Job } from './career-element';
import { CareerSpeech } from './career-speech';

interface GatewayActions {
  search(query: string): Job[];
  showSaved(): void;
  showResults(): Job[];
  savedJobs(): Job[];
  save(id: string): void;
  stopRecorded(): void;
  guideActive(enabled: boolean): void;
  outputMode(enabled: boolean): void;
}
type Mode = 'role' | 'results' | 'details' | 'shortlist';
type DraftField = 'name' | 'introduction' | 'experience';
const fields: { key: DraftField; label: string; question: string; limit: number; required: boolean }[] = [
  { key: 'name', label: 'Fictional name', question: 'What fictional name would you like to use?', limit: 80, required: true },
  { key: 'introduction', label: 'Introduction', question: 'What would you like this fictional employer to know about you?', limit: 600, required: true },
  { key: 'experience', label: 'Relevant experience', question: 'Would you like to add an example of relevant experience? You can skip this.', limit: 600, required: false },
];
const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function action(text: string, run: () => void) {
  const node = element('button', text); node.type = 'button'; node.addEventListener('click', run); return node;
}

export class CareerVoice {
  readonly root = element('section');
  private readonly output = element('input');
  private readonly state = element('p', 'Microphone off.');
  private readonly message = element('p', 'Choose Start voice search or Use typed search.');
  private readonly error = element('p');
  private readonly command = element('input');
  private readonly content = element('div');
  private readonly dialog = element('dialog');
  private readonly listenButton = action('Listen for a command', () => this.listen());
  private readonly nextButton = action('Next', () => this.move(1));
  private readonly previousButton = action('Previous', () => this.move(-1));
  private readonly repeatButton = action('Repeat', () => this.repeat());
  private readonly speech: CareerSpeech;
  private mode: Mode = 'role';
  private matches: Job[] = [];
  private page = 0;
  private shortlistIndex = 0;
  private shortlistId?: string;
  private detailJob?: Job;
  private pageIds = new Map<number, Job>();
  private numbersReady = false;
  private lastSpeech: string[] = [];
  private draft?: { job: Job; values: Partial<Record<DraftField, string>> };
  private draftOpener?: HTMLElement;
  private paused = false;
  private readonly visibility = () => { if (document.hidden) this.stop(); };
  private readonly pageHide = () => this.suspend();

  constructor(private actions: GatewayActions) {
    this.speech = new CareerSpeech(state => {
      this.root.dataset.speechState = state;
      const message = ({ off: 'Microphone off.', starting: 'Waiting for microphone permission…', listening: 'Microphone listening for one response. Use Stop to cancel.', speaking: 'Reading aloud. Microphone off.' })[state];
      if (this.state.textContent !== message) this.state.textContent = message;
    }, message => this.fail(message));
    this.root.className = 'voice-guide';
    this.root.dataset.speechState = 'off';
    this.root.setAttribute('aria-labelledby', 'voice-title');
    const style = element('style', `
      .voice-guide { margin:1.5rem 0; padding:clamp(1rem,3vw,1.5rem); border:2px solid #274c69; border-radius:.85rem; background:#f4f7fb; }
      .voice-guide h3 { font-size:1.4rem; } .voice-guide h4 { font-size:1.15rem; margin:.5rem 0; }
      .voice-guide .voice-state { font-weight:700; } .voice-guide [data-error] { color:#9c1837; }
      .voice-guide form { display:grid; gap:.6rem; margin:1rem 0; }
      .voice-guide ol { padding-left:1.6rem; } .voice-guide li { margin:1.2rem 0; }
      .voice-guide input:not([type=checkbox]),.voice-guide textarea { width:100%; min-width:0; }
      .voice-guide .actions { margin:.75rem 0; } .voice-guide dialog { width:42rem; }
      .voice-guide dialog dd { white-space:pre-wrap; overflow-wrap:anywhere; font-weight:400; }
      .voice-guide dialog dl { display:block; } .voice-guide dialog dt { margin-top:1rem; }
    `);
    const title = element('h3', 'Optional voice navigation'); title.id = 'voice-title';
    const privacy = element('p', 'Microphone use is optional. Your browser’s speech provider may process audio. Access does not record audio or send commands or drafts to analytics. Use fictional information only.');
    privacy.className = 'note';
    const outputLabel = element('label'); outputLabel.className = 'check'; this.output.type = 'checkbox';
    outputLabel.append(this.output, element('span', 'Read prompts and results aloud'));
    const speechHelp = element('p', 'Read aloud is off by default for screen readers. Turn it on for an on-device English voice; this pauses this guide’s live announcements to avoid duplicate speech. Listening is one response per press, never continuous.'); speechHelp.className = 'note';
    this.output.addEventListener('change', () => { this.speech.stop(); this.liveMode(); });
    const controls = element('div'); controls.className = 'actions';
    controls.append(action('Start voice search', () => this.start(true)), action('Use typed search', () => this.start(false)), this.listenButton, action('Stop', () => this.stop()));
    this.state.className = 'voice-state'; this.state.setAttribute('role', 'status'); this.state.setAttribute('aria-atomic', 'true');
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-atomic', 'true');
    this.error.setAttribute('role', 'alert'); this.error.id = 'voice-error'; this.error.dataset.error = '';
    const form = element('form'); form.autocomplete = 'off';
    const label = element('label', 'Role or command'); this.command.type = 'text'; this.command.maxLength = 160;
    this.command.setAttribute('aria-describedby', 'voice-help voice-error'); label.append(this.command);
    const submit = element('button', 'Run typed command'); submit.type = 'submit';
    form.addEventListener('submit', event => { event.preventDefault(); const value = this.command.value; this.command.value = ''; this.run(value); });
    form.append(label, submit);
    const help = element('p', 'Start with a role, or “all jobs”. Then use Next, Previous, Repeat, Details 3, Save 3 and 4, Shortlist, Search followed by a role, or Stop. Buttons do the same things.'); help.id = 'voice-help'; help.className = 'note';
    const navigation = element('div'); navigation.className = 'actions';
    navigation.append(this.previousButton, this.nextButton, this.repeatButton, action('Open shortlist', () => this.openShortlist()), action('Back to results', () => this.backToResults()));
    this.dialog.setAttribute('aria-labelledby', 'draft-title');
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.closeDraft(false); });
    this.root.addEventListener('keydown', event => { if (event.key === 'Escape' && !this.dialog.open) { event.preventDefault(); this.stop(); } });
    this.root.append(style, title, privacy, outputLabel, speechHelp, controls, this.state, this.message, this.error, form, help, navigation, this.content, this.dialog);
    this.listenButton.disabled = !this.speech.microphoneAvailable;
    if (!this.speech.microphoneAvailable) this.state.textContent = 'Speech recognition unavailable. Use typed search and keyboard controls.';
    this.setNavigation();
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('pagehide', this.pageHide);
  }

  private liveMode() {
    for (const region of [this.state, this.message, this.error]) region.setAttribute('aria-live', this.output.checked ? 'off' : region === this.error ? 'assertive' : 'polite');
    this.actions.outputMode(this.output.checked);
  }

  private clearError() { this.error.textContent = ''; this.command.removeAttribute('aria-invalid'); }
  private fail(message: string) {
    this.error.textContent = message;
    this.command.setAttribute('aria-invalid', 'true');
    if (message.startsWith('No on-device') || message.startsWith('Read aloud')) { this.output.checked = false; this.liveMode(); }
    else if (this.output.checked) this.speak([message]);
  }
  private speak(messages: string[], done?: () => void) {
    this.lastSpeech = messages;
    if (this.output.checked && !this.paused && !this.draft) { this.actions.stopRecorded(); this.speech.speak(messages, done); }
    else done?.();
  }
  private listen() {
    if (this.paused || this.draft) return;
    this.clearError(); this.actions.stopRecorded();
    this.speech.listen(text => this.run(text));
  }
  private start(microphone: boolean) {
    if (this.paused) return;
    this.actions.guideActive(false);
    this.speech.stop(); this.clearError(); this.mode = 'role'; this.content.replaceChildren(); this.setNavigation();
    const prompt = 'What role would you like? Say or type a role, or “all jobs” to clear filters and explore every fictional listing.';
    this.message.textContent = prompt; this.command.focus();
    this.speak([prompt], microphone ? () => this.listen() : undefined);
  }
  stop(stopRecording = true) {
    this.speech.stop(); if (stopRecording) this.actions.stopRecorded();
    this.message.textContent = 'Voice navigation stopped. Typed controls still work. Saved jobs stay for this page session.';
  }
  suspend() {
    this.stop();
    if (this.draft) this.closeDraft(false, false);
  }
  setPaused(paused: boolean) { this.paused = paused; if (paused) this.suspend(); }
  destroy() {
    this.suspend(); this.actions.guideActive(false); this.actions.outputMode(false);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('pagehide', this.pageHide);
  }

  resultsWillChange() { this.speech.stop(); this.numbersReady = false; }
  resultsChanged(jobs: Job[]) {
    this.speech.stop(); this.matches = [...jobs]; this.page = 0;
    if (this.draft) return;
    if (this.mode === 'role') return;
    this.mode = 'results'; this.renderResults(false, false);
    this.numbersReady = false;
    this.message.textContent = `${this.matches.length} jobs found. Search or filters changed. Result numbers have been refreshed; use Repeat before a numbered command.`;
    if (this.output.checked) this.speak([this.message.textContent]);
  }
  savedChanged(filteredJobs?: Job[]) {
    const saved = new Set(this.actions.savedJobs().map(job => job.id));
    this.content.querySelectorAll<HTMLButtonElement>('[data-save-id]').forEach(button => button.setAttribute('aria-pressed', String(saved.has(button.dataset.saveId!))));
    if (this.mode === 'shortlist' && !this.draft) {
      this.speech.stop();
      const index = this.actions.savedJobs().findIndex(job => job.id === this.shortlistId);
      if (index >= 0) this.shortlistIndex = index;
      this.renderShortlist(false, false);
    } else if (filteredJobs && this.mode === 'results') this.resultsChanged(filteredJobs);
  }

  private search(query: string) {
    this.actions.guideActive(true);
    this.speech.stop(); this.matches = this.actions.search(query); this.page = 0; this.mode = 'results'; this.renderResults();
  }
  private pageMessage() { return `${this.matches.length} ${this.matches.length === 1 ? 'job' : 'jobs'} found. ${this.matches.length ? `Results ${this.page * 5 + 1} to ${Math.min(this.page * 5 + 5, this.matches.length)}.` : 'No results. Try Search followed by another role, or Search all jobs.'}`; }
  private focusTitle(title: HTMLElement, focus: boolean) { title.tabIndex = -1; if (focus) title.focus(); }
  private renderResults(focus = true, read = true) {
    this.speech.stop(); this.numbersReady = true;
    const title = element('h4', 'Guided search results');
    const list = element('ol'); list.start = this.page * 5 + 1;
    this.pageIds = new Map(this.matches.slice(this.page * 5, this.page * 5 + 5).map((job, index) => [this.page * 5 + index + 1, job]));
    const spoken = [this.pageMessage()];
    for (const [number, job] of this.pageIds) {
      const item = element('li'); item.dataset.jobId = job.id;
      const name = element('h4', job.title);
      const controls = element('div'); controls.className = 'actions';
      const save = action(`Save result ${number} — ${job.title}`, () => this.saveJobs([job])); save.dataset.saveId = job.id;
      save.setAttribute('aria-pressed', String(this.actions.savedJobs().some(saved => saved.id === job.id)));
      controls.append(action(`Details result ${number} — ${job.title}`, () => this.details(job)), save);
      item.append(name, element('p', job.summary), controls); list.append(item);
      spoken.push(`Result ${number}. ${job.title}, at ${job.organization}. ${job.summary}`);
    }
    spoken.push('Use Next, Previous, Repeat, Details with a result number, Save with result numbers, Shortlist, or Stop. Press Listen for a command or use the typed controls.');
    this.message.textContent = this.pageMessage();
    this.content.replaceChildren(title, list); this.setNavigation(); this.focusTitle(title, focus);
    this.lastSpeech = spoken; if (read) this.speak(spoken);
  }
  private saveJobs(jobs: Job[]) {
    this.speech.stop(); this.clearError(); jobs.forEach(job => this.actions.save(job.id)); this.savedChanged();
    const message = `Saved for this session: ${jobs.map(job => job.title).join('; ')}. Use Shortlist to review saved jobs.`;
    this.message.textContent = message; this.speak([message]);
  }
  private details(job: Job) {
    this.speech.stop(); this.clearError(); this.mode = 'details'; this.detailJob = job;
    const title = element('h4', `Details — ${job.title}`);
    const tasks = element('ul'); job.responsibilities.forEach(task => tasks.append(element('li', task)));
    const save = action(`Save this job — ${job.title}`, () => this.saveJobs([job])); save.dataset.saveId = job.id;
    save.setAttribute('aria-pressed', String(this.actions.savedJobs().some(saved => saved.id === job.id)));
    this.content.replaceChildren(title, element('p', job.summary), element('h4', 'Responsibilities'), tasks, element('p', `Support: ${job.support.join(', ')}.`), save);
    this.message.textContent = `Details for ${job.title}. Use Save, Back to results, or Shortlist.`;
    this.setNavigation(); this.focusTitle(title, true);
    this.speak([this.message.textContent, job.summary, ...job.responsibilities, `Support: ${job.support.join(', ')}.`]);
  }
  private backToResults() { this.actions.guideActive(true); this.clearError(); this.matches = this.actions.showResults(); this.page = Math.min(this.page, Math.max(0, Math.ceil(this.matches.length / 5) - 1)); this.mode = 'results'; this.renderResults(); }
  private move(direction: number) {
    this.speech.stop(); this.clearError();
    if (this.mode === 'shortlist') {
      const next = this.shortlistIndex + direction;
      if (next < 0 || next >= this.actions.savedJobs().length) { this.fail('There are no more jobs in that direction.'); return; }
      this.shortlistIndex = next; this.renderShortlist();
    } else if (this.mode === 'results') {
      const next = this.page + direction;
      if (next < 0 || next * 5 >= this.matches.length) { this.fail('There are no more results in that direction.'); return; }
      this.page = next; this.renderResults();
    } else this.fail('Open search results or the shortlist before using Next or Previous.');
  }
  private repeat() {
    this.clearError();
    if (this.mode === 'results') this.renderResults();
    else if (this.mode === 'shortlist') this.renderShortlist();
    else { this.message.textContent = this.lastSpeech[0] || 'Start a search to hear results.'; this.speak(this.lastSpeech); }
  }
  private setNavigation() {
    const shortlist = this.mode === 'shortlist';
    const index = shortlist ? this.shortlistIndex : this.page;
    const pages = shortlist ? this.actions.savedJobs().length : Math.ceil(this.matches.length / 5);
    this.nextButton.disabled = !['results', 'shortlist'].includes(this.mode) || index + 1 >= pages;
    this.previousButton.disabled = !['results', 'shortlist'].includes(this.mode) || index === 0;
    this.repeatButton.disabled = !this.lastSpeech.length && this.mode === 'role';
  }
  private openShortlist() {
    this.actions.guideActive(true);
    this.speech.stop(); this.clearError(); this.actions.showSaved(); this.mode = 'shortlist'; this.shortlistIndex = 0; this.renderShortlist();
  }
  private renderShortlist(focus = true, read = true) {
    const jobs = this.actions.savedJobs(); this.shortlistIndex = Math.min(this.shortlistIndex, Math.max(0, jobs.length - 1));
    const job = jobs[this.shortlistIndex];
    this.shortlistId = job?.id;
    const title = element('h4', job ? `Shortlist ${this.shortlistIndex + 1} of ${jobs.length} — ${job.title}` : 'Your shortlist is empty');
    this.content.replaceChildren(title); this.setNavigation(); this.focusTitle(title, focus);
    const message = job ? `${title.textContent}. ${job.summary} Use Next or Previous to review one job at a time, or Prepare draft. Nothing will be submitted.` : 'No jobs saved yet. Go back to results and save a job by its number.';
    if (job) {
      const prepare = action('Prepare fictional draft', () => this.openDraft(job, prepare));
      const tasks = element('ul'); job.responsibilities.forEach(task => tasks.append(element('li', task)));
      this.content.append(element('p', job.summary), element('h4', 'Responsibilities'), tasks, prepare);
    }
    this.message.textContent = message; this.lastSpeech = [message]; if (read) this.speak([message]);
  }

  private run(value: string) {
    if (this.paused || this.draft) return;
    this.speech.stop(); this.clearError();
    const text = value.trim().toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
    if (!text || text.length > 160) { this.fail('Enter one role or command, up to 160 characters.'); return; }
    if (['stop', 'cancel'].includes(text)) { this.stop(); return; }
    if (['shortlist', 'open shortlist', 'saved jobs'].includes(text)) { this.openShortlist(); return; }
    if (text === 'new search') { this.start(false); return; }
    if (text.startsWith('search ') || this.mode === 'role') {
      const query = text.replace(/^search (?:for )?/, ''); this.search(query === 'all jobs' ? '' : query); return;
    }
    if (text === 'next') { this.move(1); return; }
    if (text === 'previous') { this.move(-1); return; }
    if (text === 'repeat') { this.repeat(); return; }
    if (['back', 'back to results', 'results'].includes(text)) { this.backToResults(); return; }
    if (['prepare draft', 'prepare fictional draft', 'draft'].includes(text) && this.mode === 'shortlist') {
      const job = this.actions.savedJobs()[this.shortlistIndex];
      if (job) this.openDraft(job, this.command); else this.fail('Save a job before preparing a draft.');
      return;
    }
    if (text === 'save' && this.mode === 'details' && this.detailJob) { this.saveJobs([this.detailJob]); return; }
    const numbered = /^(save|details)(?: (?:jobs?|results?))? (.+)$/.exec(text);
    if (numbered && this.mode === 'results') {
      if (!this.numbersReady) { this.fail('The search changed. Use Repeat to review the new numbers before saving or opening a numbered result.'); return; }
      const tokens = numbered[2].split(/\s+and\s+|\s*,\s*/);
      const selected = tokens.map(token => /^\d+$/.test(token) ? Number(token) : numbers.indexOf(token));
      if (selected.length > 5 || (numbered[1] === 'details' && selected.length !== 1) || selected.some(number => !this.pageIds.has(number))) {
        this.fail('Use only the numbers on the current page, for example “save 3 and 4”. Nothing was changed.'); return;
      }
      const jobs = [...new Set(selected)].map(number => this.pageIds.get(number)!);
      if (numbered[1] === 'save') this.saveJobs(jobs); else this.details(jobs[0]);
      return;
    }
    this.fail('That command is ambiguous or unavailable here. Nothing was changed. Use the buttons, or say a command with a current result number.');
  }

  private openDraft(job: Job, opener: HTMLElement) {
    this.speech.stop(); this.actions.stopRecorded(); this.clearError();
    this.draft = { job, values: {} }; this.draftOpener = opener;
    this.draftField(0); this.dialog.showModal(); this.dialog.querySelector<HTMLElement>('input,textarea')?.focus();
  }
  private draftHeader() {
    const title = element('h3', 'Fictional application draft'); title.id = 'draft-title';
    this.dialog.replaceChildren(title, element('p', `For ${this.draft!.job.title} at ${this.draft!.job.organization}.`),
      element('p', 'Practice only — nothing is submitted. Use fictional information. Fields remain in memory until you close or cancel. The microphone and app speech stay off during drafts; type or use your screen reader.'),
      action('Cancel draft', () => this.closeDraft(false)));
  }
  private draftField(index: number, editing = false) {
    if (!this.draft) return;
    this.draftHeader();
    const field = fields[index]; const form = element('form'); form.autocomplete = 'off'; form.noValidate = true;
    const question = element('p', field.question);
    const label = element('label', `${field.label} (${field.required ? 'required' : 'optional'})`);
    const input = index === 0 ? element('input') : element('textarea'); input.maxLength = field.limit; input.required = field.required;
    input.value = this.draft.values[field.key] || ''; input.setAttribute('aria-describedby', 'draft-field-error'); label.append(input);
    const error = element('p'); error.id = 'draft-field-error'; error.setAttribute('role', 'alert'); error.dataset.error = '';
    const next = element('button', editing ? 'Update draft' : index === fields.length - 1 ? 'Review draft' : 'Next field'); next.type = 'submit';
    form.addEventListener('submit', event => {
      event.preventDefault(); const value = input.value.trim();
      if ((field.required && !value) || value.length > field.limit) {
        error.textContent = `Enter ${field.label.toLowerCase()}${field.required ? '' : ' or skip this field'}, up to ${field.limit} characters.`;
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      this.draft!.values[field.key] = value;
      if (editing || index === fields.length - 1) this.reviewDraft(); else this.draftField(index + 1);
    });
    form.append(question, label, error, next);
    if (!field.required) form.append(action('Skip optional experience', () => { this.draft!.values.experience = ''; this.reviewDraft(); }));
    this.dialog.append(form); input.focus();
  }
  private reviewDraft() {
    if (!this.draft) return;
    this.draftHeader();
    const heading = element('h4', 'Review your draft'); heading.tabIndex = -1;
    const data = element('dl');
    fields.forEach((field, index) => {
      const value = element('dd');
      value.append(element('p', this.draft!.values[field.key] || 'Not provided'), action(`Edit ${field.label.toLowerCase()}`, () => this.draftField(index, true)));
      data.append(element('dt', field.label), value);
    });
    this.dialog.append(heading, data, element('p', 'This is the end of the public demo. No employer submission, eligibility decision, or hiring incentive is offered.'), action('Close and discard draft', () => this.closeDraft(true)));
    heading.focus();
  }
  private closeDraft(reviewed: boolean, restoreFocus = true) {
    this.draft = undefined; this.dialog.close(); this.dialog.replaceChildren();
    this.message.textContent = reviewed ? 'Draft review finished. The draft was discarded; nothing was submitted.' : 'Draft cancelled and discarded. Nothing was submitted.';
    if (restoreFocus) (this.draftOpener?.isConnected ? this.draftOpener : this.command).focus();
    this.draftOpener = undefined;
  }
}
