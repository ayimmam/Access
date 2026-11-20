import type { Job } from './career-element';
import { CareerSpeech, type SpeechState } from './career-speech';
import { AddisCareerSpeech } from './career-addis-speech';
import { amharicCommand, emptyResults, loadAmharicCatalog, resultHelp, rolePrompt, unconfiguredSpeech, welcomePrompt, type AmharicCatalog, type SpeechPrompt } from './career-amharic';

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
  private readonly startButton = action('Start voice search', () => this.start(true));
  private readonly listenButton = action('Listen for a command', () => this.listen());
  private readonly nextButton = action('Next', () => this.move(1));
  private readonly previousButton = action('Previous', () => this.move(-1));
  private readonly repeatButton = action('Repeat', () => this.repeat());
  private readonly finishButton = action('Use recording', () => {
    if (this.speech instanceof AddisCareerSpeech) { this.speech.finishRecording(); this.command.focus(); }
  });
  private readonly languageSelect = element('select');
  private readonly player = element('audio');
  private readonly providerStatus = element('p');
  private readonly privacy = element('p');
  private readonly speechHelp = element('p');
  private readonly help = element('p');
  private speech: CareerSpeech | AddisCareerSpeech;
  private language: 'en' | 'am' = 'en';
  private catalog?: AmharicCatalog;
  private languageController?: AbortController;
  private lastPrompt?: SpeechPrompt;
  private mode: Mode = 'role';
  private matches: Job[] = [];
  private page = 0;
  private shortlistIndex = 0;
  private shortlistId?: string;
  private detailJob?: Job;
  private pageIds = new Map<number, Job>();
  private numbersReady = false;
  private lastSpeech: string[] = [];
  private handsFree = false;
  private launchGeneration = 0;
  private voiceOffered = false;
  private draft?: { job: Job; values: Partial<Record<DraftField, string>> };
  private draftOpener?: HTMLElement;
  private paused = false;
  private readonly visibility = () => { if (document.hidden) this.stop(); };
  private readonly pageHide = () => this.suspend();

  constructor(private actions: GatewayActions, private base: URL, private autoStart = false) {
    this.speech = new CareerSpeech(state => this.speechState(state), message => this.speechFailed(message));
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
    const privacy = this.privacy; privacy.textContent = 'Microphone use is optional. Your browser’s speech provider may process audio. Access does not record audio or send commands or drafts to analytics. Use fictional information only.';
    privacy.className = 'note';
    const outputLabel = element('label'); outputLabel.className = 'check'; this.output.type = 'checkbox';
    this.output.checked = this.autoStart;
    outputLabel.append(this.output, element('span', 'Read prompts and results aloud'));
    const speechHelp = this.speechHelp; speechHelp.textContent = 'On hosts with automatic voice startup, English read-aloud is on when the page loads. Turn it off or choose Use typed search for screen-reader announcements. Your browser may process fictional prompt text. After each spoken response, the microphone listens for one command, then switches off while the guide speaks. First-time microphone access still needs Start voice search and browser permission. Stop, errors or hiding the guide end listening. If playback is blocked, turn read-aloud back on and choose Start voice search, or use typed search.'; speechHelp.className = 'note';
    this.output.addEventListener('change', () => { this.launchGeneration++; this.handsFree = false; this.speech.stop(); this.liveMode(); });
    const controls = element('div'); controls.className = 'actions';
    controls.append(this.startButton, action('Use typed search', () => this.start(false)), this.listenButton, this.finishButton, action('Stop', () => this.stop()));
    this.finishButton.hidden = true;
    const languageLabel = element('label');
    const englishLabel = element('span', 'Voice language / '); englishLabel.lang = 'en';
    const amharicLabel = element('span', 'የድምፅ ቋንቋ'); amharicLabel.lang = 'am';
    const languageText = element('span'); languageText.append(englishLabel, amharicLabel);
    for (const [value, label] of [['en', 'English'], ['am', 'አማርኛ']]) {
      const option = element('option', label); option.value = value; option.lang = value; this.languageSelect.append(option);
    }
    languageLabel.append(languageText, this.languageSelect);
    this.languageSelect.addEventListener('change', () => void this.changeLanguage());
    this.providerStatus.className = 'note'; this.providerStatus.setAttribute('role', 'status'); this.providerStatus.hidden = true;
    this.player.controls = true; this.player.preload = 'none'; this.player.hidden = true;
    this.player.setAttribute('aria-label', 'የአማርኛ ድምፅ ማጫወቻ'); this.player.lang = 'am';
    this.state.className = 'voice-state'; this.state.setAttribute('role', 'status'); this.state.setAttribute('aria-atomic', 'true');
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-atomic', 'true');
    this.error.setAttribute('role', 'alert'); this.error.id = 'voice-error'; this.error.dataset.error = '';
    const form = element('form'); form.autocomplete = 'off';
    const label = element('label'); const commandLabel = element('span', 'Role or command'); label.append(commandLabel); this.command.type = 'text'; this.command.maxLength = 160;
    this.command.setAttribute('aria-describedby', 'voice-help voice-error'); label.append(this.command);
    this.command.addEventListener('input', () => { this.launchGeneration++; this.handsFree = false; this.speech.stop(); });
    const submit = element('button', 'Run typed command'); submit.type = 'submit';
    form.addEventListener('submit', event => { event.preventDefault(); const value = this.command.value; this.command.value = ''; this.run(value); });
    form.append(label, submit);
    const help = this.help; help.textContent = 'Start with a role, or “all jobs”. Then use Next, Previous, Repeat, Details 3, Save 3 and 4, Shortlist, Search followed by a role, or Stop. Buttons do the same things.'; help.id = 'voice-help'; help.className = 'note';
    const navigation = element('div'); navigation.className = 'actions';
    navigation.append(this.previousButton, this.nextButton, this.repeatButton, action('Open shortlist', () => this.openShortlist()), action('Back to results', () => this.backToResults()));
    this.dialog.setAttribute('aria-labelledby', 'draft-title');
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.closeDraft(false); });
    this.root.addEventListener('keydown', event => { if (event.key === 'Escape' && !this.dialog.open) { event.preventDefault(); this.stop(); } });
    for (const node of [title, outputLabel.lastElementChild as HTMLElement, commandLabel, submit, ...controls.querySelectorAll('button'), ...navigation.querySelectorAll('button')]) node.dataset.voiceLabel = node.textContent || '';
    for (const node of [privacy, speechHelp, help]) node.dataset.english = node.textContent || '';
    this.root.lang = 'en';
    this.root.append(style, title, languageLabel, privacy, this.providerStatus, outputLabel, speechHelp, controls, this.player, this.state, this.message, this.error, form, help, navigation, this.content, this.dialog);
    this.liveMode();
    this.listenButton.disabled = !this.speech.microphoneAvailable;
    if (!this.speech.microphoneAvailable) this.state.textContent = 'Speech recognition unavailable. Use typed search and keyboard controls.';
    this.setNavigation();
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('pagehide', this.pageHide);
    if (this.autoStart) queueMicrotask(() => void this.offerVoiceStart());
  }

  private text(key: string, values: Record<string, string | number> = {}) {
    const template = this.language === 'am' ? this.catalog?.ui[key] || key : key;
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name] ?? ''));
  }
  private job(job: Job): Job { return this.language === 'am' && this.catalog?.jobs[job.id] ? { ...job, ...this.catalog.jobs[job.id] } : job; }
  private speechState(state: SpeechState) {
    this.root.dataset.speechState = state;
    const message = this.text(({ off: 'Microphone off.', starting: 'Waiting for microphone permission…', listening: 'Microphone listening for one response. Use Stop to cancel.', speaking: 'Reading aloud. Microphone off.', transcribing: 'Transcribing. Microphone off.', preparing: 'Preparing audio. Microphone off.' })[state]);
    if (this.state.textContent !== message) this.state.textContent = message;
    this.finishButton.hidden = !(this.speech instanceof AddisCareerSpeech) || state !== 'listening';
  }
  private async changeLanguage() {
    this.launchGeneration++; this.handsFree = false; this.languageController?.abort(); this.speech.stop(); this.clearError();
    const selected = this.languageSelect.value === 'am' ? 'am' : 'en';
    const controller = new AbortController(); this.languageController = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
    this.root.setAttribute('aria-busy', 'true');
    try {
      if (selected === 'am') this.catalog = await loadAmharicCatalog(this.base, controller.signal);
      if (controller.signal.aborted || this.paused) return;
      this.speech.stop();
      this.language = selected; this.root.lang = selected;
      this.liveMode();
      const browserSpeech = new CareerSpeech(state => this.speechState(state), message => this.speechFailed(message),
        selected === 'am' ? 'am-ET' : 'en-US');
      const browserAmharic = selected === 'am' && !this.catalog!.speech_enabled && browserSpeech.microphoneAvailable;
      this.speech = selected === 'am' && !browserAmharic
        ? new AddisCareerSpeech(this.base, this.catalog!.speech_enabled, this.player, state => this.speechState(state), message => this.speechFailed(message))
        : browserSpeech;
      this.root.querySelectorAll<HTMLElement>('[data-voice-label]').forEach(node => { node.textContent = this.text(node.dataset.voiceLabel!); });
      this.privacy.textContent = selected === 'am' ? this.catalog!.privacy : this.privacy.dataset.english!;
      this.help.textContent = selected === 'am' ? this.catalog!.help : this.help.dataset.english!;
      this.speechHelp.textContent = selected === 'am' ? this.catalog!.speech_help : this.speechHelp.dataset.english!;
      this.providerStatus.hidden = selected !== 'am';
      this.providerStatus.textContent = selected === 'am' ? this.text(this.catalog!.speech_enabled ? 'Amharic voice uses Addis AI. Record one command, then review its text before running it.' : unconfiguredSpeech) : '';
      if (browserAmharic) {
        this.privacy.textContent = 'ድምፅዎን ለመለየት አሳሹ ቀረጻውን ወደ ድምፅ አገልግሎቱ ሊልክ ይችላል። የግል መረጃ አይናገሩ።';
        this.providerStatus.textContent = 'የአሳሹ የአማርኛ ድምፅ ፍለጋ';
        this.speechHelp.textContent = 'በድምፅ ፍለጋ ጀምር ይጫኑ፣ የሥራውን ስም ይናገሩ፣ ከዚያ ጽሑፉን ያረጋግጡ።';
      }
      this.listenButton.disabled = !this.speech.microphoneAvailable;
      this.mode = 'role'; this.lastSpeech = []; this.lastPrompt = undefined; this.numbersReady = false;
      this.content.replaceChildren(); this.command.value = ''; this.setNavigation(); this.actions.guideActive(false);
      this.message.textContent = this.text('Choose Start voice search or Use typed search.'); this.speechState('off');
    } catch {
      if (this.languageController === controller && !this.paused) {
        this.languageSelect.value = this.language;
        this.speechFailed('Amharic text could not load. Keep using English, or choose Amharic again to retry.');
      }
    } finally {
      clearTimeout(timer);
      if (this.languageController === controller) { this.root.removeAttribute('aria-busy'); this.languageController = undefined; }
    }
  }

  private async offerVoiceStart() {
    if (this.voiceOffered || this.paused || document.hidden || !this.root.isConnected) return;
    this.voiceOffered = true;
    const generation = this.launchGeneration;
    this.message.textContent = `${this.text(welcomePrompt)} ${this.text('Choose Start voice search or Use typed search.')}`;
    if (document.activeElement === document.body) this.startButton.focus();
    let permission: PermissionState | undefined;
    try { permission = (await navigator.permissions.query({ name: 'microphone' as PermissionName })).state; } catch {}
    if (generation !== this.launchGeneration || this.paused || document.hidden || !this.root.isConnected || !this.output.checked) return;
    this.handsFree = permission === 'granted' && this.speech.microphoneAvailable;
    const messages = [this.text(welcomePrompt), this.text(rolePrompt)];
    this.message.textContent = messages.join(' ');
    this.speak(messages, undefined, { kind: 'welcome' });
  }

  private liveMode() {
    for (const region of [this.state, this.message, this.error]) region.setAttribute('aria-live', this.output.checked ? 'off' : region === this.error ? 'assertive' : 'polite');
    this.actions.outputMode(this.output.checked);
  }

  private clearError() { this.error.textContent = ''; this.command.removeAttribute('aria-invalid'); }
  private speechFailed(message: string) {
    this.handsFree = false;
    this.output.checked = false; this.liveMode();
    this.error.textContent = this.text(message);
  }
  private fail(message: string) {
    this.handsFree = false;
    if (this.language === 'am') { this.output.checked = false; this.liveMode(); }
    this.error.textContent = this.text(message);
    this.command.setAttribute('aria-invalid', 'true');
    if (this.output.checked && this.language === 'en') this.speak([message]);
  }
  private speak(messages: string[], done?: () => void, prompt = this.lastPrompt) {
    this.lastSpeech = messages; this.lastPrompt = prompt;
    this.setNavigation();
    const completed = done || (this.handsFree ? () => this.listen() : undefined);
    if (this.output.checked && !this.paused && !this.draft) {
      this.actions.stopRecorded();
      if (this.speech instanceof AddisCareerSpeech) { if (prompt) this.speech.speak(prompt, completed); }
      else this.speech.speak(messages, completed);
    }
    else completed?.();
  }
  private listen() {
    if (this.paused || document.hidden || !this.root.isConnected || this.draft || this.languageController) return;
    this.launchGeneration++;
    this.handsFree = this.output.checked && this.language === 'en';
    this.clearError(); this.actions.stopRecorded();
    this.speech.listen(text => {
      if (this.language === 'am') {
        this.command.value = text;
        this.message.textContent = this.text('Heard: {command}. Review or edit it, then choose Run typed command. Nothing has changed yet.', { command: text });
        this.command.focus();
      } else this.run(text);
    });
  }
  private start(microphone: boolean) {
    if (this.paused || this.draft || this.languageController) return;
    this.launchGeneration++;
    if (!microphone) { this.output.checked = false; this.liveMode(); }
    this.handsFree = microphone && this.output.checked && this.language === 'en';
    this.actions.guideActive(false);
    this.speech.stop(); this.clearError(); this.mode = 'role'; this.content.replaceChildren(); this.setNavigation();
    const prompt = this.text(rolePrompt);
    const messages = this.handsFree ? [this.text(welcomePrompt), prompt] : [prompt];
    this.message.textContent = messages.join(' '); this.command.focus();
    if (microphone && this.speech instanceof CareerSpeech) {
      this.lastSpeech = messages; this.lastPrompt = { kind: 'role' };
      this.listen();
      return;
    }
    this.speak(messages, microphone ? () => this.listen() : undefined, { kind: 'role' });
  }
  stop(stopRecording = true) {
    this.launchGeneration++;
    this.handsFree = false;
    this.speech.stop(); if (stopRecording) this.actions.stopRecorded();
    this.command.value = '';
    this.message.textContent = this.text('Voice navigation stopped. Typed controls still work. Saved jobs stay for this page session.');
  }
  suspend() {
    this.stop();
    if (this.draft) this.closeDraft(false, false);
  }
  setPaused(paused: boolean) {
    const becameVisible = this.paused && !paused;
    this.paused = paused;
    if (paused) { this.languageSelect.value = this.language; this.languageController?.abort(); this.suspend(); }
    else if (becameVisible && this.autoStart && !this.voiceOffered) queueMicrotask(() => void this.offerVoiceStart());
  }
  destroy() {
    this.languageController?.abort(); this.suspend(); this.actions.guideActive(false); this.actions.outputMode(false);
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
    this.message.textContent = this.text('{count} jobs found. Search or filters changed. Result numbers have been refreshed; use Repeat before a numbered command.', { count: this.matches.length });
    if (this.output.checked) this.speak([this.message.textContent], undefined, { kind: 'changed', total: this.matches.length });
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
  private pageMessage() {
    if (this.language === 'am') return this.matches.length ? this.text('{count} jobs found. Results {first} to {last}.', { count: this.matches.length, first: this.page * 5 + 1, last: Math.min(this.page * 5 + 5, this.matches.length) }) : this.text(emptyResults);
    return `${this.matches.length} ${this.matches.length === 1 ? 'job' : 'jobs'} found. ${this.matches.length ? `Results ${this.page * 5 + 1} to ${Math.min(this.page * 5 + 5, this.matches.length)}.` : 'No results. Try Search followed by another role, or Search all jobs.'}`;
  }
  private focusTitle(title: HTMLElement, focus: boolean) { title.tabIndex = -1; if (focus) title.focus(); }
  private renderResults(focus = true, read = true) {
    this.speech.stop(); this.numbersReady = true;
    const title = element('h4', this.text('Guided search results'));
    const list = element('ol'); list.start = this.page * 5 + 1;
    this.pageIds = new Map(this.matches.slice(this.page * 5, this.page * 5 + 5).map((job, index) => [this.page * 5 + index + 1, job]));
    const spoken = [this.pageMessage()];
    for (const [number, job] of this.pageIds) {
      const copy = this.job(job);
      const item = element('li'); item.dataset.jobId = job.id;
      const name = element('h4', copy.title);
      const controls = element('div'); controls.className = 'actions';
      const save = action(this.text('Save result {number} — {title}', { number, title: copy.title }), () => this.saveJobs([job])); save.dataset.saveId = job.id;
      save.setAttribute('aria-pressed', String(this.actions.savedJobs().some(saved => saved.id === job.id)));
      controls.append(action(this.text('Details result {number} — {title}', { number, title: copy.title }), () => this.details(job)), save);
      item.append(name, element('p', copy.summary), controls); list.append(item);
      spoken.push(this.text('Result {number}. {title}, at {organization}. {summary}', { number, title: copy.title, organization: copy.organization, summary: copy.summary }));
    }
    spoken.push(this.text(resultHelp));
    this.message.textContent = this.pageMessage();
    this.content.replaceChildren(title, list); this.setNavigation(); this.focusTitle(title, focus);
    this.lastSpeech = spoken; this.lastPrompt = { kind: 'results', job_ids: [...this.pageIds.values()].map(job => job.id), total: this.matches.length, start: this.page * 5 + 1 };
    if (read) this.speak(spoken);
  }
  private saveJobs(jobs: Job[]) {
    this.speech.stop(); this.clearError(); jobs.forEach(job => this.actions.save(job.id)); this.savedChanged();
    const message = this.text('Saved for this session: {titles}. Use Shortlist to review saved jobs.', { titles: jobs.map(job => this.job(job).title).join(this.language === 'am' ? '፤ ' : '; ') });
    this.message.textContent = message; this.speak([message], undefined, { kind: 'saved', job_ids: jobs.map(job => job.id) });
  }
  private details(job: Job) {
    this.speech.stop(); this.clearError(); this.mode = 'details'; this.detailJob = job;
    const copy = this.job(job);
    const title = element('h4', this.text('Details — {title}', { title: copy.title }));
    const tasks = element('ul'); copy.responsibilities.forEach(task => tasks.append(element('li', task)));
    const save = action(this.text('Save this job — {title}', { title: copy.title }), () => this.saveJobs([job])); save.dataset.saveId = job.id;
    save.setAttribute('aria-pressed', String(this.actions.savedJobs().some(saved => saved.id === job.id)));
    const support = this.text('Support: {support}.', { support: copy.support.join(this.language === 'am' ? '፣ ' : ', ') });
    this.content.replaceChildren(title, element('p', copy.summary), element('h4', this.text('Responsibilities')), tasks, element('p', support), save);
    this.message.textContent = this.text('Details for {title}. Use Save, Back to results, or Shortlist.', { title: copy.title });
    this.setNavigation(); this.focusTitle(title, true);
    this.speak([this.message.textContent, copy.summary, ...copy.responsibilities, support], undefined, { kind: 'details', job_ids: [job.id] });
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
    else { this.message.textContent = this.lastSpeech[0] || this.text('Start a search to hear results.'); this.speak(this.lastSpeech); }
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
    const job = jobs[this.shortlistIndex]; const copy = job && this.job(job);
    this.shortlistId = job?.id;
    const title = element('h4', copy ? this.text('Shortlist {position} of {count} — {title}', { position: this.shortlistIndex + 1, count: jobs.length, title: copy.title }) : this.text('Your shortlist is empty'));
    this.content.replaceChildren(title); this.setNavigation(); this.focusTitle(title, focus);
    const message = copy ? this.text('{heading}. {summary} Use Next or Previous to review one job at a time, or Prepare draft. Nothing will be submitted.', { heading: title.textContent!, summary: copy.summary }) : this.text('No jobs saved yet. Go back to results and save a job by its number.');
    if (job && copy) {
      const prepare = action(this.text('Prepare fictional draft'), () => this.openDraft(job, prepare));
      const tasks = element('ul'); copy.responsibilities.forEach(task => tasks.append(element('li', task)));
      this.content.append(element('p', copy.summary), element('h4', this.text('Responsibilities')), tasks, prepare);
    }
    this.message.textContent = message; this.lastSpeech = [message];
    this.lastPrompt = { kind: 'shortlist', job_ids: job ? [job.id] : [], total: jobs.length, start: this.shortlistIndex + 1 };
    if (read) this.speak([message]);
  }

  private run(value: string) {
    if (this.paused || this.draft || this.languageController) return;
    this.speech.stop(); this.clearError();
    const text = this.language === 'am' ? amharicCommand(value) : value.trim().toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
    if (!text || value.length > 160) { this.fail('Enter one role or command, up to 160 characters.'); return; }
    const language = ['amharic', 'switch to amharic', 'speak amharic', 'language amharic'].includes(text) ? 'am'
      : ['english', 'switch to english', 'speak english', 'language english'].includes(text) ? 'en' : undefined;
    if (language) {
      if (language === this.language) { this.start(this.handsFree); return; }
      this.languageSelect.value = language; void this.changeLanguage(); return;
    }
    if (['stop', 'cancel'].includes(text)) { this.stop(); return; }
    if (['shortlist', 'open shortlist', 'saved jobs'].includes(text)) { this.openShortlist(); return; }
    if (text === 'new search') { this.start(this.handsFree); return; }
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
    if (this.paused || this.languageController) return;
    this.launchGeneration++; this.handsFree = false;
    this.speech.stop(); this.actions.stopRecorded(); this.clearError();
    this.draft = { job, values: {} }; this.draftOpener = opener;
    this.draftField(0); this.dialog.showModal(); this.dialog.querySelector<HTMLElement>('input,textarea')?.focus();
  }
  private draftHeader() {
    const job = this.job(this.draft!.job);
    const title = element('h3', this.text('Fictional application draft')); title.id = 'draft-title';
    this.dialog.replaceChildren(title, element('p', this.text('For {title} at {organization}.', { title: job.title, organization: job.organization })),
      element('p', this.text('Practice only — nothing is submitted. Use fictional information. Fields remain in memory until you close or cancel. The microphone and app speech stay off during drafts; type or use your screen reader.')),
      action(this.text('Cancel draft'), () => this.closeDraft(false)));
  }
  private draftField(index: number, editing = false) {
    if (!this.draft) return;
    this.draftHeader();
    const field = fields[index]; const form = element('form'); form.autocomplete = 'off'; form.noValidate = true;
    const question = element('p', this.text(field.question));
    const label = element('label', `${this.text(field.label)} (${this.text(field.required ? 'required' : 'optional')})`);
    const input = index === 0 ? element('input') : element('textarea'); input.maxLength = field.limit; input.required = field.required;
    input.value = this.draft.values[field.key] || ''; input.setAttribute('aria-describedby', 'draft-field-error'); label.append(input);
    const error = element('p'); error.id = 'draft-field-error'; error.setAttribute('role', 'alert'); error.dataset.error = '';
    const next = element('button', this.text(editing ? 'Update draft' : index === fields.length - 1 ? 'Review draft' : 'Next field')); next.type = 'submit';
    form.addEventListener('submit', event => {
      event.preventDefault(); const value = input.value.trim();
      if ((field.required && !value) || value.length > field.limit) {
        error.textContent = this.language === 'am' ? this.text('Enter {field}, up to {limit} characters, or skip if optional.', { field: this.text(field.label), limit: field.limit }) : `Enter ${field.label.toLowerCase()}${field.required ? '' : ' or skip this field'}, up to ${field.limit} characters.`;
        input.setAttribute('aria-invalid', 'true'); input.focus(); return;
      }
      this.draft!.values[field.key] = value;
      if (editing || index === fields.length - 1) this.reviewDraft(); else this.draftField(index + 1);
    });
    form.append(question, label, error, next);
    if (!field.required) form.append(action(this.text('Skip optional experience'), () => { this.draft!.values.experience = ''; this.reviewDraft(); }));
    this.dialog.append(form); input.focus();
  }
  private reviewDraft() {
    if (!this.draft) return;
    this.draftHeader();
    const heading = element('h4', this.text('Review your draft')); heading.tabIndex = -1;
    const data = element('dl');
    fields.forEach((field, index) => {
      const value = element('dd');
      value.append(element('p', this.draft!.values[field.key] || this.text('Not provided')), action(this.text('Edit {field}', { field: this.text(field.label).toLowerCase() }), () => this.draftField(index, true)));
      data.append(element('dt', this.text(field.label)), value);
    });
    this.dialog.append(heading, data, element('p', this.text('This is the end of the public demo. No employer submission, eligibility decision, or hiring incentive is offered.')), action(this.text('Close and discard draft'), () => this.closeDraft(true)));
    heading.focus();
  }
  private closeDraft(reviewed: boolean, restoreFocus = true) {
    this.draft = undefined; this.dialog.close(); this.dialog.replaceChildren();
    this.message.textContent = this.text(reviewed ? 'Draft review finished. The draft was discarded; nothing was submitted.' : 'Draft cancelled and discarded. Nothing was submitted.');
    if (restoreFocus) (this.draftOpener?.isConnected ? this.draftOpener : this.command).focus();
    this.draftOpener = undefined;
  }
}
