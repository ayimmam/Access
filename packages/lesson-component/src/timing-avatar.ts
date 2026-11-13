import * as THREE from 'three';
import { SigningPlayer, type SigningManifest, type SigningOptions } from './signing-player';

/** Neutral procedural motion for synchronization review. EthSL motions need authored clips. */
export class TimingAvatar {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  private renderer: THREE.WebGLRenderer;
  private left = new THREE.Group();
  private right = new THREE.Group();
  private leftElbow = new THREE.Group();
  private rightElbow = new THREE.Group();
  private observer: ResizeObserver;
  private signing?: SigningPlayer;
  private prototypeObjects: THREE.Object3D[] = [];

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.append(this.renderer.domElement);
    this.camera.position.set(0, 1.65, 5.7);
    this.camera.lookAt(0, 1.45, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7592a3, 2.7));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-3, 5, 4); this.scene.add(light);
    const skin = new THREE.MeshStandardMaterial({ color: 0x70432e, roughness: .8 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x315c86, roughness: .9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x161313, roughness: .95 });
    const lips = new THREE.MeshStandardMaterial({ color: 0x7e3c39, roughness: .9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xdcb65b, metalness: .6, roughness: .4 });
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, position: number[], scale?: number[]) => {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(position[0], position[1], position[2]);
      if (scale) object.scale.set(scale[0], scale[1], scale[2]);
      return object;
    };
    this.scene.add(mesh(new THREE.CapsuleGeometry(.44, .65, 8, 24), shirt, [0, 1, 0], [.94, 1, .65]));
    this.scene.add(mesh(new THREE.CylinderGeometry(.12, .14, .25, 16), skin, [0, 1.8, 0]));
    this.scene.add(mesh(new THREE.SphereGeometry(.3, 32, 24), skin, [0, 2.13, 0], [.88, 1.15, .9]));
    this.scene.add(mesh(new THREE.SphereGeometry(.3, 24, 16), dark, [0, 2.28, -.085], [.96, .8, .82]));
    // Coiled hair and a high bun form the original African-woman character design.
    for (let ring = 0; ring < 4; ring++) {
      for (let curl = 0; curl < 16; curl++) {
        const angle = curl / 16 * Math.PI * 2;
        const radius = .26 - ring * .045;
        this.scene.add(mesh(new THREE.SphereGeometry(.055, 8, 8), dark,
          [Math.cos(angle) * radius, 2.33 + ring * .04, -.07 + Math.sin(angle) * radius * .8]));
      }
    }
    this.scene.add(mesh(new THREE.SphereGeometry(.15, 20, 16), dark, [0, 2.57, -.11], [1.05, 1, 1]));
    for (const x of [-.25, .25]) {
      const earring = mesh(new THREE.TorusGeometry(.045, .009, 8, 20), gold, [x, 2.02, .025]);
      this.scene.add(earring);
    }
    for (const x of [-.105, .105]) this.scene.add(mesh(new THREE.SphereGeometry(.025, 12, 12), dark, [x, 2.18, .25]));
    this.scene.add(mesh(new THREE.SphereGeometry(.04, 12, 12), skin, [0, 2.08, .28], [.6, .8, 1]));
    for (const x of [-.105, .105]) {
      const brow = mesh(new THREE.CapsuleGeometry(.012, .075, 4, 12), dark, [x, 2.235, .245]);
      brow.rotation.z = Math.PI / 2; this.scene.add(brow);
    }
    this.scene.add(mesh(new THREE.SphereGeometry(.055, 16, 12), lips, [0, 1.99, .25], [1, .28, .3]));
    for (const [side, shoulder, elbow] of [[-1, this.left, this.leftElbow], [1, this.right, this.rightElbow]] as const) {
      shoulder.position.set(side * .43, 1.58, 0);
      shoulder.add(mesh(new THREE.CapsuleGeometry(.13, .35, 8, 16), shirt, [0, -.23, 0]));
      elbow.position.y = -.48;
      elbow.add(mesh(new THREE.CapsuleGeometry(.085, .33, 8, 16), skin, [0, -.22, 0]));
      const hand = new THREE.Group(); hand.position.y = -.47;
      hand.add(mesh(new THREE.SphereGeometry(.1, 16, 12), skin, [0, -.025, 0], [.85, 1.15, .42]));
      for (let finger = 0; finger < 4; finger++) {
        hand.add(mesh(new THREE.CapsuleGeometry(.018, .095 - Math.abs(1.5 - finger) * .015, 4, 8), skin, [(finger - 1.5) * .043, -.15, 0]));
      }
      const thumb = mesh(new THREE.CapsuleGeometry(.025, .06, 4, 8), skin, [side * .1, -.05, .025]);
      thumb.rotation.z = side * -.65; hand.add(thumb);
      elbow.add(hand); shoulder.add(elbow); this.scene.add(shoulder);
    }
    this.prototypeObjects = this.scene.children.filter(child => !(child instanceof THREE.Light));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize(); this.update(0, false);
  }

  private resize() {
    const width = this.container.clientWidth || 280;
    const height = this.container.clientHeight || 340;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  async setManifest(manifest: SigningManifest, base: URL, signal: AbortSignal, options?: SigningOptions) {
    this.clearSigning();
    const player = new SigningPlayer(this.scene, manifest, options);
    this.signing = player;
    try {
      await player.initialize(base, signal);
    } catch (error) {
      player.dispose();
      if (this.signing === player) this.signing = undefined;
      throw error;
    }
  }

  clearSigning() {
    this.signing?.dispose(); this.signing = undefined;
    this.prototypeObjects.forEach(object => { object.visible = true; });
  }

  update(time: number, hasCue: boolean) {
    const approved = this.signing?.update(time);
    this.prototypeObjects.forEach(object => { object.visible = !approved; });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const movement = hasCue && !reduced ? Math.sin(time * 1.7) : 0;
    this.left.rotation.set(-.22, 0, -.22 - movement * .1);
    this.right.rotation.set(-.22, 0, .22 + movement * .1);
    this.leftElbow.rotation.x = -.9 - movement * .16;
    this.rightElbow.rotation.x = -.9 + movement * .16;
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
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
