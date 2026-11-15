type SpeechState = 'off' | 'starting' | 'listening' | 'speaking';
interface Alternative { transcript: string; confidence: number }
interface RecognitionResult { isFinal: boolean; length: number; [index: number]: Alternative }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: { [index: number]: RecognitionResult } }) => void) | null;
  start(): void; abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export class CareerSpeech {
  private recognition?: Recognition;
  private utterance?: SpeechSynthesisUtterance;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly recognitionType = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;

  constructor(private state: (state: SpeechState) => void, private error: (message: string) => void) {}

  get microphoneAvailable() { return !!this.recognitionType; }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    if (this.recognition) {
      const recognition = this.recognition;
      this.recognition = undefined;
      recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
      try { recognition.abort(); } catch {}
    }
    if (this.utterance) {
      this.utterance.onend = this.utterance.onerror = null;
      this.utterance = undefined;
      window.speechSynthesis.cancel();
    }
    this.state('off');
  }

  listen(receive: (text: string) => void) {
    this.stop();
    if (!this.recognitionType) {
      this.error('Speech recognition is unavailable. Type a role or command, or use the buttons.');
      return;
    }
    const generation = this.generation;
    const current = () => generation === this.generation;
    try {
      const recognition = new this.recognitionType();
      this.recognition = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 2;
      recognition.onstart = () => { if (current()) this.state('listening'); };
      recognition.onerror = event => {
        if (!current()) return;
        this.stop();
        this.error(['not-allowed', 'service-not-allowed'].includes(event.error)
          ? 'Microphone permission was denied. Type a role or command, or use the buttons. No retry happens automatically.'
          : 'Speech could not be recognized. Try Listen for a command again, or type instead.');
      };
      recognition.onend = () => {
        if (!current()) return;
        this.stop();
        this.error('No speech was recognized. Try Listen for a command again, or type instead.');
      };
      recognition.onresult = event => {
        if (!current()) return;
        const result = event.results[event.resultIndex];
        if (!result?.isFinal) return;
        const first = result[0];
        const second = result[1];
        this.stop();
        if (!first || first.transcript.length > 160 || (first.confidence > 0 && first.confidence < 0.55) ||
          (second && first.transcript.trim().toLowerCase() !== second.transcript.trim().toLowerCase() && first.confidence - second.confidence < 0.15)) {
          this.error('That speech was ambiguous. Nothing was changed. Please repeat one command or type it.');
          return;
        }
        receive(first.transcript);
      };
      this.state('starting');
      recognition.start();
      this.timer = setTimeout(() => {
        if (!current()) return;
        this.stop();
        this.error('Listening timed out. The microphone is off. Try again or type a command.');
      }, 15000);
    } catch {
      this.stop();
      this.error('The microphone could not start. Type a role or command, or use the buttons.');
    }
  }

  speak(messages: string[], done?: () => void) {
    this.stop();
    const synthesis = window.speechSynthesis;
    const voice = synthesis?.getVoices().find(candidate => candidate.localService && /^en(?:-|$)/i.test(candidate.lang));
    if (!voice || typeof SpeechSynthesisUtterance === 'undefined') {
      this.error('No on-device English voice is available. Turn off Read aloud and use the text or your screen reader.');
      done?.();
      return;
    }
    const generation = this.generation;
    const remaining = [...messages];
    const next = () => {
      if (generation !== this.generation) return;
      clearTimeout(this.timer);
      const message = remaining.shift();
      if (!message) { this.utterance = undefined; this.state('off'); done?.(); return; }
      const utterance = new SpeechSynthesisUtterance(message);
      this.utterance = utterance;
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.onend = next;
      utterance.onerror = () => {
        if (generation !== this.generation) return;
        this.stop();
        this.error('Read aloud could not finish. Use Repeat, the equivalent text, or your screen reader.');
      };
      this.state('speaking');
      try { synthesis.speak(utterance); } catch { utterance.onerror?.(new Event('error') as SpeechSynthesisErrorEvent); }
      this.timer = setTimeout(() => {
        if (generation !== this.generation) return;
        this.stop();
        this.error('Read aloud timed out. Use the text or your screen reader.');
      }, 60000);
    };
    next();
  }
}
