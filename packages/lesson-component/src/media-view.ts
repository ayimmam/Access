import type { TimingAvatar } from './timing-avatar';
import type { SigningManifest } from './signing-player';
import { InterpreterVideo } from './interpreter-video';

export interface TimedSegment { id: string; heading: string; text: string; start?: number; end?: number }
export interface CaptionTrack { language: 'en' | 'am' | 'om' | 'ti'; label: string; src: string; status: string }
export interface LessonMedia {
  id: string; src: string; captions: string; duration: number; avatar_mode: string;
  caption_tracks?: CaptionTrack[]; described_src?: string; described_captions?: string;
  offline_video_src?: string; offline_described_src?: string;
  audio_src?: string; described_audio_src?: string; sign_src?: string; sign_status?: string;
}

interface MediaViewOptions {
  aslDemo: boolean;
  showSigningPreview: boolean;
  notify: (detail: Record<string, unknown>) => void;
  resizePage: (size: string) => void;
  onCaptionLanguage: (language: string) => void;
  onEditionChange: (described: boolean) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createMediaView(media: LessonMedia, segments: TimedSegment[], base: URL, options: MediaViewOptions) {
  const { showSigningPreview, notify, resizePage, onEditionChange } = options;
  const signSource = media.sign_status === 'reviewed' ? media.sign_src : undefined;
  const resource = (path: string) => {
    const url = new URL(path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Invalid media address');
    return url.href;
  };
  const view = element('section'); view.className = 'media-view'; view.setAttribute('aria-label', 'Lesson video and accessibility');
  const stage = element('div'); stage.className = 'media-stage';
  const video = element('video');
  video.controls = true; video.preload = 'metadata'; video.playsInline = true;
  video.crossOrigin = 'anonymous'; video.src = resource(media.src); video.setAttribute('aria-label', 'Lesson video');
  const definitions = media.caption_tracks?.length ? media.caption_tracks : [{ language: 'en' as const, label: 'English · source draft', src: media.captions, status: 'source-draft' }];
  const legacyCaptionValue = !media.caption_tracks?.length;
  const optionValue = (language: string) => legacyCaptionValue ? 'on' : language;
  const tracks = definitions.map(definition => {
    const track = element('track'); track.kind = 'captions'; track.label = definition.label; track.srclang = definition.language;
    track.src = resource(definition.src); video.append(track); return track;
  });
  const videoColumn = element('div'); videoColumn.className = 'video-column'; videoColumn.append(video);
  const cue = element('p'); cue.className = 'active-caption';
  videoColumn.append(cue);
  const signPanel = element('aside'); signPanel.className = 'sign-panel'; signPanel.hidden = true;
  signPanel.setAttribute('aria-label', 'Ethiopian Sign Language interpretation');
  const signTitle = element('h3', 'Ethiopian Sign Language');
  const signStatus = element('p'); signStatus.setAttribute('role', 'status');
  const signVideo = element('video'); signVideo.muted = true; signVideo.playsInline = true; signVideo.preload = 'metadata';
  signVideo.setAttribute('aria-label', 'Ethiopian Sign Language interpretation video');
  if (signSource) signVideo.src = resource(signSource);
  signPanel.append(signTitle);
  if (signSource) signPanel.append(signVideo);
  signPanel.append(signStatus);
  const panel = element('aside'); panel.className = 'avatar-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'EthSL hands-only signing view');
  const title = element('h3', '3D hands preview · EthSL review pending');
  const warning = element('p', 'Neutral hands only—not EthSL interpretation.'); warning.className = 'prototype-label';
  const canvasHost = element('div'); canvasHost.className = 'avatar-canvas';
  const interpretation = element('video'); interpretation.className = 'interpreter-video';
  const clock = element('p', 'Video time 0:00'); clock.className = 'avatar-clock';
  const avatarStatus = element('p'); avatarStatus.setAttribute('role', 'status');
  const sizeHelp = element('p', 'Small preview: use landscape or a larger display for detailed handshape review. Captions remain available.');
  sizeHelp.className = 'hands-size-help';
  panel.append(title, warning, canvasHost, interpretation, clock, avatarStatus, sizeHelp);
  stage.append(videoColumn, signPanel);
  if (showSigningPreview) stage.append(panel);
  const controls = element('div'); controls.className = 'media-options';
  const controlsTitle = element('h3', 'Video accessibility'); controlsTitle.className = 'media-options-title';
  const optionsCard = (heading: string) => {
    const card = element('section'); card.className = 'media-option-card';
    const title = element('h4', heading); card.append(title);
    return card;
  };
  const captionLabel = element('label', 'Captions'); const captionSelect = element('select');
  captionSelect.dataset.captionLanguage = '';
  const off = element('option', 'Off'); off.value = 'off'; captionSelect.append(off);
  for (const definition of definitions) { const option = element('option', definition.label); option.value = optionValue(definition.language); captionSelect.append(option); }
  captionLabel.append(captionSelect);
  const sizeLabel = element('label', 'Caption size'); const size = element('select');
  for (const [value, label] of [['1', 'Standard'], ['1.25', 'Large'], ['1.5', 'Extra large']]) {
    const option = element('option', label); option.value = value; size.append(option);
  }
  sizeLabel.append(size);
  const appearanceLabel = element('label', 'Caption appearance');
  const appearance = element('select');
  for (const [value, label] of [['default', 'Default'], ['dark', 'White on black'], ['yellow', 'Yellow on black']]) {
    const option = element('option', label); option.value = value; appearance.append(option);
  }
  appearanceLabel.append(appearance);
  const reset = element('button', 'Reset caption preferences'); reset.type = 'button';
  const offlineVideo = element('a', 'Download video with captions');
  offlineVideo.className = 'media-option-download';
  const setOfflineEdition = (described: boolean) => {
    const path = described ? media.offline_described_src : media.offline_video_src;
    offlineVideo.hidden = !path;
    if (path) offlineVideo.href = resource(path);
    offlineVideo.textContent = described ? 'Download described video with captions' : 'Download video with captions';
  };
  setOfflineEdition(false);
  const preferenceStatus = element('p'); preferenceStatus.setAttribute('role', 'status');
  const preferenceKey = `access:${media.id}:media-preferences`;
  const savePreferences = () => {
    try { localStorage.setItem(preferenceKey, JSON.stringify({ captions: captionSelect.value, size: size.value, appearance: appearance.value })); } catch { /* Preferences remain usable for this session. */ }
  };
  const applyAppearance = () => {
    const foreground = appearance.value === 'yellow' ? '#ffff00' : '#ffffff';
    const background = appearance.value === 'default' ? '#14232c' : '#000000';
    view.style.setProperty('--caption-foreground', foreground);
    view.style.setProperty('--caption-background', background);
    view.style.setProperty('--caption-size', `${size.value}rem`);
  };
  appearance.addEventListener('change', () => { applyAppearance(); savePreferences(); });
  reset.addEventListener('click', () => {
    appearance.value = 'default'; size.value = '1'; captionSelect.value = 'off';
    captionSelect.dispatchEvent(new Event('change')); applyAppearance();
    resizePage(size.value);
    try { localStorage.removeItem(preferenceKey); } catch { /* Reset still applies to this session. */ }
    preferenceStatus.textContent = 'Caption preferences reset.';
  });
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    const savedLanguage = saved.captions === 'on' ? optionValue('en') : saved.captions;
    if (definitions.some(track => optionValue(track.language) === savedLanguage) || savedLanguage === 'off') captionSelect.value = savedLanguage;
    if (['1', '1.25', '1.5'].includes(saved.size)) size.value = saved.size;
    if (['default', 'dark', 'yellow'].includes(saved.appearance)) appearance.value = saved.appearance;
    applyAppearance();
  } catch { /* Ignore corrupt or blocked local preferences. */ }
  resizePage(size.value);
  const descriptionToggle = element('button', 'Use audio-described video'); descriptionToggle.type = 'button';
  descriptionToggle.hidden = !media.described_src;
  descriptionToggle.setAttribute('aria-pressed', 'false');
  const descriptionStatus = element('p'); descriptionStatus.setAttribute('role', 'status');
  const signToggle = element('button', 'Show EthSL interpretation'); signToggle.type = 'button';
  signToggle.setAttribute('aria-pressed', 'false');
  const signDockLabel = element('label', 'Interpreter position'); const signDock = element('select');
  for (const [value, label] of [['beside', 'Beside video'], ['below', 'Below video']]) { const option = element('option', label); option.value = value; signDock.append(option); }
  signDockLabel.append(signDock); signDockLabel.hidden = true;
  const signSizeLabel = element('label', 'Interpreter size'); const signSize = element('select');
  for (const [value, label] of [['220', 'Compact'], ['300', 'Standard'], ['380', 'Large']]) { const option = element('option', label); option.value = value; signSize.append(option); }
  signSize.value = '300'; signSizeLabel.append(signSize); signSizeLabel.hidden = true;
  const toggle = element('button', 'Show 3D hands preview'); toggle.type = 'button'; toggle.setAttribute('aria-pressed', 'false');
  const dockLabel = element('label', 'Signing panel position'); const dock = element('select');
  for (const [value, label] of [['beside', 'Beside video'], ['below', 'Below video']]) {
    const option = element('option', label); option.value = value; dock.append(option);
  }
  dockLabel.append(dock); dockLabel.hidden = true;
  const tools = element('details'); tools.append(element('summary', 'EthSL recording and review'));
  tools.append(element('p', 'Use a consented fluent EthSL recording and interpreter-approved phrases. No ASL, NGT, automatic fingerspelling or generated lesson gestures are used.'));
  const worksheet = element('button', 'Download caption-to-motion worksheet'); worksheet.type = 'button';
  const reviewLink = element('a', 'Review the hands rig and local EthSL clips'); reviewLink.href = new URL('/demo/avatar-review', base).href;
  tools.append(worksheet, element('br'), reviewLink);
  const note = element('p'); note.className = 'note';
  note.setAttribute('role', 'status');
  const lowData = element('details'); lowData.append(element('summary', 'Low-data audio and offline media'));
  const lowDataList = element('ul');
  for (const [path, label] of [[media.audio_src, 'Download audio only · 48 kbps'], [media.described_audio_src, 'Download described audio · 48 kbps']] as const) {
    if (!path) continue; const item = element('li'); const link = element('a', label); link.href = resource(path); link.setAttribute('download', ''); item.append(link); lowDataList.append(item);
  }
  lowData.append(lowDataList, element('p', 'Audio-only files reduce data use. File sizes are also shown in the offline download list.'));

  const captionCard = optionsCard('Read along'); captionCard.classList.add('caption-card');
  const captionFields = element('div'); captionFields.className = 'media-option-fields';
  captionFields.append(captionLabel, sizeLabel, appearanceLabel);
  reset.className = 'media-option-reset';
  preferenceStatus.className = 'media-option-status';
  const captionActions = element('div'); captionActions.className = 'media-caption-actions';
  captionActions.append(offlineVideo, reset);
  captionCard.append(captionFields, captionActions, preferenceStatus);

  controls.append(controlsTitle, captionCard);
  if (media.described_src || lowDataList.children.length) {
    const audioCard = optionsCard('Audio options');
    descriptionStatus.className = 'media-option-status';
    descriptionToggle.className = 'media-option-action';
    audioCard.append(descriptionToggle, descriptionStatus);
    if (lowDataList.children.length) audioCard.append(lowData);
    controls.append(audioCard);
  }

  const signCard = optionsCard('Ethiopian Sign Language');
  const signFields = element('div'); signFields.className = 'media-option-fields';
  signFields.append(signDockLabel, signSizeLabel);
  signToggle.className = 'media-option-action';
  toggle.className = 'media-option-action';
  if (signSource) signCard.append(signToggle, signFields);
  else signCard.append(element('p', 'Reviewed EthSL interpretation is unavailable for this lesson.'));
  if (showSigningPreview) signCard.append(toggle, dockLabel, tools);
  controls.append(signCard);
  let demoController: AbortController | undefined;
  if (options.aslDemo) {
    const demo = element('aside');
    demo.className = 'avatar-panel';
    demo.setAttribute('aria-label', 'Signing avatar');
    const label = element('label', 'Avatar language');
    const language = element('select');
    language.append(new Option('Ethiopian Sign Language (EthSL)', 'ethsl'), new Option('American Sign Language (ASL)', 'asl'), new Option('Off', 'off'));
    label.append(language);
    const canvas = element('div'); canvas.className = 'avatar-canvas';
    const message = element('p'); message.setAttribute('role', 'status');
    const description = element('p');
    demo.append(label, description, canvas, message);
    stage.append(demo);
    const loadPreview = () => {
      demoController?.abort();
      const selected = language.value;
      canvas.hidden = selected === 'off';
      description.hidden = canvas.hidden;
      message.textContent = '';
      if (selected !== 'asl' && selected !== 'ethsl') return;
      description.textContent = selected === 'ethsl'
        ? 'EthSL concept draft · I, you and we in selected passages. Fluent review pending.'
        : 'This draft animates selected concepts from the captions. A fluent ASL reviewer has yet to verify the signing.';
      const controller = new AbortController();
      demoController = controller;
      message.textContent = 'Loading avatar…';
      void import('./sign-demo').then(async ({ mountSignDemo }) => {
        if (controller.signal.aborted) return;
        await mountSignDemo(canvas, video, base, segments, selected, controller.signal);
        if (!controller.signal.aborted) message.textContent = '';
      }).catch(() => {
        if (!controller.signal.aborted) message.textContent = 'The avatar could not load. Use the lesson captions or transcript.';
      });
    };
    language.addEventListener('change', loadPreview);
    loadPreview();
  }
  view.append(stage, controls, note);
  let avatar: TimingAvatar | undefined;
  let manifest: SigningManifest | undefined;
  let active = false;
  let disposed = false;
  let animation = 0;
  let generation = 0;
  let signingController: AbortController | undefined;
  let worksheetUrl: string | undefined;
  let described = false;
  const activeCue = () => segments.find(segment => segment.start !== undefined && segment.end !== undefined && video.currentTime >= segment.start && video.currentTime < segment.end);
  const captionText = () => {
    const index = definitions.findIndex(definition => optionValue(definition.language) === captionSelect.value);
    const activeCues = index >= 0 ? video.textTracks[index]?.activeCues : null;
    const selected = Array.from(activeCues || []).find(candidate => video.currentTime >= candidate.startTime && video.currentTime < candidate.endTime) as VTTCue | undefined;
    return selected?.getCueAsHTML().textContent;
  };
  let unavailable = false;
  const signedVideo = new InterpreterVideo(interpretation, base, () => { video.pause(); update(); });
  const status = (message: string) => { if (avatarStatus.textContent !== message) avatarStatus.textContent = message; };
  const update = () => {
    if (disposed) return;
    const segment = activeCue();
    const phrase = manifest?.segments.find(item => video.currentTime >= item.start && video.currentTime < item.end);
    cue.textContent = captionText() || (legacyCaptionValue && !described && captionSelect.value === 'on' ? segment?.text : '') || '';
    clock.textContent = `Video time ${Math.floor(video.currentTime / 60)}:${String(Math.floor(video.currentTime % 60)).padStart(2, '0')}`;
    panel.dataset.videoTime = String(video.currentTime); panel.dataset.cueId = segment?.id || '';
    if (!active) return;
    const reviewed = avatar?.update(video.currentTime, Boolean(segment));
    const hasVideo = phrase?.status === 'approved' && phrase.presentation === 'interpreter-video' && Boolean(phrase.interpreter_video);
    canvasHost.hidden = hasVideo;
    if (hasVideo && phrase) {
      void signedVideo.select(phrase);
      signedVideo.update(video.currentTime, video.paused || video.seeking || video.readyState < 3 || document.hidden, video.playbackRate);
      title.textContent = 'Reviewed EthSL interpreter video';
      warning.textContent = 'The full signed performance preserves non-manual grammar and visible contact points.';
      panel.dataset.reviewStatus = signedVideo.state === 'ready' ? 'approved-video' : 'unavailable';
      status(signedVideo.state === 'ready' ? `Reviewed interpreter video · ${phrase.id}` : signedVideo.state === 'loading'
        ? 'Loading reviewed interpreter video…' : 'EthSL video unavailable or buffering. Playback paused; use captions/transcript or resume when ready.');
    } else {
      if (interpretation.hasAttribute('src') || signedVideo.state !== 'unavailable') signedVideo.clear();
      if (reviewed) {
        title.textContent = 'Reviewed EthSL · hands-only';
        warning.textContent = 'Exact rendered revision reviewed by a Deaf EthSL reviewer and interpreter.';
        panel.dataset.reviewStatus = 'approved';
        status(`EthSL reviewed hands-only motion · ${reviewed.id}`);
      } else {
        title.textContent = '3D hands preview · EthSL review pending';
        warning.textContent = 'Neutral hands only—not EthSL interpretation. Approved sequences hide hands in gaps.';
        panel.dataset.reviewStatus = 'awaiting-recording';
        status(unavailable ? '3D preview or reviewed signing assets unavailable. Use captions and transcript.' : 'EthSL interpretation unavailable for this segment. Use captions and transcript.');
      }
    }
  };
  const animate = () => {
    cancelAnimationFrame(animation); update();
    if (!disposed && active && !video.paused && !document.hidden) animation = requestAnimationFrame(animate);
  };
  const visibility = () => { cancelAnimationFrame(animation); if (!document.hidden) animate(); else { interpretation.pause(); signVideo.pause(); } };
  for (const event of ['timeupdate', 'seeking', 'seeked', 'ratechange', 'ended', 'waiting', 'playing', 'canplay']) video.addEventListener(event, update);
  for (const event of ['loadedmetadata', 'canplay']) interpretation.addEventListener(event, update);
  video.addEventListener('play', () => {
    animate();
    if (!signPanel.hidden && signSource) {
      signVideo.currentTime = video.currentTime; signVideo.playbackRate = video.playbackRate;
      void signVideo.play().catch(() => { video.pause(); signStatus.textContent = 'Interpretation could not resume. Both videos were paused.'; });
    }
  });
  video.addEventListener('pause', () => { cancelAnimationFrame(animation); signVideo.pause(); update(); });
  video.addEventListener('ratechange', () => { signVideo.playbackRate = video.playbackRate; });
  video.addEventListener('seeking', () => { if (signSource) signVideo.currentTime = video.currentTime; });
  video.addEventListener('error', () => { note.textContent = 'Video unavailable. Try reloading the lesson or use the transcript below.'; });
  tracks.forEach(track => track.addEventListener('error', () => { note.textContent = 'A caption file is unavailable. Use the timestamped transcript below while we restore it.'; }));
  signVideo.addEventListener('waiting', () => { video.pause(); signStatus.textContent = 'Interpretation is buffering. The lesson video was paused to keep both synchronized.'; });
  signVideo.addEventListener('timeupdate', () => { if (!video.paused && Math.abs(signVideo.currentTime - video.currentTime) > .25) signVideo.currentTime = video.currentTime; });
  document.addEventListener('visibilitychange', visibility);
  const syncNativeTrackModes = () => {
    definitions.forEach((definition, index) => {
      const textTrack = video.textTracks[index];
      if (!textTrack) return;
      const mode = optionValue(definition.language) === captionSelect.value ? 'hidden' : 'disabled';
      if (textTrack.mode !== mode) textTrack.mode = mode;
    });
  };
  const applyCaptionSelection = () => {
    syncNativeTrackModes();
    cue.hidden = captionSelect.value === 'off';
    const definition = definitions.find(item => optionValue(item.language) === captionSelect.value);
    cue.lang = definition?.language || '';
    preferenceStatus.textContent = definition?.status.includes('pending') ? `${definition.label}. Human review is pending.` : '';
    savePreferences(); update();
  };
  captionSelect.addEventListener('change', () => {
    applyCaptionSelection();
    const definition = definitions.find(item => optionValue(item.language) === captionSelect.value);
    if (definition) options.onCaptionLanguage(definition.language);
  });
  video.textTracks.addEventListener('change', syncNativeTrackModes);
  tracks.forEach((_track, index) => video.textTracks[index]?.addEventListener('cuechange', update));
  size.addEventListener('change', () => { applyAppearance(); savePreferences(); resizePage(size.value); });
  descriptionToggle.addEventListener('click', () => {
    described = !described; video.pause(); signVideo.pause();
    setOfflineEdition(described);
    video.src = resource(described ? media.described_src! : media.src);
    tracks.forEach((track, index) => {
      track.src = resource(described && index === 0 && media.described_captions ? media.described_captions : definitions[index].src);
      const option = captionSelect.options[index + 1]; if (option) option.disabled = described && index > 0;
    });
    if (described && captionSelect.value !== optionValue(definitions[0].language)) captionSelect.value = 'off';
    applyCaptionSelection(); video.load();
    descriptionToggle.setAttribute('aria-pressed', String(described));
    descriptionToggle.textContent = described ? 'Use standard video' : 'Use audio-described video';
    descriptionStatus.textContent = described
      ? 'Audio-described video selected. It uses an extended timeline and restarts from the beginning. English captions are available.'
      : 'Standard video selected and restarted from the beginning.';
    if (described && !signPanel.hidden) signToggle.click();
    signToggle.disabled = described;
    if (described && active) toggle.click();
    toggle.disabled = described;
    onEditionChange(described);
  });
  signToggle.addEventListener('click', () => {
    const showing = signPanel.hidden;
    signPanel.hidden = !showing; signDockLabel.hidden = !showing; signSizeLabel.hidden = !showing;
    signToggle.setAttribute('aria-pressed', String(showing));
    signToggle.textContent = showing ? 'Hide EthSL interpretation' : 'Show EthSL interpretation';
    signStatus.textContent = showing ? 'Reviewed interpreter recording selected.' : '';
    if (showing) { signVideo.currentTime = video.currentTime; signVideo.playbackRate = video.playbackRate; if (!video.paused) void signVideo.play(); }
    else signVideo.pause();
  });
  signDock.addEventListener('change', () => { stage.classList.toggle('sign-below', signDock.value === 'below'); });
  signSize.addEventListener('change', () => { signPanel.style.flexBasis = `${signSize.value}px`; });
  applyCaptionSelection();
  dock.addEventListener('change', () => { stage.classList.toggle('avatar-below', dock.value === 'below'); });
  worksheet.addEventListener('click', () => {
    if (worksheetUrl) URL.revokeObjectURL(worksheetUrl);
    const draft = { schema_version: '1.0', media_id: media.id, target_sign_language: 'ethsl',
      review_status: 'awaiting-translation-and-recording', rig_version: 'access-hands-v1',
      cues: segments.map(segment => ({ id: segment.id, cue_ids: [segment.id], start: segment.start, end: segment.end,
        source_text: segment.text, presentation: 'pending', approved_phrase: null, motion: null, interpreter_video: null })) };
    worksheetUrl = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const link = element('a'); link.href = worksheetUrl; link.download = `${media.id}-ethsl-motion-worksheet.json`; link.click();
  });
  toggle.addEventListener('click', async () => {
    active = !active;
    const attempt = ++generation;
    panel.hidden = !active; dockLabel.hidden = !active;
    toggle.setAttribute('aria-pressed', String(active));
    toggle.textContent = active ? 'Hide 3D hands preview' : 'Show 3D hands preview';
    if (!active) { signingController?.abort(); signedVideo.clear(); cancelAnimationFrame(animation); avatar?.dispose(); avatar = undefined; return; }
    status('Loading 3D hands preview…');
    const controller = new AbortController(); signingController = controller;
    unavailable = false; manifest = undefined;
    try {
      const videoUrl = new URL(media.src, base);
      const url = new URL(videoUrl.href.replace('/media/video', '/signing-manifest')); url.searchParams.set('lang', 'ethsl');
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('Signing unavailable');
      const candidate = await response.json();
      if (disposed || !active || attempt !== generation) return;
      if (candidate.schema_version !== '1.0' || candidate.language !== 'ethsl' || candidate.media_id !== media.id ||
        candidate.lesson_id !== videoUrl.pathname.split('/').at(-3) ||
        candidate.content_version !== Number(videoUrl.searchParams.get('version')) || !Array.isArray(candidate.segments)) throw new Error('Signing context mismatch');
      manifest = candidate;
      const { TimingAvatar } = await import('./timing-avatar');
      if (disposed || !active || attempt !== generation) return;
      avatar = new TimingAvatar(canvasHost);
      await avatar.setManifest(candidate, base, controller.signal);
      if (disposed || !active || attempt !== generation) return;
    } catch {
      if (disposed || !active || attempt !== generation) return;
      avatar?.clearSigning();
      unavailable = true;
    }
    animate();
    notify({ mediaId: media.id, mode: 'hands-only', signLanguage: 'ethsl', status: 'preview' });
  });
  return {
    view,
    seek(time: number) { video.currentTime = Math.max(0, time); update(); },
    dispose() {
      demoController?.abort();
      disposed = true; generation++; cancelAnimationFrame(animation); signingController?.abort(); signedVideo.clear();
      document.removeEventListener('visibilitychange', visibility);
      video.textTracks.removeEventListener('change', syncNativeTrackModes);
      video.pause(); video.removeAttribute('src'); video.load(); avatar?.dispose();
      if (worksheetUrl) URL.revokeObjectURL(worksheetUrl);
    },
  };
}
