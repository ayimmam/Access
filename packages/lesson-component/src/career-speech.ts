export type SpeechState = 'off' | 'starting' | 'listening' | 'speaking' | 'transcribing' | 'preparing';
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
  private voicesChanged?: () => void;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly recognitionType = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;

  constructor(private state: (state: SpeechState) => void, private error: (message: string) => void) {}

  get microphoneAvailable() { return !!this.recognitionType; }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    if (this.voicesChanged) {
      window.speechSynthesis?.removeEventListener('voiceschanged', this.voicesChanged);
      this.voicesChanged = undefined;
    }
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
          ? 'Microphone permission was denied. Allow microphone access in your browser settings, then choose Listen for a command, or use typed search.'
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
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      this.error('No English browser voice is available. Use Listen for a command, the text, or your screen reader.');
      return;
    }
    const generation = this.generation;
    const launch = () => {
      const voices = synthesis.getVoices().filter(candidate => /^en(?:-|$)/i.test(candidate.lang));
      const voice = voices.find(candidate => candidate.localService) || voices[0];
      if (!voice) return false;
      clearTimeout(this.timer);
      if (this.voicesChanged) synthesis.removeEventListener('voiceschanged', this.voicesChanged);
      this.voicesChanged = undefined;
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
        const fail = (message: string) => {
          if (generation !== this.generation) return;
          this.stop();
          this.error(message);
        };
        const blocked = 'Your browser blocked read aloud. Turn Read aloud back on and choose Repeat to retry, or use Listen for a command or typed search.';
        const interrupted = 'Read aloud could not finish. Turn Read aloud back on and choose Repeat to retry, or use Listen for a command or typed search.';
        utterance.onerror = event => fail(event.error === 'not-allowed' ? blocked : interrupted);
        this.state('speaking');
        this.timer = setTimeout(() => fail('Read aloud timed out. Use Listen for a command, the text, or your screen reader.'), 60000);
        try { synthesis.speak(utterance); } catch (reason) {
          fail(reason instanceof DOMException && reason.name === 'NotAllowedError' ? blocked : interrupted);
        }
      };
      next();
      return true;
    };
    if (launch()) return;
    this.voicesChanged = () => { if (generation === this.generation) launch(); };
    synthesis.addEventListener('voiceschanged', this.voicesChanged);
    this.timer = setTimeout(() => {
      if (generation !== this.generation) return;
      this.stop();
      this.error('No English browser voice is available. Use Listen for a command, the text, or your screen reader.');
    }, 2000);
  }
}
