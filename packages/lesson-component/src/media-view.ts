import type { TimingAvatar } from './timing-avatar';

export interface TimedSegment { id: string; heading: string; text: string; start?: number; end?: number }
export interface CaptionTrack { language: 'en' | 'am' | 'ti'; label: string; src: string; status: string }
export interface LessonMedia {
  id: string; src: string; captions: string; duration: number; avatar_mode: string;
  caption_tracks?: CaptionTrack[]; described_src?: string; described_captions?: string;
  audio_src?: string; described_audio_src?: string; sign_src?: string; sign_status?: string;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createMediaView(media: LessonMedia, segments: TimedSegment[], base: URL, notify: (detail: Record<string, unknown>) => void) {
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
  const tracks = definitions.map((definition, index) => {
    const track = element('track'); track.kind = 'captions'; track.label = definition.label; track.srclang = definition.language;
    track.src = resource(definition.src); track.default = index === 0; video.append(track); return track;
  });
  const videoColumn = element('div'); videoColumn.className = 'video-column'; videoColumn.append(video);
  const cue = element('p', 'Captions will follow the video.'); cue.className = 'active-caption';
  cue.setAttribute('aria-label', 'Current caption');
  videoColumn.append(cue);
  const signPanel = element('aside'); signPanel.className = 'sign-panel'; signPanel.hidden = true;
  signPanel.setAttribute('aria-label', 'Ethiopian Sign Language interpretation');
  const signTitle = element('h3', 'Ethiopian Sign Language');
  const signStatus = element('p'); signStatus.setAttribute('role', 'status');
  const signVideo = element('video'); signVideo.muted = true; signVideo.playsInline = true; signVideo.preload = 'metadata';
  signVideo.setAttribute('aria-label', 'Ethiopian Sign Language interpretation video');
  if (media.sign_src) signVideo.src = resource(media.sign_src);
  signPanel.append(signTitle);
  if (media.sign_src) signPanel.append(signVideo);
  signPanel.append(signStatus);
  const panel = element('aside'); panel.className = 'avatar-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', '3D avatar timing prototype');
  const title = element('h3', '3D timing prototype');
  const warning = element('p', 'Ethiopian Sign Language review pending. Procedural motions demonstrate timing only.'); warning.className = 'prototype-label';
  const canvasHost = element('div'); canvasHost.className = 'avatar-canvas';
  const clock = element('p', 'Video time 0:00'); clock.className = 'avatar-clock';
  const avatarStatus = element('p'); avatarStatus.setAttribute('role', 'status');
  panel.append(title, warning, canvasHost, clock, avatarStatus);
  stage.append(videoColumn, signPanel, panel);
  const controls = element('div'); controls.className = 'media-options';
  const captionLabel = element('label', 'Captions'); const captionSelect = element('select');
  for (const definition of definitions) { const option = element('option', definition.label); option.value = optionValue(definition.language); captionSelect.append(option); }
  const off = element('option', 'Off'); off.value = 'off'; captionSelect.append(off);
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
    appearance.value = 'default'; size.value = '1'; captionSelect.value = optionValue(definitions[0].language);
    captionSelect.dispatchEvent(new Event('change')); applyAppearance();
    try { localStorage.removeItem(preferenceKey); } catch { /* Reset still applies to this session. */ }
    preferenceStatus.textContent = 'Caption preferences reset.';
  });
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    if (definitions.some(track => optionValue(track.language) === saved.captions) || saved.captions === 'off') captionSelect.value = saved.captions;
    if (['1', '1.25', '1.5'].includes(saved.size)) size.value = saved.size;
    if (['default', 'dark', 'yellow'].includes(saved.appearance)) appearance.value = saved.appearance;
    applyAppearance();
  } catch { /* Ignore corrupt or blocked local preferences. */ }
  const descriptionToggle = element('button', 'Use audio-described video'); descriptionToggle.type = 'button';
  descriptionToggle.hidden = !media.described_src;
  descriptionToggle.setAttribute('aria-pressed', 'false');
  const descriptionStatus = element('p'); descriptionStatus.setAttribute('role', 'status');
  const signToggle = element('button', media.sign_src ? 'Show EthSL interpretation' : 'EthSL recording awaiting review'); signToggle.type = 'button';
  signToggle.disabled = !media.sign_src;
  signToggle.setAttribute('aria-pressed', 'false');
  const signDockLabel = element('label', 'Interpreter position'); const signDock = element('select');
  for (const [value, label] of [['beside', 'Beside video'], ['below', 'Below video']]) { const option = element('option', label); option.value = value; signDock.append(option); }
  signDockLabel.append(signDock); signDockLabel.hidden = true;
  const signSizeLabel = element('label', 'Interpreter size'); const signSize = element('select');
  for (const [value, label] of [['220', 'Compact'], ['300', 'Standard'], ['380', 'Large']]) { const option = element('option', label); option.value = value; signSize.append(option); }
  signSize.value = '300'; signSizeLabel.append(signSize); signSizeLabel.hidden = true;
  const toggle = element('button', 'Show 3D timing prototype'); toggle.type = 'button'; toggle.setAttribute('aria-pressed', 'false');
  const dockLabel = element('label', 'Avatar position'); const dock = element('select');
  const languageLabel = element('label', 'Avatar sign language');
  const language = element('select');
  for (const [value, label] of [['ethsl', 'Ethiopian Sign Language'], ['asl', 'American Sign Language (ASL)']]) {
    const option = element('option', label); option.value = value; language.append(option);
  }
  languageLabel.append(language);
  const generate = element('button', 'Generate avatar preview'); generate.type = 'button';
  for (const [value, label] of [['beside', 'Beside video'], ['below', 'Below video']]) {
    const option = element('option', label); option.value = value; dock.append(option);
  }
  dockLabel.append(dock); dockLabel.hidden = true;
  controls.append(captionLabel, sizeLabel, appearanceLabel, reset, descriptionToggle, signToggle, signDockLabel, signSizeLabel, languageLabel, generate, toggle, dockLabel);
  const tools = element('details');
  tools.append(element('summary', 'Free sign-motion authoring tools'));
  tools.append(element('p', 'Performs is a free MIT-licensed renderer for authored sign motions. Create and review language-specific clips before using them for this lesson.'));
  const worksheet = element('button', 'Download caption-to-motion worksheet'); worksheet.type = 'button';
  const openEditor = element('button', 'Load free Performs workspace'); openEditor.type = 'button';
  const editorStatus = element('p'); editorStatus.setAttribute('role', 'status');
  const editorHost = element('div');
  const fallback = element('a', 'Open Performs in a separate tab');
  fallback.href = 'https://performs.gti.upf.edu/'; fallback.target = '_blank'; fallback.rel = 'noopener noreferrer';
  const captureEditor = element('a', 'Open Animics video-to-motion editor');
  captureEditor.href = 'https://animics.gti.upf.edu/'; captureEditor.target = '_blank'; captureEditor.rel = 'noopener noreferrer';
  const captureHelp = element('p'); captureHelp.append(captureEditor);
  const reviewLink = element('a', 'Review local draft avatar motion');
  reviewLink.href = new URL('/demo/avatar-review', base).href;
  const reviewHelp = element('p'); reviewHelp.append(reviewLink);
  tools.append(worksheet, openEditor, editorStatus, editorHost, fallback, captureHelp, reviewHelp);
  const note = element('p', 'Source captions need wording and timing review. The 3D prototype is awaiting EthSL motion authoring and Deaf review.'); note.className = 'note';
  const mediaStatus = element('div'); mediaStatus.append(preferenceStatus, descriptionStatus);
  const lowData = element('details'); lowData.append(element('summary', 'Low-data audio and offline media'));
  const lowDataList = element('ul');
  for (const [path, label] of [[media.audio_src, 'Download audio only · 48 kbps'], [media.described_audio_src, 'Download described audio · 48 kbps']] as const) {
    if (!path) continue; const item = element('li'); const link = element('a', label); link.href = resource(path); link.setAttribute('download', ''); item.append(link); lowDataList.append(item);
  }
  lowData.append(lowDataList, element('p', 'Audio-only files reduce data use. File sizes are also shown in the offline download list.'));
  view.append(stage, controls, mediaStatus, note, lowData, tools);
  let avatar: TimingAvatar | undefined;
  let active = false;
  let disposed = false;
  let animation = 0;
  let generation = 0;
  let signingController: AbortController | undefined;
  let worksheetUrl: string | undefined;
  const languageName = () => language.value === 'asl' ? 'ASL' : 'EthSL';
  const updateLanguage = () => {
    const fullName = language.value === 'asl' ? 'American Sign Language' : 'Ethiopian Sign Language';
    warning.textContent = `${fullName} review pending. Procedural motions demonstrate timing only.`;
    avatarStatus.textContent = active ? `Timing preview ready. ${languageName()} review pending.` : `${languageName()} selected. Reviewed lesson motions are awaiting authoring.`;
    panel.dataset.signLanguage = language.value;
  };
  const loadSigning = async () => {
    signingController?.abort();
    const controller = new AbortController(); signingController = controller;
    const currentAvatar = avatar;
    if (!currentAvatar) return;
    currentAvatar.clearSigning();
    panel.dataset.reviewStatus = 'awaiting-recording';
    try {
      const videoUrl = new URL(media.src, base);
      const url = new URL(videoUrl.href.replace('/media/video', '/signing-manifest'));
      url.searchParams.set('lang', language.value);
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Signing manifest unavailable');
      const manifest = await response.json();
      if (controller.signal.aborted || avatar !== currentAvatar) return;
      if (manifest.schema_version !== '1.0' || manifest.language !== language.value || manifest.media_id !== media.id || manifest.content_version !== Number(videoUrl.searchParams.get('version'))) throw new Error('Signing context mismatch');
      await currentAvatar.setManifest(manifest, base, controller.signal);
    } catch {
      if (!controller.signal.aborted && active) avatarStatus.textContent = 'Reviewed signing assets unavailable. Timing preview remains available.';
    }
  };
  language.addEventListener('change', () => { updateLanguage(); void loadSigning(); });
  generate.addEventListener('click', () => { if (!active) toggle.click(); else updateLanguage(); });
  worksheet.addEventListener('click', () => {
    if (worksheetUrl) URL.revokeObjectURL(worksheetUrl);
    const draft = {
      schema_version: '1.0', media_id: media.id,
      source_language: 'en', target_sign_language: language.value,
      review_status: 'awaiting-translation-and-motion-authoring',
      character: 'African woman',
      cues: segments.map(segment => ({ id: segment.id, start: segment.start, end: segment.end, source_text: segment.text, approved_gloss: null, motion_asset: null, non_manual_features: null })),
    };
    worksheetUrl = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const link = element('a'); link.href = worksheetUrl; link.download = `${media.id}-${language.value}-motion-worksheet.json`;
    link.click();
  });
  openEditor.addEventListener('click', () => {
    const existing = editorHost.querySelector('iframe');
    if (existing) { existing.remove(); openEditor.textContent = 'Load free Performs workspace'; editorStatus.textContent = ''; return; }
    const frame = element('iframe');
    frame.title = 'Performs free sign-motion authoring workspace';
    frame.src = 'https://performs.gti.upf.edu/?controls=true&autoplay=false';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');
    frame.style.cssText = 'width:100%;height:520px;border:1px solid #718d90;border-radius:.4rem;margin-block:1rem;';
    editorHost.append(frame);
    openEditor.textContent = 'Close Performs workspace';
    editorStatus.textContent = 'External workspace requires internet. If loading is blocked, use the separate-tab link. Import authored clips or SiGML/BML in Performs.';
  });
  const activeCue = () => segments.find(segment => segment.start !== undefined && segment.end !== undefined && video.currentTime >= segment.start && video.currentTime < segment.end);
  const captionText = () => {
    const index = definitions.findIndex(definition => optionValue(definition.language) === captionSelect.value);
    const activeCues = index >= 0 ? video.textTracks[index]?.activeCues : null;
    const selected = activeCues?.[0] as VTTCue | undefined;
    return selected?.text;
  };
  const update = () => {
    if (disposed) return;
    const segment = activeCue();
    cue.textContent = captionText() || segment?.text || 'Captions will follow the video.';
    clock.textContent = `Video time ${Math.floor(video.currentTime / 60)}:${String(Math.floor(video.currentTime % 60)).padStart(2, '0')}`;
    panel.dataset.videoTime = String(video.currentTime);
    panel.dataset.cueId = segment?.id || '';
    const reviewed = avatar?.update(video.currentTime, Boolean(segment));
    if (reviewed) {
      avatarStatus.textContent = `${languageName()} reviewed motion · ${reviewed.id}`;
      warning.textContent = 'Interpreter-recorded motion with source-bound review.';
      panel.dataset.reviewStatus = 'approved';
    } else if (panel.dataset.reviewStatus === 'approved') {
      panel.dataset.reviewStatus = 'awaiting-recording'; updateLanguage();
    }
  };
  const animate = () => {
    cancelAnimationFrame(animation);
    update();
    if (!disposed && active && !video.paused && !document.hidden) animation = requestAnimationFrame(animate);
  };
  const visibility = () => { cancelAnimationFrame(animation); if (!document.hidden) animate(); };
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', update);
  video.addEventListener('play', () => {
    animate();
    if (!signPanel.hidden && media.sign_src) {
      signVideo.currentTime = video.currentTime; signVideo.playbackRate = video.playbackRate;
      void signVideo.play().catch(() => { video.pause(); signStatus.textContent = 'Interpretation could not resume. Both videos were paused.'; });
    }
  });
  video.addEventListener('pause', () => { cancelAnimationFrame(animation); signVideo.pause(); update(); });
  video.addEventListener('ratechange', () => { signVideo.playbackRate = video.playbackRate; });
  video.addEventListener('seeking', () => { if (media.sign_src) signVideo.currentTime = video.currentTime; });
  video.addEventListener('error', () => { note.textContent = 'Video unavailable. Try reloading the lesson or use the transcript below.'; });
  tracks.forEach(track => track.addEventListener('error', () => { note.textContent = 'A caption file is unavailable. Use the timestamped transcript below while we restore it.'; }));
  signVideo.addEventListener('waiting', () => { video.pause(); signStatus.textContent = 'Interpretation is buffering. The lesson video was paused to keep both synchronized.'; });
  signVideo.addEventListener('timeupdate', () => { if (!video.paused && Math.abs(signVideo.currentTime - video.currentTime) > .25) signVideo.currentTime = video.currentTime; });
  document.addEventListener('visibilitychange', visibility);
  const applyCaptionSelection = () => {
    definitions.forEach((definition, index) => { if (video.textTracks[index]) video.textTracks[index].mode = optionValue(definition.language) === captionSelect.value ? 'showing' : 'hidden'; });
    cue.hidden = captionSelect.value === 'off';
    const definition = definitions.find(item => optionValue(item.language) === captionSelect.value);
    preferenceStatus.textContent = definition?.status.includes('pending') ? `${definition.label}. Human review is pending.` : '';
    savePreferences(); update();
  };
  captionSelect.addEventListener('change', applyCaptionSelection);
  tracks.forEach((_track, index) => video.textTracks[index]?.addEventListener('cuechange', update));
  size.addEventListener('change', () => { applyAppearance(); savePreferences(); });
  let described = false;
  descriptionToggle.addEventListener('click', () => {
    described = !described; video.pause(); signVideo.pause();
    video.src = resource(described ? media.described_src! : media.src);
    tracks.forEach((track, index) => {
      track.src = resource(described && index === 0 && media.described_captions ? media.described_captions : definitions[index].src);
      const option = captionSelect.options[index]; if (option) option.disabled = described && index > 0;
    });
    if (described) captionSelect.value = optionValue(definitions[0].language);
    applyCaptionSelection(); video.load();
    descriptionToggle.setAttribute('aria-pressed', String(described));
    descriptionToggle.textContent = described ? 'Use standard video' : 'Use audio-described video';
    descriptionStatus.textContent = described
      ? 'Audio-described video selected. It uses an extended timeline and restarts from the beginning. English captions are available.'
      : 'Standard video selected and restarted from the beginning.';
    if (described && !signPanel.hidden) signToggle.click();
    signToggle.disabled = described || !media.sign_src;
  });
  signToggle.addEventListener('click', () => {
    const showing = signPanel.hidden;
    signPanel.hidden = !showing; signDockLabel.hidden = !showing; signSizeLabel.hidden = !showing;
    signToggle.setAttribute('aria-pressed', String(showing));
    signToggle.textContent = showing ? 'Hide EthSL interpretation' : 'Show EthSL interpretation';
    signStatus.textContent = showing ? 'Interpreter recording loaded. Deaf reviewer approval is pending.' : '';
    if (showing) { signVideo.currentTime = video.currentTime; signVideo.playbackRate = video.playbackRate; if (!video.paused) void signVideo.play(); }
    else signVideo.pause();
  });
  signDock.addEventListener('change', () => { stage.classList.toggle('sign-below', signDock.value === 'below'); });
  signSize.addEventListener('change', () => { signPanel.style.flexBasis = `${signSize.value}px`; });
  applyCaptionSelection();
  dock.addEventListener('change', () => { stage.classList.toggle('avatar-below', dock.value === 'below'); });
  toggle.addEventListener('click', async () => {
    active = !active;
    const attempt = ++generation;
    panel.hidden = !active; dockLabel.hidden = !active;
    toggle.setAttribute('aria-pressed', String(active));
    toggle.textContent = active ? 'Hide 3D timing prototype' : 'Show 3D timing prototype';
    if (!active) { signingController?.abort(); cancelAnimationFrame(animation); avatar?.dispose(); avatar = undefined; return; }
    avatarStatus.textContent = 'Loading 3D preview…';
    try {
      const { TimingAvatar } = await import('./timing-avatar');
      if (disposed || !active || attempt !== generation) return;
      avatar = new TimingAvatar(canvasHost);
      updateLanguage();
      await loadSigning();
      if (disposed || !active || attempt !== generation) return;
      animate();
    } catch {
      if (disposed || attempt !== generation) return;
      avatarStatus.textContent = '3D preview unavailable on this device. Hide and reopen to retry.';
    }
    notify({ mediaId: media.id, mode: media.avatar_mode, signLanguage: language.value, status: 'preview' });
  });
  return {
    view,
    seek(time: number) { video.currentTime = Math.min(Math.max(0, time), media.duration); update(); },
    dispose() {
      disposed = true; generation++; cancelAnimationFrame(animation);
      signingController?.abort();
      document.removeEventListener('visibilitychange', visibility);
      video.pause(); video.removeAttribute('src'); video.load(); avatar?.dispose();
      editorHost.replaceChildren();
      if (worksheetUrl) URL.revokeObjectURL(worksheetUrl);
    },
  };
}
