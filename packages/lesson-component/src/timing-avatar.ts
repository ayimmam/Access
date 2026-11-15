import * as THREE from 'three';
import { createHandsRig, neutralHandsPose, SIGNING_SPACE } from './hands-rig';
import { SigningPlayer, type SigningManifest, type SigningOptions } from './signing-player';

export class TimingAvatar {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1.55, 1.55, 1.4, -1.4, .1, 30);
  private renderer: THREE.WebGLRenderer;
  private observer: ResizeObserver;
  private signing?: SigningPlayer;
  private preview = createHandsRig();
  private hasReviewedSequence = false;
  private closePreview = true;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;border-radius:.5rem;';
    container.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xe4ecee);
    this.camera.position.set(0, 1.55, 6);
    this.camera.lookAt(0, 1.55, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x788995, 2));
    const key = new THREE.DirectionalLight(0xfff3e8, 2.1);
    key.position.set(-2, 4, 5);
    const fill = new THREE.DirectionalLight(0xeaf3ff, 1);
    fill.position.set(3, 2, 4);
    this.scene.add(key, fill);
    neutralHandsPose(this.preview.bones);
    this.scene.add(this.preview.root);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    // Frame the neutral preview tightly so fingers can be inspected. Reviewed
    // motion retains its full, fixed signing space and original render profile.
    const bounds = this.closePreview ? new THREE.Box3().setFromObject(this.preview.root) : undefined;
    const center = bounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.55, 0);
    const size = bounds?.getSize(new THREE.Vector3());
    const spaceWidth = size ? size.x * 1.25 : SIGNING_SPACE.right - SIGNING_SPACE.left;
    const spaceHeight = size ? size.y * 1.25 : SIGNING_SPACE.top - SIGNING_SPACE.bottom;
    this.camera.position.set(center.x, center.y, 6);
    this.camera.lookAt(center.x, center.y, 0);
    const vertical = Math.max(spaceHeight, spaceWidth / aspect) / 2;
    this.camera.left = -vertical * aspect;
    this.camera.right = vertical * aspect;
    this.camera.top = vertical;
    this.camera.bottom = -vertical;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
  }

  async setManifest(manifest: SigningManifest, base: URL, signal: AbortSignal, options?: SigningOptions) {
    this.clearSigning();
    const player = new SigningPlayer(this.scene, manifest, options);
    this.signing = player;
    try {
      await player.initialize(base, signal);
      this.hasReviewedSequence = manifest.segments.some(segment => segment.status === 'approved' ||
        (options?.reviewDrafts && segment.status === 'machine-draft'));
    } catch (error) {
      player.dispose();
      if (this.signing === player) this.signing = undefined;
      throw error;
    }
  }

  clearSigning() {
    this.signing?.dispose();
    this.signing = undefined;
    this.hasReviewedSequence = false;
    this.preview.root.visible = true;
    this.closePreview = true;
    this.resize();
  }

  update(time: number, hasCue: boolean) {
    const approved = this.signing?.update(time);
    this.preview.root.visible = !this.hasReviewedSequence && !this.signing?.showsRigPreview;
    if (this.closePreview !== this.preview.root.visible) {
      this.closePreview = this.preview.root.visible;
      this.resize();
    }
    this.renderer.render(this.scene, this.camera);
    return approved;
  }

  dispose() {
    this.signing?.dispose();
    this.observer.disconnect();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    materials.forEach(material => material.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
