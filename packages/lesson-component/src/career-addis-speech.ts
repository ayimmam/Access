import { boundedBody, unavailableSpeech, unconfiguredSpeech, type SpeechPrompt } from './career-amharic';
import type { SpeechState } from './career-speech';

const noCommand = 'No clear command was recognized. Nothing was changed. Try a shorter recording or type instead.';
const speechLimit = 'The speech limit was reached. Use typed controls or try again later; no automatic retry occurs.';

function failureMessage(reason: unknown) {
  return reason instanceof Error && [unavailableSpeech, noCommand, speechLimit].includes(reason.message) ? reason.message : unavailableSpeech;
}

async function wavRecording(blob: Blob): Promise<string> {
  const context = new AudioContext();
  let buffer: AudioBuffer;
  try { buffer = await context.decodeAudioData(await blob.arrayBuffer()); }
  finally { await context.close(); }
  if (buffer.duration <= 0 || buffer.duration > 15) throw new Error('Recording duration');
  const offline = new OfflineAudioContext(1, Math.ceil(buffer.duration * 16000), 16000);
  const source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start();
  const samples = (await offline.startRendering()).getChannelData(0);
  const bytes = new Uint8Array(44 + samples.length * 2); const view = new DataView(bytes.buffer);
  const write = (offset: number, value: string) => bytes.set(new TextEncoder().encode(value), offset);
  write(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); write(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => { const value = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + index * 2, value * (value < 0 ? 32768 : 32767), true); });
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

export class AddisCareerSpeech {
  private generation = 0;
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private controller?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private audioUrl?: string;

  constructor(private base: URL, private enabled: boolean, private player: HTMLAudioElement,
    private state: (state: SpeechState) => void, private error: (message: string) => void) {}

  get microphoneAvailable() {
    return this.enabled && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' &&
      typeof AudioContext !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
  }

  stop() {
    this.generation++; clearTimeout(this.timer); this.controller?.abort(); this.controller = undefined;
    if (this.recorder) {
      this.recorder.ondataavailable = this.recorder.onstop = this.recorder.onerror = null;
      if (this.recorder.state !== 'inactive') { try { this.recorder.stop(); } catch {} }
      this.recorder = undefined;
    }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.player.onended = this.player.onerror = this.player.onplay = this.player.onpause = null;
    this.player.pause(); this.player.removeAttribute('src'); this.player.load(); this.player.hidden = true;
    if (this.audioUrl) { URL.revokeObjectURL(this.audioUrl); this.audioUrl = undefined; }
    this.state('off');
  }

  finishRecording() {
    if (this.recorder?.state !== 'recording') return;
    clearTimeout(this.timer);
    this.recorder.stop(); this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.state('transcribing');
  }

  listen(receive: (text: string) => void) {
    this.stop();
    if (!this.enabled) { this.error(unconfiguredSpeech); return; }
    if (!this.microphoneAvailable) { this.error('Speech recognition is unavailable. Type a role or command, or use the buttons.'); return; }
    const generation = this.generation;
    this.state('starting');
    this.timer = setTimeout(() => {
      if (generation !== this.generation) return;
      this.stop(); this.error('Listening timed out. The microphone is off. Try again or type a command.');
    }, 15000);
    void navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false }).then(stream => {
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      clearTimeout(this.timer); this.stream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('No supported recording format');
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 }); this.recorder = recorder;
      let parts: Blob[] = []; let size = 0;
      recorder.ondataavailable = event => {
        if (generation !== this.generation) return;
        size += event.data.size;
        if (size > 2 * 1024 * 1024) { parts = []; this.stop(); this.error(noCommand); return; }
        parts.push(event.data);
      };
      recorder.onerror = () => { if (generation === this.generation) { parts = []; this.stop(); this.error(noCommand); } };
      recorder.onstop = () => {
        if (generation !== this.generation) return;
        this.recorder = undefined;
        const recording = new Blob(parts, { type: mimeType }); parts = [];
        void this.transcribe(recording, generation, receive);
      };
      recorder.start(250); this.state('listening');
      this.timer = setTimeout(() => { if (generation === this.generation) this.finishRecording(); }, 14000);
    }).catch(reason => {
      if (generation !== this.generation) return;
      this.stop(); this.error(reason?.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Type a role or command, or use the buttons. No retry happens automatically.'
        : 'The microphone could not start. Type a role or command, or use the buttons.');
    });
  }

  private async request(operation: string, body: object, generation: number) {
    this.controller = new AbortController();
    this.timer = setTimeout(() => { if (generation === this.generation) this.controller?.abort(); }, 105000);
    const response = await fetch(new URL(`career-speech/${operation}`, this.base), {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: this.controller.signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, consent: true }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(response.status === 429 ? speechLimit : [413, 422].includes(response.status) ? noCommand : unavailableSpeech);
    }
    return response;
  }

  private async transcribe(recording: Blob, generation: number, receive: (text: string) => void) {
    try {
      this.state('transcribing');
      this.timer = setTimeout(() => { if (generation === this.generation) { this.stop(); this.error(noCommand); } }, 15000);
      const audio = await wavRecording(recording);
      if (generation !== this.generation) return;
      clearTimeout(this.timer);
      const response = await this.request('transcribe', { audio, content_type: 'audio/wav' }, generation);
      if (response.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw new Error(noCommand);
      const value = JSON.parse(new TextDecoder().decode(await boundedBody(response, 4096))) as { text?: unknown };
      if (generation !== this.generation) return;
      this.stop();
      if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > 160) { this.error(noCommand); return; }
      receive(value.text);
    } catch (reason) {
      if (generation !== this.generation) return;
      this.stop(); this.error(failureMessage(reason));
    }
  }

  speak(prompt: SpeechPrompt, done?: () => void) {
    this.stop();
    if (!this.enabled) { this.error(unconfiguredSpeech); done?.(); return; }
    const generation = this.generation;
    this.state('preparing');
    void this.request('speak', prompt, generation).then(async response => {
      if (response.headers.get('Content-Type')?.split(';')[0] !== 'audio/mpeg') throw new Error(unavailableSpeech);
      const bytes = await boundedBody(response, 2 * 1024 * 1024);
      if (generation !== this.generation) return;
      clearTimeout(this.timer);
      this.audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      this.player.src = this.audioUrl; this.player.hidden = false;
      this.player.onplay = () => { if (generation === this.generation) this.state('speaking'); };
      this.player.onpause = () => { if (generation === this.generation) this.state('off'); };
      this.player.onended = () => { if (generation === this.generation) { this.stop(); done?.(); } };
      this.player.onerror = () => { if (generation === this.generation) { this.stop(); this.error('Read aloud could not finish. Use Repeat, the equivalent text, or your screen reader.'); } };
      this.timer = setTimeout(() => { if (generation === this.generation) { this.stop(); this.error('Read aloud could not finish. Use Repeat, the equivalent text, or your screen reader.'); } }, 180000);
      try { await this.player.play(); }
      catch { if (generation === this.generation) { this.state('off'); this.error('Read aloud needs a playback gesture. Use the Amharic audio player\'s Play control, or use the text.'); } }
    }).catch(reason => {
      if (generation !== this.generation) return;
      this.stop(); this.error(failureMessage(reason));
    });
  }
}
