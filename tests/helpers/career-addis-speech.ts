import { expect, type Locator, type Page } from '@playwright/test';

interface AddisHarness {
  transcript: string; starts: number; stops: number; recording: boolean; speaking: boolean; plays: number;
  overlaps: string[]; grant(): void;
}
declare global { interface Window { __careerAddis: AddisHarness } }

export async function mockAddisSpeech(page: Page, options: { enabled?: boolean; denied?: boolean; pending?: boolean; unsupported?: boolean; speechStatus?: number; transcriptionDelay?: number; catalogDelay?: number; apiBase?: string } = {}) {
  const requests: { operation: string; body: Record<string, unknown> }[] = [];
  await page.addInitScript(({ denied = false, pending = false, unsupported = false }) => {
    const state = {
      transcript: 'ሁሉም ሥራዎች', starts: 0, stops: 0, recording: false, speaking: false, plays: 0, overlaps: [] as string[],
      grant: () => {},
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const media = () => ({ getTracks: () => [{ stop() { state.stops++; state.recording = false; } }] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: () => {
        if (denied) return Promise.reject(new DOMException('Mock permission denied', 'NotAllowedError'));
        if (pending) return new Promise(resolve => { state.grant = () => resolve(media()); });
        return Promise.resolve(media());
      },
    } });
    class Recorder {
      static isTypeSupported() { return true; }
      state = 'inactive';
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      start() {
        if (state.speaking) state.overlaps.push('Recorded during playback');
        this.state = 'recording'; state.recording = true; state.starts++;
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['simulated microphone, not real audio']) });
        queueMicrotask(() => this.onstop?.());
      }
    }
    class Context {
      async decodeAudioData() { return new AudioBuffer({ numberOfChannels: 1, length: 16000, sampleRate: 16000 }); }
      async close() {}
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: unsupported ? undefined : Recorder });
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Context });
    const matches = (media: HTMLMediaElement) => media.getAttribute('aria-label') === 'የአማርኛ ድምፅ ማጫወቻ';
    const original = {
      play: HTMLMediaElement.prototype.play, pause: HTMLMediaElement.prototype.pause, load: HTMLMediaElement.prototype.load,
      src: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')!,
    };
    const sources = new WeakMap<HTMLMediaElement, string>();
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      get() { return matches(this) ? sources.get(this) || '' : original.src.get!.call(this); },
      set(value: string) { if (matches(this)) sources.set(this, value); else original.src.set!.call(this, value); },
    });
    HTMLMediaElement.prototype.play = function () {
      if (!matches(this)) return original.play.call(this);
      if (state.recording) state.overlaps.push('Playback during recording');
      if (state.speaking) state.overlaps.push('Two audio responses');
      state.plays++; state.speaking = true; this.dispatchEvent(new Event('play'));
      timer = setTimeout(() => { state.speaking = false; this.dispatchEvent(new Event('ended')); }, 20);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      if (!matches(this)) { original.pause.call(this); return; }
      clearTimeout(timer); state.speaking = false;
    };
    HTMLMediaElement.prototype.load = function () { if (!matches(this)) original.load.call(this); };
    Object.defineProperty(window, '__careerAddis', { value: state });
  }, options);
  await page.route('**/api/v1/career-speech/**', async route => {
    const operation = new URL(route.request().url()).pathname.split('/').pop()!;
    if (operation === 'catalog') {
      const path = new URL(route.request().url()).pathname;
      const response = await route.fetch(options.apiBase ? { url: new URL(path, options.apiBase).href } : {});
      const catalog = await response.json();
      if (options.catalogDelay) await new Promise(resolve => setTimeout(resolve, options.catalogDelay));
      await route.fulfill({ response, json: { ...catalog, speech_enabled: options.enabled !== false } });
      return;
    }
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push({ operation, body });
    if (options.speechStatus) { await route.fulfill({ status: options.speechStatus, json: { error: { code: 'simulated_unavailable' } } }); return; }
    if (operation === 'transcribe') {
      const text = await page.evaluate(() => window.__careerAddis.transcript);
      if (options.transcriptionDelay) await new Promise(resolve => setTimeout(resolve, options.transcriptionDelay));
      await route.fulfill({ json: { text } });
    } else await route.fulfill({ contentType: 'audio/mpeg', body: 'SIMULATED AUDIO RESPONSE — NOT LIVE ADDIS AUDIO' });
  });
  return requests;
}

export async function chooseAmharic(guide: Locator) {
  await guide.getByRole('combobox', { name: 'Voice language / የድምፅ ቋንቋ' }).selectOption('am');
  await expect(guide).toHaveAttribute('lang', 'am');
}

export async function typeAmharic(guide: Locator, text: string) {
  await guide.getByRole('textbox', { name: 'የሥራ ዓይነት ወይም ትእዛዝ' }).fill(text);
  await guide.getByRole('button', { name: 'ትእዛዙን አስፈጽም', exact: true }).click();
}

export async function recordAmharic(page: Page, guide: Locator, text: string, confirm = true) {
  await page.evaluate(text => { window.__careerAddis.transcript = text; }, text);
  await guide.getByRole('button', { name: 'ትእዛዝ በድምፅ ስጥ', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await guide.getByRole('button', { name: 'ቀረጻውን ላክ', exact: true }).click();
  await expect(guide.getByRole('textbox', { name: 'የሥራ ዓይነት ወይም ትእዛዝ' })).toHaveValue(text);
  if (confirm) await guide.getByRole('button', { name: 'ትእዛዙን አስፈጽም', exact: true }).click();
}
