import { expect, type Locator, type Page } from '@playwright/test';

export async function mockCareerSpeech(page: Page, options: { supported?: boolean; localVoice?: boolean; delay?: number; permission?: PermissionState } = {}) {
  await page.addInitScript(({ supported = true, localVoice = true, delay = 5, permission = 'prompt' }) => {
    const state = {
      starts: 0, aborts: 0, cancels: 0, microphone: false, speaking: false, spoken: [] as string[], overlaps: [] as string[],
      current: undefined as MockRecognition | undefined,
      late: undefined as MockRecognition['onresult'],
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      respond(text: string, confidence = 0.99, second?: string) {
        this.current?.onresult?.({ resultIndex: 0, results: [{ isFinal: true, length: second ? 2 : 1, 0: { transcript: text, confidence }, ...(second ? { 1: { transcript: second, confidence: confidence - 0.01 } } : {}) }] });
      },
      deny() { this.current?.onerror?.({ error: 'not-allowed' }); },
      capture() { this.late = this.current?.onresult; },
      deliverLate(text: string) { this.late?.({ resultIndex: 0, results: [{ isFinal: true, length: 1, 0: { transcript: text, confidence: 0.99 } }] }); },
    };
    class MockRecognition {
      onstart?: () => void;
      onresult?: (event: unknown) => void;
      onerror?: (event: { error: string }) => void;
      start() {
        if (state.speaking) state.overlaps.push('Microphone started during synthesis');
        state.starts++; state.microphone = true; state.current = this;
        this.onstart?.();
      }
      abort() { state.aborts++; state.microphone = false; }
    }
    class MockUtterance { constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: supported ? MockRecognition : undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => localVoice ? [{ localService: true, lang: 'en-US', name: 'Mock on-device voice' }] : [{ localService: false, lang: 'en-US', name: 'Mock remote voice' }],
      speak(utterance: { text: string; onend?: () => void }) {
        if (state.microphone) state.overlaps.push('Synthesis started during microphone capture');
        if (state.speaking) state.overlaps.push('Two simultaneous utterances');
        state.speaking = true; state.spoken.push(utterance.text);
        state.timer = setTimeout(() => { state.speaking = false; utterance.onend?.(); }, delay);
      },
      cancel() { state.cancels++; state.speaking = false; clearTimeout(state.timer); },
    } });
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: async () => ({ state: permission }) } });
    Object.defineProperty(window, '__careerSpeech', { value: state });
  }, options);
}

type SpeechHarness = {
  respond(text: string, confidence?: number, second?: string): void;
  deny(): void; capture(): void; deliverLate(text: string): void;
  spoken: string[]; overlaps: string[]; starts: number; aborts: number; cancels: number; microphone: boolean; speaking: boolean;
};
declare global { interface Window { __careerSpeech: SpeechHarness } }

export async function respond(page: Page, text: string, confidence = 0.99, second?: string) {
  await page.evaluate(({ text, confidence, second }) => window.__careerSpeech.respond(text, confidence, second), { text, confidence, second });
}
export async function voiceCommand(page: Page, guide: Locator, text: string) {
  await guide.getByRole('button', { name: 'Listen for a command', exact: true }).click();
  await expect(guide).toHaveAttribute('data-speech-state', 'listening');
  await respond(page, text);
}
export async function typedCommand(guide: Locator, text: string) {
  await guide.getByRole('textbox', { name: 'Role or command' }).fill(text);
  await guide.getByRole('button', { name: 'Run typed command' }).click();
}
