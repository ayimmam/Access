import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { TimedSegment } from './media-view';

// Both drafts animate the same character and are pinned to the ALX caption revision.
export async function mountSignDemo(
  host: HTMLElement,
  video: HTMLVideoElement,
  base: URL | ((path: string) => ArrayBuffer),
  cues: TimedSegment[],
  language: 'asl' | 'ethsl',
  signal: AbortSignal,
) {
  const loader = new GLTFLoader();
  const load = async (path: string) => {
    if (typeof base === 'function') return loader.parseAsync(base(path), '');
    const response = await fetch(new URL('/demo-assets/' + path, base), { signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Animation unavailable');
    return loader.parseAsync(await response.arrayBuffer(), '');
  };
  const [rig, motion] = await Promise.all([
    load('asl-demo/avatar.glb'),
    load(language + '-demo/lesson-motion.glb'),
  ]);
  if (signal.aborted) return;
  const metadata = motion.scene.getObjectByName('AccessWoman')?.userData;
  if (metadata?.targetLanguage !== (language === 'ethsl' ? 'ethsl' : 'ase')) throw new Error('Unexpected motion language');
  const passages = metadata.sourcePassages;
  if (!Array.isArray(passages) || passages.length !== cues.length || cues.some((cue, i) => cue.text !== passages[i])) {
    throw new Error('The demo animation belongs to a different caption revision');
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe4ecee);
  scene.add(rig.scene, new THREE.HemisphereLight(0xffffff, 0xa7b8ba, 2));
  const light = new THREE.DirectionalLight(0xfff5e8, 2);
  light.position.set(-2, 4, 5);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 12);
  camera.position.set(0, 1.64, 5);
  camera.lookAt(0, 1.64, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  host.append(renderer.domElement);
  const mixer = new THREE.AnimationMixer(rig.scene);
  const actions = new Map(
    motion.animations.map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      return [clip.name, action] as const;
    }),
  );
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    const time = video.currentTime;
    const cue = cues.find(
      (item) => typeof item.start === 'number' && typeof item.end === 'number' && time >= item.start && time < item.end,
    );
    mixer.stopAllAction();
    const action = cue && actions.get(cue.id);
    if (action && cue?.start != null) {
      action.reset().play();
      action.time = time - cue.start;
      mixer.update(0);
    }
    renderer.render(scene, camera);
    if (!video.paused && !document.hidden) frame = requestAnimationFrame(draw);
  };
  const resize = () => {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    const halfHeight = Math.max(1.1, (0.97 * h) / w);
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.right = (halfHeight * w) / h;
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  for (const event of ['play', 'pause', 'seeking', 'seeked', 'timeupdate', 'ended'])
    video.addEventListener(event, draw, { signal });
  document.addEventListener('visibilitychange', draw, { signal });
  signal.addEventListener(
    'abort',
    () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mixer.stopAllAction();
      mixer.uncacheRoot(rig.scene);
      rig.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const material of [object.material].flat()) material.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
    { once: true },
  );
  resize();
}
