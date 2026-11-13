import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface SigningAsset { url: string; sha256: string }
export interface SigningOptions {
  reviewDrafts?: boolean;
  readAsset?: (asset: SigningAsset) => Promise<ArrayBuffer>;
}
export interface SigningSegment {
  id: string; start: number; end: number; status: string;
  motion: SigningAsset | null; clip_name: string | null;
  natural_duration: number | null; playback_rate: number;
}
export interface SigningManifest {
  schema_version: string; language: 'ethsl' | 'asl'; rig: SigningAsset | null;
  segments: SigningSegment[]; approved_count: number;
}

/** Evaluates reviewed, same-rig GLB clips at absolute source-video times. */
export class SigningPlayer {
  private root?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private disposed = false;

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
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== asset.sha256) throw new Error('Signing asset hash mismatch');
    const header = new DataView(bytes);
    if (bytes.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength || header.getUint32(16, true) !== 0x4e4f534a || header.getUint32(12, true) > bytes.byteLength - 20) throw new Error('Invalid GLB');
    const json = JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + header.getUint32(12, true))).trim());
    if ([...(json.buffers || []), ...(json.images || [])].some(entry => entry.uri) || json.extensionsRequired?.length) throw new Error('Use self-contained uncompressed GLB assets');
    return new GLTFLoader().parseAsync(bytes, '');
  }

  async initialize(base: URL, signal: AbortSignal) {
    if (!this.manifest.rig || !this.manifest.segments.some(segment => this.playable(segment))) return;
    const rig = await this.load(this.manifest.rig, base, signal);
    this.root = rig.scene;
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
        if (!THREE.PropertyBinding.findNode(this.root, binding.nodeName)) throw new Error('Signing clip does not match the rig');
      }
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true;
      this.actions.set(segment.id, action);
    }
  }

  private playable(segment: SigningSegment) {
    return segment.status === 'approved' || (this.options.reviewDrafts && segment.status === 'machine-draft');
  }

  update(time: number): SigningSegment | undefined {
    const segment = this.manifest.segments.find(s => time >= s.start && time < s.end);
    const action = segment && this.actions.get(segment.id);
    if (!this.root || !this.mixer) return undefined;
    this.root.visible = Boolean(action);
    this.mixer.stopAllAction();
    if (!segment || !action) return undefined;
    action.reset().play(); action.time = Math.min((time - segment.start) * segment.playback_rate, action.getClip().duration);
    this.mixer.update(0);
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
