import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HANDS_RIG_VERSION, SIGNING_SPACE } from './hands-rig';

export interface SigningAsset { url: string; sha256: string }
export interface SigningOptions {
  reviewDrafts?: boolean;
  readAsset?: (asset: SigningAsset) => Promise<ArrayBuffer>;
}
export interface SigningSegment {
  id: string; start: number; end: number; status: string;
  motion: SigningAsset | null; clip_name: string | null;
  natural_duration: number | null; playback_rate: number;
  cue_ids: string[]; presentation: 'pending' | 'hands-only' | 'interpreter-video';
  interpreter_video: SigningAsset | null; requires_non_manual: boolean; hands_ambiguous: boolean;
  approved_render_sha256: string | null;
}
export interface SigningManifest {
  schema_version: string; language: 'ethsl' | 'asl'; rig: SigningAsset | null;
  rig_version: string | null;
  segments: SigningSegment[]; approved_count: number;
}

/** Evaluates reviewed, same-rig GLB clips at absolute source-video times. */
export class SigningPlayer {
  private root?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private disposed = false;
  private bounds = new THREE.Box3();

  get showsRigPreview() { return Boolean(this.root && this.options.reviewDrafts && !this.actions.size); }

  constructor(private scene: THREE.Scene, private manifest: SigningManifest, private options: SigningOptions = {}) {}

  private async load(asset: SigningAsset, base: URL, signal: AbortSignal) {
    let bytes: ArrayBuffer;
    if (this.options.readAsset) {
      bytes = await this.options.readAsset(asset);
    } else {
      const url = new URL(asset.url, base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Untrusted signing asset');
      const response = await fetch(url, { signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (!response.ok) throw new Error('Signing asset unavailable');
      if (Number(response.headers.get('content-length')) > 25 * 1024 * 1024) throw new Error('Signing asset too large');
      bytes = await response.arrayBuffer();
    }
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Signing asset too large');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('');
    if (hash !== asset.sha256) throw new Error('Signing asset hash mismatch');
    const header = new DataView(bytes);
    if (bytes.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength || header.getUint32(16, true) !== 0x4e4f534a || header.getUint32(12, true) > bytes.byteLength - 20) throw new Error('Invalid GLB');
    const json = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + header.getUint32(12, true))).trim());
    if ([...(json.buffers || []), ...(json.images || [])].some(entry => entry.uri) || json.extensionsRequired?.length) throw new Error('Use self-contained uncompressed GLB assets');
    return new GLTFLoader().parseAsync(bytes, '');
  }

  async initialize(base: URL, signal: AbortSignal) {
    if (this.manifest.language !== 'ethsl') throw new Error('This view accepts EthSL only');
    const ids = new Set<string>();
    let previousEnd = 0;
    for (const segment of this.manifest.segments) {
      if (ids.has(segment.id) || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) ||
        segment.start < previousEnd || segment.end <= segment.start || !Number.isFinite(segment.playback_rate) ||
        segment.playback_rate < .5 || segment.playback_rate > 1.15) throw new Error('Invalid signing timeline');
      ids.add(segment.id);
      previousEnd = segment.end;
    }
    if (!this.manifest.rig || (!this.options.reviewDrafts && !this.manifest.segments.some(segment => this.playable(segment)))) return;
    if (this.manifest.rig_version !== HANDS_RIG_VERSION) throw new Error('Re-author and review this hands-only rig revision');
    const rig = await this.load(this.manifest.rig, base, signal);
    this.root = rig.scene;
    if (this.root.getObjectByName('AccessHands')?.userData.handsRigVersion !== HANDS_RIG_VERSION) throw new Error('Incorrect hands rig');
    for (const side of ['Left', 'Right']) {
      if (!this.root.getObjectByName(`${side}Hand`)) throw new Error('Missing wrist');
      for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
        for (const phalanx of [1, 2, 3]) {
          if (!this.root.getObjectByName(`${side}Hand${finger}${phalanx}`)) throw new Error('Missing finger joint');
        }
      }
    }
    this.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      let ancestor: THREE.Object3D | null = object.parent;
      while (ancestor && !['LeftHand', 'RightHand'].includes(ancestor.name)) ancestor = ancestor.parent;
      if (!ancestor) throw new Error('Only wrist-terminated hand surfaces are allowed');
    });
    if (this.disposed || signal.aborted) { this.dispose(); return; }
    this.root.visible = false;
    this.mixer = new THREE.AnimationMixer(this.root);
    this.scene.add(this.root);
    for (const segment of this.manifest.segments) {
      if (!this.playable(segment) || !segment.motion) continue;
      const gltf = await this.load(segment.motion, base, signal);
      this.releaseScene(gltf.scene);
      if (this.disposed || signal.aborted) return;
      const clip = gltf.animations.find(item => item.name === segment.clip_name);
      if (!clip || !segment.natural_duration || Math.abs(clip.duration - segment.natural_duration) > .05) throw new Error('Signing clip duration/name differs from approval');
      if (clip.duration / segment.playback_rate > segment.end - segment.start + .001) throw new Error('Signing clip exceeds approved window');
      for (const track of clip.tracks) {
        const binding = THREE.PropertyBinding.parseTrackName(track.name);
        const jointName = /^(Hips|Spine2?|Neck|Head|(Left|Right)(Shoulder|Arm|ForeArm|Hand(Thumb|Index|Middle|Ring|Pinky)?[123]?))$/;
        if (!jointName.test(binding.nodeName) || !['position', 'quaternion'].includes(binding.propertyName) ||
          binding.objectName || binding.propertyIndex || !THREE.PropertyBinding.findNode(this.root, binding.nodeName) ||
          Array.from(track.values).some(value => !Number.isFinite(value)) ||
          Array.from(track.times).some((time, index) => !Number.isFinite(time) || time < 0 ||
            time > clip.duration + .001 || (index > 0 && time <= track.times[index - 1]))) {
          throw new Error('Signing clip does not match the rig');
        }
      }
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
      this.actions.set(segment.id, action);
    }
  }

  private playable(segment: SigningSegment) {
    return segment.presentation === 'hands-only' && !segment.requires_non_manual && !segment.hands_ambiguous &&
      ((segment.status === 'approved' && /^[0-9a-f]{64}$/.test(segment.approved_render_sha256 || '')) ||
        (this.options.reviewDrafts && segment.status === 'machine-draft'));
  }

  update(time: number): SigningSegment | undefined {
    const segment = this.manifest.segments.find(item => time >= item.start && time < item.end);
    const action = segment && this.actions.get(segment.id);
    if (!this.root || !this.mixer) return undefined;
    this.root.visible = Boolean(action) || this.showsRigPreview;
    this.mixer.stopAllAction();
    if (!segment || !action) return undefined;
    action.reset().play(); action.time = Math.min((time - segment.start) * segment.playback_rate, action.getClip().duration);
    this.mixer.update(0);
    this.bounds.setFromObject(this.root, true);
    if (this.bounds.min.x < SIGNING_SPACE.left || this.bounds.max.x > SIGNING_SPACE.right ||
      this.bounds.min.y < SIGNING_SPACE.bottom || this.bounds.max.y > SIGNING_SPACE.top ||
      this.bounds.min.z < -1.5 || this.bounds.max.z > 1.5) {
      this.root.visible = false;
      return undefined;
    }
    return segment;
  }

  private releaseScene(root: THREE.Object3D) {
    root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      }
    });
  }

  dispose() {
    this.disposed = true;
    if (this.root) { this.mixer?.stopAllAction(); this.mixer?.uncacheRoot(this.root); this.scene.remove(this.root); this.releaseScene(this.root); }
    this.actions.clear(); this.root = undefined;
  }
}
