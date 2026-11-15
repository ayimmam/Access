import type { TimingAvatar } from './timing-avatar';
import type { SigningManifest } from './signing-player';
import { InterpreterVideo } from './interpreter-video';

export interface TimedSegment { id: string; heading: string; text: string; start?: number; end?: number }
export interface CaptionTrack { language: 'en' | 'am' | 'ti'; label: string; src: string | null; status: string }
export interface LessonMedia {
  id: string; src: string; captions: string | null; duration: number; avatar_mode: string; caption_status?: string;
  caption_tracks?: CaptionTrack[]; described_src?: string; described_captions?: string;
  described_caption_status?: string;
  described_duration?: number; described_segments?: TimedSegment[];
  offline_video_src?: string; offline_described_src?: string;
  audio_src?: string; described_audio_src?: string; sign_src?: string; sign_status?: string;
  download_bytes?: Record<string, number>;
}
interface MediaViewOptions { instanceKey?: string; reviewTools?: boolean }

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createMediaView(media: LessonMedia, segments: TimedSegment[], base: URL, notify: (detail: Record<string, unknown>) => void, resizePage: (size: string) => void, options: MediaViewOptions = {}) {
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
  const candidates = [...(media.caption_tracks?.length ? media.caption_tracks : [{ language: 'en' as const, label: 'English', src: media.captions, status: media.caption_status || 'source-draft' }])];
  const describedReviewed = Boolean(media.described_captions) && ['source-reviewed', 'human-reviewed'].includes(media.described_caption_status || 'review-pending');
  if (describedReviewed && !candidates.some(definition => definition.language === 'en')) candidates.push({ language: 'en', label: 'English · described edition only', src: null, status: 'review-pending' });
  const approved = (definition: CaptionTrack) => Boolean(definition.src) && ['source-reviewed', 'human-reviewed'].includes(definition.status);
  const definitions = candidates.filter(definition => approved(definition) || definition.language === 'en' && describedReviewed);
  let described = false;
  let activeSegments = segments;
  let activeDuration = media.duration;
  const reviewedSign = Boolean(media.sign_src) && media.sign_status === 'reviewed';
  const legacyCaptionValue = !media.caption_tracks?.length;
  const optionValue = (language: string) => legacyCaptionValue ? 'on' : language;
  const tracks = definitions.map(definition => {
    const track = element('track'); track.kind = 'captions'; track.label = definition.label; track.srclang = definition.language;
    if (definition.src && approved(definition)) track.src = resource(definition.src);
    video.append(track); return track;
  });
  const videoColumn = element('div'); videoColumn.className = 'video-column'; videoColumn.append(video);
  const cue = element('p'); cue.className = 'active-caption'; cue.lang = 'en';
  const captionStatus = element('p'); captionStatus.setAttribute('role', 'status'); captionStatus.className = 'media-option-status';
  videoColumn.append(cue);
  const signPanel = element('aside'); signPanel.className = 'sign-panel'; signPanel.hidden = true;
  signPanel.setAttribute('aria-label', 'Ethiopian Sign Language interpretation');
  const signTitle = element('h3', 'Ethiopian Sign Language');
  const signStatus = element('p'); signStatus.setAttribute('role', 'status');
  const signVideo = element('video'); signVideo.muted = true; signVideo.playsInline = true; signVideo.preload = 'metadata';
  signVideo.setAttribute('aria-label', 'Ethiopian Sign Language interpretation video');
  if (reviewedSign) signVideo.src = resource(media.sign_src!);
  signPanel.append(signTitle);
  if (reviewedSign) signPanel.append(signVideo);
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
  stage.append(videoColumn, signPanel, panel);
  const controls = element('div'); controls.className = 'media-options';
  const controlsTitle = element('h3', 'Video accessibility'); controlsTitle.className = 'media-options-title';
  const optionsCard = (heading: string) => {
    const card = element('section'); card.className = 'media-option-card';
    const title = element('h4', heading); card.append(title);
    return card;
  };
  const captionLabel = element('label', 'Captions'); const captionSelect = element('select');
  const off = element('option', 'Off'); off.value = 'off'; captionSelect.append(off);
  for (const definition of candidates) { const option = element('option', definition.label); option.value = optionValue(definition.language); option.disabled = !approved(definition); captionSelect.append(option); }
  captionLabel.append(captionSelect);
  const presentationLabel = element('label', 'Caption presentation'); const presentation = element('select');
  for (const [value, label] of [['inline', 'Below video'], ['native', 'On video (native captions)']]) {
    const option = element('option', label); option.value = value; presentation.append(option);
  }
  presentationLabel.append(presentation);
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
    const bytes = media.download_bytes?.[described ? 'offline_described_src' : 'offline_video_src'];
    offlineVideo.textContent = (described ? 'Download described video with captions' : 'Download video with captions') + (bytes ? ` (${new Intl.NumberFormat('en').format(bytes)} bytes)` : ' · size unavailable');
  };
  setOfflineEdition(false);
  const preferenceStatus = element('p'); preferenceStatus.setAttribute('role', 'status');
  const rememberLabel = element('label', 'Remember preferences on this device'); const remember = element('input'); remember.type = 'checkbox';
  remember.disabled = !options.instanceKey; rememberLabel.prepend(remember);
  const retention = element('p', options.instanceKey
    ? 'Optional: store these preferences until you turn off remember or reset. Avoid remembering on shared devices. Preferences are not sent to analytics.'
    : 'Preferences last only while this instance is open. This host has not assigned an identity for remembering settings.');
  retention.className = 'media-option-status';
  const preferenceKey = options.instanceKey ? `access:${options.instanceKey}:media-preferences` : undefined;
  const savePreferences = () => {
    if (!remember.checked || !preferenceKey) return;
    try { localStorage.setItem(preferenceKey, JSON.stringify({ remember: true, captions: captionSelect.value, size: size.value, appearance: appearance.value, presentation: presentation.value })); }
    catch { remember.checked = false; preferenceStatus.textContent = 'Device storage is unavailable. Preferences work only in this open instance.'; }
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
    appearance.value = 'default'; size.value = '1'; captionSelect.value = 'off'; presentation.value = 'inline'; remember.checked = false;
    captionSelect.dispatchEvent(new Event('change')); applyAppearance();
    resizePage(size.value);
    try { if (preferenceKey) localStorage.removeItem(preferenceKey); } catch {}
    preferenceStatus.textContent = 'Caption preferences reset.';
  });
  try {
    const saved = preferenceKey ? JSON.parse(localStorage.getItem(preferenceKey) || '{}') : {};
    if (saved?.remember === true) {
      remember.checked = true;
      if (definitions.some(track => optionValue(track.language) === saved.captions) || saved.captions === 'off') captionSelect.value = saved.captions;
      if (['1', '1.25', '1.5'].includes(saved.size)) size.value = saved.size;
      if (['default', 'dark', 'yellow'].includes(saved.appearance)) appearance.value = saved.appearance;
      if (['inline', 'native'].includes(saved.presentation)) presentation.value = saved.presentation;
    }
  } catch {}
  applyAppearance();
  remember.addEventListener('change', () => {
    if (remember.checked) savePreferences();
    else { try { if (preferenceKey) localStorage.removeItem(preferenceKey); } catch {} }
  });
  resizePage(size.value);
  const descriptionToggle = element('button', 'Use audio-described video'); descriptionToggle.type = 'button';
  descriptionToggle.hidden = !media.described_src;
  descriptionToggle.setAttribute('aria-pressed', 'false');
  const descriptionStatus = element('p'); descriptionStatus.setAttribute('role', 'status');
  const signToggle = element('button', reviewedSign ? 'Show EthSL interpretation' : 'EthSL recording awaiting review'); signToggle.type = 'button';
  signToggle.disabled = !reviewedSign;
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
  const note = element('p', 'Only reviewed caption tracks are published. Reviewed Amharic, EthSL and descriptive documents remain required where marked unavailable.'); note.className = 'note';
  const mediaStatus = element('p'); mediaStatus.setAttribute('role', 'status');
  const retryVideo = element('button', 'Retry video'); retryVideo.type = 'button'; retryVideo.hidden = true;
  retryVideo.addEventListener('click', () => { mediaStatus.textContent = 'Reloading video. The transcript stays available.'; video.load(); });
  const lowData = element('details'); lowData.append(element('summary', 'Low-data audio and offline media'));
  const lowDataList = element('ul');
  for (const [path, field, label] of [[media.audio_src, 'audio_src', 'Download audio only · 48 kbps'], [media.described_audio_src, 'described_audio_src', 'Download described audio · 48 kbps'], [media.src, 'src', 'Download standard video'], [media.described_src, 'described_src', 'Download described video']] as const) {
    if (!path) continue; const item = element('li'); const bytes = media.download_bytes?.[field];
    const link = element('a', label + (bytes ? ` (${new Intl.NumberFormat('en').format(bytes)} bytes)` : ' · size unavailable'));
    link.href = resource(path); link.setAttribute('download', ''); item.append(link); lowDataList.append(item);
  }
  lowData.append(lowDataList, element('p', 'Audio-only files reduce data use. Direct video files do not include external captions; use the captioned offline video when available.'));

  const captionCard = optionsCard('Read along'); captionCard.classList.add('caption-card');
  const captionFields = element('div'); captionFields.className = 'media-option-fields';
  captionFields.append(captionLabel, presentationLabel, sizeLabel, appearanceLabel);
  reset.className = 'media-option-reset';
  preferenceStatus.className = 'media-option-status';
  const captionActions = element('div'); captionActions.className = 'media-caption-actions';
  captionActions.append(offlineVideo, reset);
  captionCard.append(captionFields, element('p', 'For native fullscreen or mobile playback choose On video. Native caption appearance may follow your browser settings.'), captionActions, captionStatus, rememberLabel, retention, preferenceStatus);

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
  signCard.append(signToggle, signFields);
  if (options.reviewTools) signCard.append(toggle, dockLabel, tools);
  controls.append(signCard);
  view.append(stage, controls, note, mediaStatus, retryVideo);
  let avatar: TimingAvatar | undefined;
  let manifest: SigningManifest | undefined;
  let active = false;
  let disposed = false;
  let animation = 0;
  let generation = 0;
  let signingController: AbortController | undefined;
  let worksheetUrl: string | undefined;
  const activeCue = () => activeSegments.find(segment => segment.start !== undefined && segment.end !== undefined && video.currentTime >= segment.start && video.currentTime < segment.end);
  const captionText = () => {
    const index = definitions.findIndex(definition => optionValue(definition.language) === captionSelect.value);
    if (index < 0 || tracks[index]?.readyState !== 2) return '';
    const activeCues = index >= 0 ? video.textTracks[index]?.activeCues : null;
    const selected = Array.from(activeCues || []).find(candidate => video.currentTime >= candidate.startTime && video.currentTime < candidate.endTime) as VTTCue | undefined;
    return selected?.getCueAsHTML().textContent || '';
  };
  let unavailable = false;
  const signedVideo = new InterpreterVideo(interpretation, base, () => { video.pause(); update(); });
  const status = (message: string) => { if (avatarStatus.textContent !== message) avatarStatus.textContent = message; };
  const update = () => {
    if (disposed) return;
    const segment = activeCue();
    const phrase = manifest?.segments.find(item => video.currentTime >= item.start && video.currentTime < item.end);
    cue.textContent = captionText();
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
  const visibility = () => { cancelAnimationFrame(animation); if (!document.hidden) animate(); else { video.pause(); interpretation.pause(); signVideo.pause(); } };
  for (const event of ['timeupdate', 'seeking', 'seeked', 'ratechange', 'ended', 'waiting', 'playing', 'canplay']) video.addEventListener(event, update);
  for (const event of ['loadedmetadata', 'canplay']) interpretation.addEventListener(event, update);
  video.addEventListener('play', () => {
    animate();
    if (!signPanel.hidden && reviewedSign) {
      signVideo.currentTime = video.currentTime; signVideo.playbackRate = video.playbackRate;
      void signVideo.play().catch(() => { video.pause(); signStatus.textContent = 'Interpretation could not resume. Both videos were paused.'; });
    }
  });
  video.addEventListener('pause', () => { cancelAnimationFrame(animation); signVideo.pause(); update(); });
  video.addEventListener('ratechange', () => { signVideo.playbackRate = video.playbackRate; });
  video.addEventListener('seeking', () => { if (reviewedSign) signVideo.currentTime = video.currentTime; });
  video.addEventListener('error', () => { mediaStatus.textContent = 'Video unavailable. Retry video or use the transcript below.'; retryVideo.hidden = false; });
  video.addEventListener('loadedmetadata', () => { mediaStatus.textContent = ''; retryVideo.hidden = true; });
  signVideo.addEventListener('waiting', () => { video.pause(); signStatus.textContent = 'Interpretation is buffering. The lesson video was paused to keep both synchronized.'; });
  signVideo.addEventListener('timeupdate', () => { if (!video.paused && Math.abs(signVideo.currentTime - video.currentTime) > .25) signVideo.currentTime = video.currentTime; });
  document.addEventListener('visibilitychange', visibility);
  const syncNativeTrackModes = () => {
    definitions.forEach((definition, index) => {
      const textTrack = video.textTracks[index];
      if (!textTrack) return;
      const mode = optionValue(definition.language) === captionSelect.value ? presentation.value === 'native' ? 'showing' : 'hidden' : 'disabled';
      if (textTrack.mode !== mode) textTrack.mode = mode;
    });
  };
  const updateCaptionStatus = () => {
    const definition = definitions.find(item => optionValue(item.language) === captionSelect.value);
    cue.lang = described ? 'en' : definition?.language || 'en';
    const track = definition ? tracks[definitions.indexOf(definition)] : undefined;
    captionStatus.textContent = track?.readyState === 3 ? 'Selected captions are unavailable. Choose another reviewed track or read the transcript.'
      : track && track.readyState < 2 ? 'Loading selected captions…' : '';
  };
  const applyCaptionSelection = () => {
    syncNativeTrackModes();
    cue.hidden = captionSelect.value === 'off' || presentation.value === 'native';
    updateCaptionStatus();
    update();
  };
  captionSelect.addEventListener('change', () => { applyCaptionSelection(); savePreferences(); });
  presentation.addEventListener('change', () => { applyCaptionSelection(); savePreferences(); });
  const nativeSelection = () => {
    const showing = definitions.find((_definition, index) => video.textTracks[index]?.mode === 'showing');
    if (showing) { captionSelect.value = optionValue(showing.language); presentation.value = 'native'; }
    else if (presentation.value === 'native') captionSelect.value = 'off';
    cue.hidden = captionSelect.value === 'off' || presentation.value === 'native';
    updateCaptionStatus(); update(); savePreferences();
  };
  video.textTracks.addEventListener('change', nativeSelection);
  tracks.forEach(track => { track.addEventListener('load', applyCaptionSelection); track.addEventListener('error', applyCaptionSelection); });
  tracks.forEach((_track, index) => video.textTracks[index]?.addEventListener('cuechange', update));
  size.addEventListener('change', () => { applyAppearance(); savePreferences(); resizePage(size.value); });
  descriptionToggle.addEventListener('click', () => {
    if (!media.described_src || !media.described_duration || !media.described_segments) return;
    if (!described && !signPanel.hidden) signToggle.click();
    described = !described; video.pause(); signVideo.pause();
    activeSegments = described ? media.described_segments : segments;
    activeDuration = described ? media.described_duration : media.duration;
    setOfflineEdition(described);
    video.src = resource(described ? media.described_src! : media.src);
    tracks.forEach((track, index) => {
      const definition = definitions[index];
      const path = described ? definition.language === 'en' && describedReviewed ? media.described_captions : undefined : approved(definition) ? definition.src : undefined;
      if (path) track.src = resource(path); else track.removeAttribute('src');
    });
    for (const option of captionSelect.options) {
      if (option.value === 'off') continue;
      const definition = candidates.find(item => optionValue(item.language) === option.value)!;
      option.disabled = described ? definition.language !== 'en' || !describedReviewed : !approved(definition);
      option.textContent = described && definition.language === 'en' ? describedReviewed ? 'English · reviewed described edition' : 'English · described captions awaiting review' : definition.label;
    }
    if (captionSelect.selectedOptions[0]?.disabled) captionSelect.value = 'off';
    cue.textContent = ''; video.load(); applyCaptionSelection();
    view.dispatchEvent(new Event('access-edition-change'));
    descriptionToggle.setAttribute('aria-pressed', String(described));
    descriptionToggle.textContent = described ? 'Use standard video' : 'Use audio-described video';
    descriptionStatus.textContent = described
      ? 'Audio-described video selected. It uses an extended timeline and restarts from the beginning.' + (describedReviewed ? ' Reviewed English captions are available.' : ' Reviewed captions are unavailable for this edition.')
      : 'Standard video selected and restarted from the beginning.';
    signToggle.disabled = described || !reviewedSign;
    if (described && active) toggle.click();
    toggle.disabled = described;
  });
  signToggle.addEventListener('click', () => {
    if (!reviewedSign || described) return;
    const showing = signPanel.hidden;
    signPanel.hidden = !showing; signDockLabel.hidden = !showing; signSizeLabel.hidden = !showing;
    signToggle.setAttribute('aria-pressed', String(showing));
    signToggle.textContent = showing ? 'Hide EthSL interpretation' : 'Show EthSL interpretation';
    signStatus.textContent = showing ? 'Reviewed interpreter recording loaded for this lesson revision.' : '';
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
    get segments() { return activeSegments; },
    get language() { return described ? 'en' : undefined; },
    seek(time: number) { video.currentTime = Math.min(Math.max(0, time), activeDuration); update(); },
    dispose() {
      disposed = true; generation++; cancelAnimationFrame(animation); signingController?.abort(); signedVideo.clear();
      document.removeEventListener('visibilitychange', visibility);
      video.textTracks.removeEventListener('change', nativeSelection);
      signVideo.pause(); signVideo.removeAttribute('src'); signVideo.load();
      video.pause(); video.removeAttribute('src'); video.load(); avatar?.dispose();
      if (worksheetUrl) URL.revokeObjectURL(worksheetUrl);
    },
  };
}
