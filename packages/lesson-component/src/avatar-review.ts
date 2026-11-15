import type { TimingAvatar } from './timing-avatar';
import type { SigningAsset, SigningManifest } from './signing-player';

interface ReviewSegment { id: string; start: number; end: number; source_text: string }
type ReviewManifest = Omit<SigningManifest, 'segments'> & {
  lesson_id: string; content_version: number; course_version_id: string;
  video_sha256: string; captions_sha256: string;
  segments: (SigningManifest['segments'][number] & ReviewSegment & { reference_recording_id?: string; consent_ref?: string })[];
};
const files = document.querySelector<HTMLInputElement>('#assets')!;
const load = document.querySelector<HTMLButtonElement>('#load')!;
const status = document.querySelector<HTMLElement>('#status')!;
const motion = document.querySelector<HTMLElement>('#motion')!;
const video = document.querySelector<HTMLVideoElement>('#video')!;
video.muted = true;
const cue = document.querySelector<HTMLSelectElement>('#cue')!;
const notes = document.querySelector<HTMLTextAreaElement>('#notes')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const download = document.querySelector<HTMLButtonElement>('#download')!;
const feedbackStatus = document.querySelector<HTMLElement>('#feedback-status')!;
let avatar: TimingAvatar | undefined;
let controller: AbortController | undefined;
let manifest: ReviewManifest | undefined;
let manifestHash = '';
let observations: Record<string, unknown>[] = [];
let animation = 0;
let downloadUrl: string | undefined;
let comparing = false;
let currentPhraseId = '';
const reveal = document.querySelector<HTMLButtonElement>('#reveal')!;
const hash = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
  .map(value => value.toString(16).padStart(2, '0')).join('');

function update() {
  const current = avatar?.update(video.currentTime, true);
  const segment = manifest?.segments.find(item => video.currentTime >= item.start && video.currentTime < item.end);
  if (currentPhraseId !== (segment?.id || '')) {
    currentPhraseId = segment?.id || '';
    comparing = false; reveal.disabled = true; video.hidden = true; video.playbackRate = 1;
  }
  if (!comparing) video.muted = true;
  document.querySelector('#caption')!.textContent = comparing ? segment?.source_text || 'Source caption unavailable at this time.' : 'Caption hidden for independent comprehension review.';
  motion.textContent = `${current ? `EthSL recording-derived review clip ${current.id} · feedback only` : '3D hands preview · EthSL review pending'} · ${video.currentTime.toFixed(2)}s`;
  motion.dataset.motionId = current?.id || '';
  if (segment) cue.value = segment.id;
}

function animate() {
  cancelAnimationFrame(animation);
  update();
  if (!video.paused && !document.hidden) animation = requestAnimationFrame(animate);
}

load.addEventListener('click', async () => {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  load.disabled = true;
  status.textContent = 'Checking local study files…';
  let candidateAvatar: TimingAvatar | undefined;
  try {
    const selected = Array.from(files.files || []);
    const jsonFiles = selected.filter(file => file.name.endsWith('.json') && file.name !== 'study-info.json');
    if (jsonFiles.length !== 1 || jsonFiles[0].size > 2 * 1024 * 1024) throw new Error('Select one language manifest, up to 2 MiB, with its GLB files.');
    const bytes = await jsonFiles[0].arrayBuffer();
    const candidate = JSON.parse(new TextDecoder().decode(bytes)) as ReviewManifest;
    if (candidate.schema_version !== '1.0' || candidate.lesson_id !== 'alx-transforming-africa' || candidate.content_version !== 1 || candidate.language !== 'ethsl' || candidate.rig_version !== 'access-hands-v1' || !candidate.rig || !Array.isArray(candidate.segments) || candidate.segments.length > 100) throw new Error('Use this lesson’s EthSL hands-only manifest and rig revision.');
    let end = 0;
    for (const segment of candidate.segments) {
      if (typeof segment.id !== 'string' || typeof segment.source_text !== 'string' || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < end || segment.end <= segment.start || segment.end > 121.496916 || !Number.isFinite(segment.playback_rate) || segment.playback_rate < .5 || segment.playback_rate > 1.15) throw new Error('Invalid or overlapping study timing.');
      end = segment.end;
      if (segment.motion && (!segment.reference_recording_id || !segment.consent_ref)) throw new Error('Motion review requires a consented EthSL recording reference, not presenter gestures.');
    }
    const response = await fetch(`/api/v1/lessons/alx-transforming-africa/signing-manifest?lang=${candidate.language}&version=1`, { signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Source binding unavailable.');
    const source = await response.json();
    if (source.video_sha256 !== candidate.video_sha256 || source.captions_sha256 !== candidate.captions_sha256 ||
      source.course_version_id !== candidate.course_version_id) throw new Error('Study video/caption hashes or course version differ from the current source.');
    const sourceCues = new Map<string, ReviewSegment>(source.segments.map((segment: ReviewSegment) => [segment.id, segment]));
    const sourceIds = [...sourceCues.keys()];
    const usedCues = new Set<string>();
    for (const segment of candidate.segments) {
      if (!Array.isArray(segment.cue_ids) || !segment.cue_ids.length) throw new Error('Keep the original source cue IDs.');
      const first = sourceIds.indexOf(segment.cue_ids[0]);
      if (first < 0 || segment.cue_ids.some((id, index) => sourceIds[first + index] !== id || usedCues.has(id)) ||
        segment.source_text !== segment.cue_ids.map(id => sourceCues.get(id)?.source_text).join(' ')) {
        throw new Error('Use unique, adjacent source cues and unchanged caption text.');
      }
      segment.cue_ids.forEach(id => usedCues.add(id));
    }
    const byName = new Map(selected.map(file => [file.name, file]));
    const localAsset = (asset: SigningAsset & { filename?: string }) => {
      if (!asset.filename || !/^[a-zA-Z0-9_-]+\.glb$/.test(asset.filename)) throw new Error('Invalid local GLB filename.');
      asset.url = asset.filename;
    };
    localAsset(candidate.rig);
    candidate.segments.forEach(segment => { if (segment.motion) localAsset(segment.motion); });
    const readAsset = async (asset: SigningAsset) => {
      const file = byName.get(asset.url);
      if (!file || file.size > 25 * 1024 * 1024) throw new Error('Missing or oversized GLB file.');
      return file.arrayBuffer();
    };
    const candidateHost = document.createElement('div');
    candidateHost.style.cssText = 'width:100%;height:100%;';
    const { TimingAvatar } = await import('./timing-avatar');
    candidateAvatar = new TimingAvatar(candidateHost);
    await candidateAvatar.setManifest(candidate, new URL('/api/v1/', location.href), signal, { reviewDrafts: true, readAsset });
    if (signal.aborted) { candidateAvatar.dispose(); return; }
    const candidateHash = await hash(bytes);
    if (signal.aborted) { candidateAvatar.dispose(); return; }
    avatar?.dispose();
    document.querySelector('#avatar')!.replaceChildren(candidateHost);
    manifestHash = candidateHash;
    manifest = candidate;
    avatar = candidateAvatar;
    observations = [];
    document.querySelector('#observations')!.replaceChildren();
    feedbackStatus.textContent = '';
    download.disabled = true;
    cue.replaceChildren(...candidate.segments.map(segment => {
      const option = document.createElement('option');
      option.value = segment.id;
      option.textContent = `${segment.start.toFixed(1)}s · ${segment.id}`;
      return option;
    }));
    save.disabled = cue.disabled = false;
    comparing = false; reveal.disabled = true; video.hidden = true; video.muted = true; video.playbackRate = 1;
    status.textContent = `Loaded hands rig · ${candidate.segments.filter(segment => segment.motion).length} draft clips · ${candidate.segments.length} phrase slots. EthSL review pending.`;
    animate();
  } catch (error) {
    candidateAvatar?.dispose();
    if (!signal.aborted) status.textContent = `Study unavailable. ${error instanceof Error ? error.message : 'Check the selected files.'}`;
  } finally {
    if (controller.signal === signal) load.disabled = false;
  }
});

cue.addEventListener('change', () => {
  comparing = false; reveal.disabled = true; video.hidden = true;
  const segment = manifest?.segments.find(item => item.id === cue.value);
  if (segment) { video.currentTime = segment.start; update(); }
});
video.addEventListener('play', animate);
video.addEventListener('pause', () => { cancelAnimationFrame(animation); update(); });
video.addEventListener('seeked', update);
video.addEventListener('seeking', update);
video.addEventListener('ratechange', update);
video.addEventListener('ended', update);
video.addEventListener('timeupdate', update);
document.addEventListener('visibilitychange', () => { cancelAnimationFrame(animation); if (!document.hidden) animate(); });
document.querySelector('#feedback')!.addEventListener('submit', event => {
  event.preventDefault();
  if (!manifest || !notes.value.trim()) return;
  const segment = manifest.segments.find(item => video.currentTime >= item.start && video.currentTime < item.end);
  const observation = {
    time: video.currentTime, segment_id: segment?.id || null,
    category: document.querySelector<HTMLSelectElement>('#category')!.value,
    result: document.querySelector<HTMLSelectElement>('#rating')!.value, notes: notes.value.trim(),
    phase: comparing ? 'comparison' : 'blind-comprehension', playback_rate: video.playbackRate,
  };
  observations.push(observation);
  const item = document.createElement('li');
  item.textContent = `${observation.time.toFixed(2)}s · ${observation.notes}`;
  document.querySelector('#observations')!.append(item);
  notes.value = '';
  download.disabled = false;
  reveal.disabled = false;
  feedbackStatus.textContent = `${observations.length} observations saved in this session.`;
});
document.querySelector('#play')!.addEventListener('click', () => {
  if (video.paused) void video.play().catch(() => { status.textContent = 'Source video unavailable; use the caption comparison.'; });
  else video.pause();
});
reveal.addEventListener('click', () => { comparing = true; video.hidden = false; update(); });
download.addEventListener('click', () => {
  if (!manifest) return;
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  const report = { schema_version: '1.0', review_status: 'feedback-only', translation_status: 'pending',
    lesson_id: manifest.lesson_id, content_version: manifest.content_version, language_target: manifest.language,
    manifest_sha256: manifestHash, video_sha256: manifest.video_sha256, captions_sha256: manifest.captions_sha256,
    rig_version: manifest.rig_version, rig_sha256: manifest.rig?.sha256, render_profile: 'hands-front-v1',
    clips: manifest.segments.map(segment => ({ id: segment.id, cue_ids: segment.cue_ids, start: segment.start,
      end: segment.end, glb_sha256: segment.motion?.sha256 || null })), observations };
  downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `avatar-study-${manifest.language}-feedback.json`;
  link.click();
});
window.addEventListener('pagehide', () => {
  controller?.abort();
  cancelAnimationFrame(animation);
  avatar?.dispose();
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});
