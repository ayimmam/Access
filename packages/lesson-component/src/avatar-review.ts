import { TimingAvatar } from './timing-avatar';
import type { SigningAsset, SigningManifest } from './signing-player';

interface ReviewSegment { id: string; start: number; end: number; source_text: string }
type ReviewManifest = Omit<SigningManifest, 'segments'> & {
  lesson_id: string; content_version: number; course_version_id: string;
  video_sha256: string; captions_sha256: string; segments: (SigningManifest['segments'][number] & ReviewSegment)[];
};
const files = document.querySelector<HTMLInputElement>('#assets')!;
const load = document.querySelector<HTMLButtonElement>('#load')!;
const status = document.querySelector<HTMLElement>('#status')!;
const motion = document.querySelector<HTMLElement>('#motion')!;
const video = document.querySelector<HTMLVideoElement>('#video')!;
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
const hash = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
  .map(value => value.toString(16).padStart(2, '0')).join('');

function update() {
  const current = avatar?.update(video.currentTime, true);
  const segment = manifest?.segments.find(item => video.currentTime >= item.start && video.currentTime < item.end);
  document.querySelector('#caption')!.textContent = segment?.source_text || 'Source caption unavailable at this time.';
  motion.textContent = `${manifest?.language.toUpperCase() || ''} target · ${current ? `draft motion ${current.id}` : 'timing preview'} · ${video.currentTime.toFixed(2)}s`;
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
    if (candidate.schema_version !== '1.0' || candidate.lesson_id !== 'alx-transforming-africa' || candidate.content_version !== 1 || !['ethsl', 'asl'].includes(candidate.language) || !candidate.rig || !Array.isArray(candidate.segments) || candidate.segments.length > 100) throw new Error('Use this lesson’s version 1 study manifest.');
    let end = 0;
    for (const segment of candidate.segments) {
      if (typeof segment.id !== 'string' || typeof segment.source_text !== 'string' || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < end || segment.end <= segment.start || segment.end > 121.496916 || !Number.isFinite(segment.playback_rate) || segment.playback_rate < .5 || segment.playback_rate > 1.15) throw new Error('Invalid or overlapping study timing.');
      end = segment.end;
    }
    const response = await fetch(`/api/v1/lessons/alx-transforming-africa/signing-manifest?lang=${candidate.language}&version=1`, { signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Source binding unavailable.');
    const source = await response.json();
    if (source.video_sha256 !== candidate.video_sha256 || source.captions_sha256 !== candidate.captions_sha256) throw new Error('Study video/caption hashes differ from the current source.');
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
      option.textContent = `${segment.start.toFixed(1)}s · ${segment.source_text}`;
      return option;
    }));
    save.disabled = cue.disabled = false;
    status.textContent = `Loaded ${candidate.segments.length} ${candidate.language.toUpperCase()}-target draft clips. Translation and comprehension review pending.`;
    animate();
  } catch (error) {
    candidateAvatar?.dispose();
    if (!signal.aborted) status.textContent = `Study unavailable. ${error instanceof Error ? error.message : 'Check the selected files.'}`;
  } finally {
    if (controller.signal === signal) load.disabled = false;
  }
});

cue.addEventListener('change', () => {
  const segment = manifest?.segments.find(item => item.id === cue.value);
  if (segment) { video.currentTime = segment.start; update(); }
});
video.addEventListener('play', animate);
video.addEventListener('pause', () => { cancelAnimationFrame(animation); update(); });
video.addEventListener('seeked', update);
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
  };
  observations.push(observation);
  const item = document.createElement('li');
  item.textContent = `${observation.time.toFixed(2)}s · ${observation.notes}`;
  document.querySelector('#observations')!.append(item);
  notes.value = '';
  download.disabled = false;
  feedbackStatus.textContent = `${observations.length} observations saved in this session.`;
});
download.addEventListener('click', () => {
  if (!manifest) return;
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  const report = { schema_version: '1.0', review_status: 'feedback-only', translation_status: 'pending',
    lesson_id: manifest.lesson_id, content_version: manifest.content_version, language_target: manifest.language,
    manifest_sha256: manifestHash, video_sha256: manifest.video_sha256, captions_sha256: manifest.captions_sha256, observations };
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
