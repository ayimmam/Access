import type { SigningSegment } from './signing-player';

export class InterpreterVideo {
  private controller?: AbortController;
  private segment?: SigningSegment;
  private objectUrl?: string;
  private sourceTime = 0;
  private paused = true;
  private rate = 1;
  private playRequest?: Promise<void>;
  state: 'loading' | 'ready' | 'unavailable' | 'buffering' = 'unavailable';

  constructor(readonly video: HTMLVideoElement, private base: URL, private stalled: () => void) {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.hidden = true;
    video.setAttribute('aria-label', 'Reviewed EthSL interpreter video');
    video.addEventListener('loadedmetadata', () => {
      if (!this.segment || !Number.isFinite(video.duration) ||
        Math.abs(video.duration - (this.segment.natural_duration || 0)) > .1) { this.fail(); return; }
      this.state = 'ready';
      video.hidden = false;
      this.synchronize();
    });
    video.addEventListener('canplay', () => {
      if (this.segment && this.state === 'buffering') { this.state = 'ready'; this.synchronize(); }
    });
    video.addEventListener('waiting', () => {
      if (this.segment && !this.paused && !video.seeking) { this.state = 'buffering'; this.stalled(); }
    });
    video.addEventListener('error', () => { if (this.segment) this.fail(); });
  }

  private fail() {
    this.state = 'unavailable';
    this.video.hidden = true;
    this.video.pause();
    this.stalled();
  }

  async select(segment: SigningSegment) {
    if (this.segment?.id === segment.id) return;
    this.clear();
    this.segment = segment;
    this.state = 'loading';
    const controller = new AbortController();
    this.controller = controller;
    try {
      if (segment.status !== 'approved' || segment.presentation !== 'interpreter-video' || !segment.interpreter_video ||
        !/^[0-9a-f]{64}$/.test(segment.approved_render_sha256 || '')) throw new Error('Video not approved');
      const asset = segment.interpreter_video;
      const url = new URL(asset.url, this.base);
      if (url.origin !== this.base.origin || !url.pathname.startsWith(this.base.pathname)) throw new Error('Untrusted video');
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (!response.ok || Number(response.headers.get('content-length')) > 25 * 1024 * 1024) throw new Error('Video unavailable');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Video too large');
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
        .map(value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) throw new Error('Video revision changed');
      if (controller.signal.aborted) return;
      this.objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
      this.video.src = this.objectUrl;
    } catch {
      if (!controller.signal.aborted) this.fail();
    }
  }

  update(time: number, paused: boolean, rate: number) {
    this.sourceTime = time;
    this.paused = paused;
    this.rate = rate;
    this.synchronize();
  }

  private synchronize() {
    if (!this.segment || this.state !== 'ready') return;
    const time = Math.max(0, (this.sourceTime - this.segment.start) * this.segment.playback_rate);
    const target = Math.min(time, Math.max(0, this.video.duration - .001));
    if (Math.abs(this.video.currentTime - target) > (this.paused ? .001 : .08)) this.video.currentTime = target;
    this.video.playbackRate = this.rate * this.segment.playback_rate;
    if (this.paused || time >= this.video.duration) this.video.pause();
    else if (this.video.paused && !this.playRequest) {
      const segment = this.segment;
      const request = this.video.play();
      this.playRequest = request;
      void request.catch(error => {
        if (this.segment === segment && error.name !== 'AbortError') this.fail();
      }).finally(() => { if (this.playRequest === request) this.playRequest = undefined; });
    }
  }

  clear() {
    this.controller?.abort();
    this.segment = undefined;
    this.playRequest = undefined;
    this.video.pause();
    this.video.hidden = true;
    this.video.removeAttribute('src');
    this.video.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.state = 'unavailable';
  }
}
