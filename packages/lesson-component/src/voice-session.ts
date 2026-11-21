import { CareerSpeech, type SpeechState } from './career-speech';
import { AddisCareerSpeech } from './career-addis-speech';
import type { SpeechPrompt } from './career-amharic';

export type VoiceLanguage = 'en' | 'am';
export const speechStatus = {
  off: 'Microphone off.', starting: 'Waiting for microphone permission…',
  listening: 'Microphone listening for one response. Use Stop to cancel.',
  speaking: 'Reading aloud. Microphone off.', transcribing: 'Transcribing. Microphone off.',
  preparing: 'Preparing audio. Microphone off.',
} satisfies Record<SpeechState, string>;

export class VoiceSession {
  private speech: CareerSpeech | AddisCareerSpeech;
  private generation = 0;
  private language: VoiceLanguage = 'en';
  handsFree = false;

  constructor(private options: {
    player: HTMLAudioElement; base: URL;
    available(): boolean; readAloud(): boolean; beforeAudio(): void;
    state(state: SpeechState): void; error(message: string): void;
  }) {
    this.speech = this.browserSpeech('en');
  }

  private browserSpeech(language: VoiceLanguage) {
    return new CareerSpeech(this.options.state, message => this.failed(message), language === 'am' ? 'am-ET' : 'en-US');
  }

  get microphoneAvailable() { return this.speech.microphoneAvailable; }
  get usesAddis() { return this.speech instanceof AddisCareerSpeech; }

  configure(language: VoiceLanguage, addisEnabled = false) {
    this.stop();
    this.language = language;
    const browser = this.browserSpeech(language);
    this.speech = language === 'am' && (addisEnabled || !browser.microphoneAvailable)
      ? new AddisCareerSpeech(this.options.base, addisEnabled, this.options.player, this.options.state, message => this.failed(message))
      : browser;
  }

  interrupt() { this.generation++; this.speech.stop(); }
  stop() { this.handsFree = false; this.interrupt(); }

  private failed(message: string) {
    this.handsFree = false;
    this.options.error(message);
  }

  async offerEnglishGreeting(messages: string[], continued: () => void, prompt?: SpeechPrompt, ready?: () => void) {
    if (this.language !== 'en' || !this.options.available()) return;
    const generation = this.generation;
    let permission: PermissionState | undefined;
    try { permission = (await navigator.permissions.query({ name: 'microphone' as PermissionName })).state; } catch {}
    if (generation !== this.generation || !this.options.available() || !this.options.readAloud()) return;
    this.handsFree = permission === 'granted' && this.microphoneAvailable;
    ready?.();
    this.speak(messages, prompt, continued);
  }

  listen(receive: (text: string) => void, commandKey?: (text: string) => string) {
    if (!this.options.available()) return;
    this.interrupt();
    this.handsFree = this.language === 'en' && this.options.readAloud();
    this.options.beforeAudio();
    this.speech.listen(receive, commandKey);
  }

  speak(messages: string[], prompt: SpeechPrompt | undefined, continued: () => void, done?: () => void) {
    if (!this.options.available()) return;
    const completed = done || (this.handsFree && this.language === 'en' ? continued : undefined);
    if (!this.options.readAloud()) { done?.(); return; }
    this.options.beforeAudio();
    if (this.speech instanceof AddisCareerSpeech) { if (prompt) this.speech.speak(prompt, completed); }
    else this.speech.speak(messages, completed);
  }

  finishRecording() { if (this.speech instanceof AddisCareerSpeech) this.speech.finishRecording(); }
}
