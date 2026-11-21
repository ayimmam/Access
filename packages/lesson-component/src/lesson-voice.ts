import { loadAmharicCatalog, type AmharicCatalog } from './career-amharic';
import { normalizeSpeechText, type SpeechState } from './career-speech';
import { speechStatus, VoiceSession, type VoiceLanguage } from './voice-session';

const help = 'Say or type Play video, Pause video, English captions, Amharic captions, Captions off, Open transcript, Offline formats, Open Career Gateway, or Stop.';
const providerPrivacy = 'Read command help aloud sends fixed lesson instructions to Addis AI. Listen for a command starts one recording of up to 15 seconds for Addis AI transcription. Review the transcript before running it. Keep personal information in the private reflection field.';
const commands = {
  'play video': 'play', play: 'play', 'ቪዲዮውን አጫውት': 'play',
  'pause video': 'pause', pause: 'pause', 'ቪዲዮውን ለአፍታ አቁም': 'pause',
  'english captions': 'en', 'የእንግሊዝኛ መግለጫ': 'en',
  'amharic captions': 'am', 'የአማርኛ መግለጫ': 'am',
  'captions off': 'off', 'መግለጫዎችን አጥፋ': 'off',
  'open transcript': 'transcript', transcript: 'transcript', 'ግልባጩን ክፈት': 'transcript',
  'offline formats': 'offline', 'ከመስመር ውጭ ቅርጸቶች': 'offline',
  'open career gateway': 'career', 'career gateway': 'career', 'የሥራ መግቢያውን ክፈት': 'career',
  stop: 'stop', 'አቁም': 'stop',
} as const;

function commandKey(value: string) {
  const text = normalizeSpeechText(value).replace(/^(?:please|እባክህ|እባክዎ) /, '');
  return Object.hasOwn(commands, text) ? commands[text as keyof typeof commands] : `unknown: ${text}`;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export class LessonVoice {
  readonly root = element('section');
  private readonly session: VoiceSession;
  private readonly language = element('select');
  private readonly output = element('input');
  private readonly command = element('input');
  private readonly status = element('p');
  private readonly message = element('p');
  private readonly error = element('p');
  private readonly privacy = element('p');
  private readonly player = element('audio');
  private readonly listenButton: HTMLButtonElement;
  private readonly readButton: HTMLButtonElement;
  private readonly sendButton: HTMLButtonElement;
  private readonly labels = new Map<HTMLElement, string>();
  private readonly cleanup = new AbortController();
  private catalogRequest?: AbortController;
  private catalog?: AmharicCatalog;
  private locale: VoiceLanguage = 'en';
  private paused = true;

  constructor(private base: URL, private controls: {
    video: HTMLVideoElement;
    setCaptions(language: 'en' | 'am' | 'off'): boolean;
    transcript: HTMLInputElement;
    offline: HTMLElement;
    takeGreeting(): boolean;
    career(): boolean;
  }) {
    this.session = new VoiceSession({
      base, player: this.player,
      available: () => this.available(), readAloud: () => this.output.checked,
      beforeAudio: () => this.controls.video.pause(),
      state: state => this.setState(state), error: message => this.fail(message),
    });
    const label = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string) => {
      const node = element(tag, text); this.labels.set(node, text); return node;
    };
    const button = (text: string, run: () => void) => {
      const node = label('button', text); node.type = 'button'; node.addEventListener('click', run); return node;
    };
    const title = label('h3', 'Lesson voice navigation'); title.id = 'lesson-voice-title';
    this.root.className = 'lesson-voice'; this.root.lang = 'en';
    this.root.translate = false; this.root.setAttribute('aria-labelledby', title.id);
    const languageLabel = element('label');
    const languageText = element('span');
    const english = element('span', 'Voice language / '); english.lang = 'en';
    const amharic = element('span', 'የድምፅ ቋንቋ'); amharic.lang = 'am';
    languageText.append(english, amharic);
    this.language.append(new Option('English', 'en'), new Option('አማርኛ', 'am'));
    this.language.options[0].lang = 'en'; this.language.options[1].lang = 'am'; languageLabel.append(languageText, this.language);
    this.language.addEventListener('change', () => void this.changeLanguage());
    const readLabel = element('label'); this.output.type = 'checkbox'; this.output.checked = true;
    readLabel.append(this.output, label('span', 'Read prompts and results aloud'));
    this.output.addEventListener('change', () => { this.session.stop(); this.updateButtons(); });
    this.listenButton = button('Listen for a command', () => this.listen());
    this.readButton = button('Read command help aloud', () => {
      this.session.stop(); this.error.textContent = '';
      if (this.locale === 'en') void this.session.offerEnglishGreeting([help], () => this.listen());
      else this.session.speak([this.text(help)], { kind: 'lesson-guide' }, () => this.listen());
    });
    this.sendButton = button('Use recording', () => { this.session.finishRecording(); this.command.focus(); });
    const buttons = element('div'); buttons.className = 'voice-actions';
    buttons.append(this.listenButton, this.readButton, this.sendButton, button('Stop', () => this.stop()));
    this.player.controls = true; this.player.preload = 'none'; this.player.hidden = true;
    this.player.lang = 'am'; this.player.setAttribute('aria-label', 'የአማርኛ ድምፅ ማጫወቻ');
    this.status.setAttribute('role', 'status'); this.message.setAttribute('role', 'status');
    this.error.setAttribute('role', 'alert'); this.error.id = 'lesson-voice-error';
    const form = element('form'); form.autocomplete = 'off';
    const commandLabel = element('label'); this.command.maxLength = 160;
    this.command.setAttribute('aria-describedby', 'lesson-voice-help lesson-voice-error');
    commandLabel.append(label('span', 'Lesson command'), this.command);
    form.append(commandLabel, label('button', 'Run typed command'));
    this.command.addEventListener('input', () => this.session.stop());
    form.addEventListener('submit', event => {
      event.preventDefault(); this.session.stop(); const value = this.command.value; this.command.value = ''; this.run(value);
    });
    const instructions = label('p', help); instructions.id = 'lesson-voice-help';
    const playbackHelp = label('p', 'Stop cancels listening. Listening pauses lesson playback. To speak again after playing a video, choose Listen for a command.');
    this.root.append(title, languageLabel, this.privacy, readLabel, buttons, this.player, this.status, this.message, this.error, form, instructions, playbackHelp);

    const signal = this.cleanup.signal;
    controls.video.addEventListener('play', () => { if (!controls.video.paused) this.stop(); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); }, { signal });
    document.addEventListener('focusin', event => { if (this.privateTarget(event.target)) this.stop(); }, { signal });
    document.addEventListener('input', event => {
      if (!event.composedPath().includes(this.root)) this.stop();
    }, { signal });
    for (const event of ['pagehide', 'popstate', 'hashchange']) window.addEventListener(event, () => this.stop(), { signal });
    this.root.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this.stop(); } });
    this.renderLanguage();
  }

  private privateTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && target.closest('[data-voice-private]') !== null;
  }

  private available() {
    return this.root.isConnected && !this.paused && !document.hidden && !this.catalogRequest && !this.privateTarget(document.activeElement);
  }

  private text(value: string) { return this.locale === 'am' ? this.catalog?.ui[value] || value : value; }

  private renderLanguage() {
    this.root.lang = this.locale;
    for (const [node, text] of this.labels) node.textContent = this.text(text);
    this.privacy.textContent = this.locale === 'am'
      ? this.session.usesAddis ? `${this.text(providerPrivacy)} ${this.text('Addis AI may retain transcripts for 24 hours and store generated audio. Stop discards unsent recordings.')}` : 'የአሳሽዎ የድምፅ አገልግሎት ቀረጻውን ሊያስኬድ ይችላል። የግል መረጃ አይናገሩ።'
      : 'Your browser’s speech provider may process audio. Keep personal notes in the reflection field.';
    this.updateButtons(); this.setState('off');
  }

  private updateButtons() {
    this.listenButton.disabled = !!this.catalogRequest || !this.session.microphoneAvailable;
    this.readButton.disabled = !!this.catalogRequest || !this.output.checked;
  }

  private setState(state: SpeechState) {
    this.root.dataset.speechState = state;
    this.status.textContent = this.text(state === 'off' && !this.session.microphoneAvailable
      ? 'Speech recognition is unavailable. Type a lesson command or use the lesson controls.' : speechStatus[state]);
    this.status.setAttribute('aria-live', this.locale === 'en' && this.output.checked && state === 'speaking' ? 'off' : 'polite');
    this.sendButton.hidden = !this.session.usesAddis || state !== 'listening';
  }

  private async changeLanguage() {
    const selected = this.language.value === 'am' ? 'am' : 'en';
    this.stop(); this.language.value = selected;
    this.error.textContent = ''; this.message.textContent = ''; this.command.value = '';
    if (selected === 'am' && !this.catalog) {
      const controller = new AbortController(); this.catalogRequest = controller; this.updateButtons();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try { this.catalog = await loadAmharicCatalog(this.base, controller.signal); }
      catch {
        if (controller === this.catalogRequest) {
          this.language.value = this.locale;
          this.fail('Amharic text could not load. Choose Amharic again to retry.');
        }
        return;
      } finally {
        clearTimeout(timeout);
        if (controller === this.catalogRequest) { this.catalogRequest = undefined; this.updateButtons(); }
      }
      if (controller.signal.aborted || !this.root.isConnected || this.paused) return;
    }
    this.locale = selected; this.session.configure(selected, this.catalog?.speech_enabled); this.renderLanguage();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.stop();
    else if (this.controls.takeGreeting() && this.controls.video.paused) {
      void this.session.offerEnglishGreeting(['Welcome to the Savanna learning demo.', help], () => this.listen());
    }
  }

  private stop() {
    if (this.catalogRequest) {
      this.catalogRequest.abort(); this.catalogRequest = undefined; this.language.value = this.locale; this.updateButtons();
    }
    this.session.stop();
    this.command.value = '';
  }

  destroy() { this.stop(); this.cleanup.abort(); }

  private listen() {
    if (!this.available()) return;
    this.command.value = ''; this.error.textContent = ''; this.message.textContent = '';
    this.session.listen(value => {
      if (this.locale === 'en') this.run(value);
      else {
        this.command.value = value;
        this.message.textContent = this.text('Review or edit the transcript, then choose Run typed command.');
        this.command.focus();
      }
    }, commandKey);
  }

  private fail(message: string) {
    this.session.handsFree = false;
    this.error.textContent = this.text(message);
  }

  private respond(message: string) {
    const speak = this.locale === 'en' && this.output.checked && this.controls.video.paused;
    this.message.setAttribute('aria-live', speak ? 'off' : 'polite');
    this.message.textContent = this.text(message);
    if (speak) this.session.speak([message], undefined, () => this.listen());
  }

  private run(value: string) {
    if (!this.available()) return;
    this.session.interrupt(); this.error.textContent = ''; this.message.textContent = '';
    const command = commandKey(value);
    const { video, transcript, offline } = this.controls;
    switch (command) {
      case 'stop': this.stop(); break;
      case 'play':
        this.stop();
        void video.play().then(() => {
          if (this.available() && !video.paused) this.respond('Video playing. Microphone off.');
        }).catch(() => { if (this.available()) this.fail('Video playback is unavailable. Try the video controls or transcript.'); });
        break;
      case 'pause': video.pause(); this.respond('Video paused.'); break;
      case 'en': case 'am': case 'off':
        if (!this.controls.setCaptions(command)) this.fail('That caption language is unavailable for this video edition.');
        else this.respond({ en: 'English captions selected.', am: 'Amharic captions selected.', off: 'Captions off.' }[command]);
        break;
      case 'transcript': transcript.focus(); this.respond('Transcript search focused.'); break;
      case 'offline': offline.focus(); this.respond('Offline formats are ready to browse. Choose a download link.'); break;
      case 'career': this.stop(); if (!this.controls.career()) this.fail('Career Gateway is unavailable on this page.'); break;
      default: this.fail('Use a lesson command from the list below.');
    }
  }
}
