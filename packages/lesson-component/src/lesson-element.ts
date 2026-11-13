import { createMediaView, type LessonMedia, type TimedSegment } from './media-view';

interface Segment extends TimedSegment {}
interface Lesson {
  schema_version: string; lesson_id: string; content_version: number;
  title: string; summary: string; language: string; segments: Segment[]; unavailable: string[];
  content_status: string; media?: LessonMedia | null;
}
interface ExportItem { format: string; label: string; bytes: number; href: string }

const styles = `
  :host { display:block; margin-block:1.5rem; font:1rem/1.65 system-ui,sans-serif; color:var(--access-text,#17313b); }
  * { box-sizing:border-box; }
  article { background:var(--access-surface,#fff); border:1px solid #b4c6c2; border-radius:.7rem; padding:clamp(1rem,4vw,2.25rem); }
  h2,h3 { line-height:1.3; } h2 { margin-top:0; font-size:1.65em; } h3 { font-size:1.15em; }
  p { max-width:65ch; overflow-wrap:anywhere; }
  .note { color:#405b64; font-size:.9em; }
  .toolbar { display:flex; flex-wrap:wrap; gap:1rem; align-items:end; border-block:1px solid #d8e2df; padding:1rem 0; }
  label { display:grid; gap:.35rem; font-weight:600; flex:1 1 14rem; }
  input,select,button { font:inherit; min-height:2.75rem; padding:.45rem .7rem; border:1px solid #718d90; border-radius:.3rem; background:white; color:inherit; max-width:100%; }
  button { cursor:pointer; } a { color:var(--access-link,#155e63); text-underline-offset:.2em; }
  :focus-visible { outline:3px solid #bd4e19; outline-offset:3px; }
  .reading { font-size:var(--reading-size,1rem); } .exports { display:flex; flex-wrap:wrap; gap:.75rem 1.5rem; padding:0; list-style:none; }
  .exports a { display:inline-block; min-height:2.75rem; padding:.5rem 0; }
  summary { cursor:pointer; min-height:2.75rem; padding-block:.5rem; }
  [role=status] { min-height:1.65em; }
  .media-view { margin-top:1.25rem; } .media-stage { display:flex; align-items:stretch; gap:1rem; } .video-column { flex:1; min-width:0; }
  video { width:100%; display:block; max-height:32rem; background:#14232c; border-radius:.5rem; }
  video::cue { font-size:var(--caption-size,1rem); color:#fff; background:#14232cf0; }
  .active-caption { padding:.8rem 1rem; background:#edf3f5; border-left:3px solid #087c9e; margin:0; min-height:5rem; font-size:var(--caption-size,1rem); }
  .media-options { display:flex; flex-wrap:wrap; gap:.75rem; align-items:end; margin:1rem 0; }
  .media-options label { flex:1 1 8rem; font-size:.85rem; }
  .avatar-panel { flex:0 0 280px; padding:1rem; background:#eaf0f4; border-radius:.5rem; }
  .avatar-panel h3 { margin:.25rem 0; } .avatar-panel p { font-size:.8rem; line-height:1.5; }
  .prototype-label { color:#633a13; } .avatar-canvas { width:100%; height:300px; } .avatar-clock { font-variant-numeric:tabular-nums; }
  .avatar-below { flex-direction:column; } .avatar-below .avatar-panel { flex-basis:auto; }
  .seek { margin:0 .75rem .25rem 0; color:#075c80; border:1px solid #b5c8d0; font-variant-numeric:tabular-nums; }
  .transcript { max-height:28rem; overflow:auto; padding:1rem; border:1px solid #d8e2df; border-radius:.4rem; overscroll-behavior:contain; }
  [hidden] { display:none !important; }
  @media(max-width:800px) { .media-stage { flex-direction:column; } .avatar-panel { flex-basis:auto; } }
`;

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

export class AccessibleLesson extends HTMLElement {
  static observedAttributes = ['api-base', 'lesson-id', 'content-version', 'lang'];
  private root = this.attachShadow({ mode: 'open' });
  private controller?: AbortController;
  private sequence = 0;
  private disposeMedia?: () => void;

  connectedCallback() { void this.load(); }
  attributeChangedCallback() { if (this.isConnected) void this.load(); }
  disconnectedCallback() { this.controller?.abort(); this.sequence++; this.disposeMedia?.(); this.disposeMedia = undefined; }

  private emit(name: string, detail: Record<string, unknown>) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  private frame() {
    const style = node('style', styles);
    const article = node('article');
    article.setAttribute('aria-label', 'Accessible lesson');
    this.root.replaceChildren(style, article);
    return article;
  }

  private async load(focusAfterLoad = false) {
    this.disposeMedia?.(); this.disposeMedia = undefined;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const sequence = ++this.sequence;
    const article = this.frame();
    const status = node('p', 'Loading lesson…');
    status.setAttribute('role', 'status');
    article.append(status);
    try {
      const lessonId = this.getAttribute('lesson-id') || '';
      const version = this.getAttribute('content-version') || '1';
      if (!/^[a-z0-9-]+$/.test(lessonId) || !/^[1-9]\d*$/.test(version)) throw new Error('Invalid configuration');
      const base = new URL((this.getAttribute('api-base') || '/api/v1').replace(/\/$/, '') + '/', document.baseURI);
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid API address');
      const path = `lessons/${encodeURIComponent(lessonId)}`;
      const read = async (resource: string) => {
        const response = await fetch(new URL(`${path}/${resource}?version=${version}`, base), { signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('Lesson request failed');
        return response.json();
      };
      const [lesson, exports] = await Promise.all([read('manifest'), read('exports')]) as [Lesson, { items: ExportItem[]; content_version: number }];
      if (sequence !== this.sequence || controller.signal.aborted) return;
      if (lesson.schema_version !== '1.0' || lesson.lesson_id !== lessonId || lesson.content_version !== Number(version) || exports.content_version !== Number(version)) throw new Error('Unsupported lesson version');
      if (!Array.isArray(lesson.segments) || !Array.isArray(lesson.unavailable) || !Array.isArray(exports.items)) throw new Error('Invalid lesson data');
      this.render(article, lesson, exports.items, base);
      if (focusAfterLoad) {
        const heading = article.querySelector('h2');
        if (heading) { heading.tabIndex = -1; heading.focus(); }
      }
      this.emit('alx-media-ready', { lessonId, contentVersion: Number(version) });
    } catch (error) {
      if (controller.signal.aborted || sequence !== this.sequence) return;
      article.replaceChildren(node('h2', 'Lesson unavailable'));
      const message = node('p', 'Check your connection and try again. You can also use the download link below if available.');
      message.setAttribute('role', 'status');
      const retry = node('button', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', () => void this.load(true));
      const fallback = document.createElement('slot');
      article.append(message, retry, fallback);
      this.emit('alx-media-error', { code: 'lesson_unavailable', lessonId: this.getAttribute('lesson-id') });
    }
  }

  private render(article: HTMLElement, lesson: Lesson, exports: ExportItem[], base: URL) {
    article.lang = lesson.language;
    article.replaceChildren(node('p', `${lesson.content_status === 'source-draft' ? 'ALX video · Source captions awaiting review' : 'Synthetic demo'} · Version ${lesson.content_version}`), node('h2', lesson.title), node('p', lesson.summary));
    let media: ReturnType<typeof createMediaView> | undefined;
    if (lesson.media) {
      media = createMediaView(lesson.media, lesson.segments, base, detail => this.emit('alx-avatar-status', detail));
      this.disposeMedia = media.dispose;
      article.append(media.view);
    }
    const toolbar = node('div'); toolbar.className = 'toolbar';
    const searchLabel = node('label', 'Find text in this lesson');
    const search = node('input'); search.type = 'search'; searchLabel.append(search);
    const sizeLabel = node('label', 'Text size');
    const size = node('select');
    for (const [value, label] of [['1', 'Standard'], ['1.25', 'Large'], ['1.5', 'Extra large']]) {
      const option = node('option', label); option.value = value; size.append(option);
    }
    sizeLabel.append(size);
    toolbar.append(searchLabel, sizeLabel);
    const status = node('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const reading = node('div'); reading.className = 'reading';
    if (media) { reading.classList.add('transcript'); reading.setAttribute('role', 'region'); reading.setAttribute('aria-label', 'Transcript passages'); reading.tabIndex = 0; }
    const sections = lesson.segments.map(segment => {
      const section = node('section');
      if (segment.start !== undefined && segment.start !== null && media) {
        const seek = node('button', `Jump to ${segment.heading}`); seek.type = 'button'; seek.className = 'seek';
        seek.addEventListener('click', () => media?.seek(segment.start!));
        section.append(seek, node('p', segment.text));
      } else section.append(node('h3', segment.heading), node('p', segment.text));
      reading.append(section);
      return { section, text: `${segment.heading} ${segment.text}`.toLocaleLowerCase() };
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase();
      let count = 0;
      for (const item of sections) { item.section.hidden = !item.text.includes(query); if (!item.section.hidden) count++; }
      status.textContent = query ? `${count} of ${sections.length} sections found.` : '';
    });
    size.addEventListener('change', () => { reading.style.setProperty('--reading-size', `${size.value}rem`); });
    const heading = node('h3', 'Save for offline reading');
    const links = node('ul'); links.className = 'exports';
    for (const item of exports) {
      const url = new URL(item.href, base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Invalid export address');
      const link = node('a', `${item.label} (${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(item.bytes / 1024)} KB)`);
      link.href = url.href; link.setAttribute('download', '');
      link.addEventListener('click', () => this.emit('alx-media-download', { lessonId: lesson.lesson_id, contentVersion: lesson.content_version, format: item.format, status: 'requested' }));
      const listItem = node('li'); listItem.append(link); links.append(listItem);
    }
    const availability = node('details');
    availability.append(node('summary', 'Formats awaiting content and review'));
    const list = node('ul');
    for (const format of lesson.unavailable) list.append(node('li', format));
    availability.append(list);
    if (media) article.append(node('h3', 'Transcript'));
    article.append(toolbar, status, reading, heading, links, availability);
  }
}
