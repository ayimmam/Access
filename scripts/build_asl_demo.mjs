// Original, unreviewed ASL concept animation for the ALX fixture.
// Lexical references: https://www.lifeprint.com/asl101/pages-layout/signs-listedbylesson.htm
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createAvatarRig } from './avatar-rig.mjs';

// Pass --ethsl to bake the independent EthSL pronoun study on the same skeleton.
const ethsl = process.argv.includes('--ethsl');
const source = await readFile(new URL('../example lessons/into-caption.txt', import.meta.url));
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== '65ac3b3c6101d70ae0aadf286311cd0a2e233f654ef61554da8a0842ee0b3dba') {
  throw new Error('Re-author the ASL demo for the changed caption source');
}
const starts = Array.from(source.toString().matchAll(/^(\d+):(\d+)\s*$/gm), (m) => 60 * Number(m[1]) + Number(m[2]));
const duration = 121.496916;
const { root, bones } = createAvatarRig();
const exporter = new GLTFExporter();
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((bytes) => {
      this.result = bytes;
      this.onloadend?.();
    });
  }
};
const output = new URL(ethsl ? '../examples/assets/ethsl-demo/' : '../examples/assets/asl-demo/', import.meta.url);
await mkdir(output, { recursive: true });
async function save(name, scene, animations = []) {
  await writeFile(new URL(name, output), Buffer.from(await exporter.parseAsync(scene, { binary: true, animations })));
}
root.userData = { captionSha256: hash, targetLanguage: ethsl ? 'ethsl' : 'ase', reviewStatus: 'unreviewed-demo' };
if (!ethsl) await save('avatar.glb', root);

// Wrist targets in front-view rig coordinates. Hand direction and palm normal
// are independent so a flat hand can face up, forward, down or inward.
const v = (x, y, z) => new T.Vector3(x, y, z);
const up = v(0, 1, 0),
  down = v(0, -1, 0),
  front = v(0, 0, 1),
  inward = v(0, 0, -1);
const across = v(1, 0, 0),
  backAcross = v(-1, 0, 0);
const hand = (x, y, z, shape = 'flat', tips = up, palm = front) => ({ pos: v(x, y, z), shape, tips, palm });
const restR = hand(-0.31, 1.05, 0.22, 'loose', down, inward);
const restL = hand(0.31, 1.05, 0.22, 'loose', down, inward);
const pose = (r = restR, l = restL, head = 0) => ({ r, l, head });
const base = hand(0.13, 1.42, 0.39, 'flat', backAcross, up);
const fist = (x, y, z) => hand(x, y, z, 'fist', front, down);
const point = (x, y, z, tips = front) => hand(x, y, z, 'index', tips, down);
const headPoint = point(-0.22, 2.13, 0.22, across);
const gather = hand(0.01, 1.47, 0.39, 'gather', down, front);
const graspHead = hand(-0.18, 2.05, 0.28, 'gather', up, inward);
const near = pose(fist(-0.09, 1.5, 0.4), fist(0.09, 1.5, 0.4));
const far = pose(fist(-0.34, 1.5, 0.4), fist(0.34, 1.5, 0.4));
const tap = pose(fist(-0.015, 1.54, 0.4), fist(0.15, 1.43, 0.4));
const lift = pose(fist(-0.07, 1.68, 0.42), fist(0.15, 1.43, 0.4));
const learn = [pose(hand(-0.05, 1.55, 0.42, 'spread', down, front), base), pose(gather, base), pose(graspHead, base)];
const know = [pose(hand(-0.28, 1.9, 0.27, 'flat', up, inward)), pose(hand(-0.2, 2.05, 0.24, 'flat', up, inward))];
const help = [
  pose(hand(0.02, 1.48, 0.42, 'thumb', across, front), base),
  pose(hand(-0.12, 1.66, 0.32, 'thumb', across, front), hand(0.0, 1.59, 0.32, 'flat', backAcross, up)),
];
const standing = pose(hand(-0.04, 1.7, 0.42, 'V', down, inward), base);
const fallen = pose(hand(-0.13, 1.5, 0.42, 'V', across, up), base);
const worldLeft = hand(0.08, 1.39, 0.44, 'W', front, down);
const signs = {
  ALX: ['A', 'L', 'hook'].map((shape) => pose(hand(-0.29, 1.72, 0.44, shape))),
  GROUP: [
    pose(hand(-0.25, 1.49, 0.3, 'curve'), hand(0.25, 1.49, 0.3, 'curve')),
    pose(hand(-0.38, 1.49, 0.44, 'curve', up, across), hand(0.38, 1.49, 0.44, 'curve', up, backAcross)),
    pose(hand(-0.13, 1.49, 0.58, 'curve', up, inward), hand(0.13, 1.49, 0.58, 'curve', up, inward)),
  ],
  FRIEND: [
    pose(hand(-0.06, 1.54, 0.41, 'hook', across, down), hand(0.11, 1.44, 0.41, 'hook', backAcross, up)),
    pose(hand(-0.06, 1.44, 0.41, 'hook', across, up), hand(0.11, 1.54, 0.41, 'hook', backAcross, down)),
  ],
  TEACHER: [
    pose(hand(-0.22, 2.05, 0.25, 'gather'), hand(0.22, 2.05, 0.25, 'gather')),
    pose(hand(-0.22, 1.99, 0.53, 'gather', front, down), hand(0.22, 1.99, 0.53, 'gather', front, down)),
    pose(hand(-0.18, 1.5, 0.4, 'flat', up, across), hand(0.18, 1.5, 0.4, 'flat', up, backAcross)),
    pose(hand(-0.18, 1.2, 0.4, 'flat', up, across), hand(0.18, 1.2, 0.4, 'flat', up, backAcross)),
  ],
  TOMORROW: [pose(hand(-0.22, 1.93, 0.24, 'A')), pose(hand(-0.25, 2.0, 0.5, 'A'))],
  MOON: [pose(hand(-0.22, 2.15, 0.29, 'crescent')), pose(hand(-0.4, 2.31, 0.38, 'crescent'))],
  FROM: [
    pose(hand(0.04, 1.54, 0.46, 'index', up, across), hand(0.12, 1.52, 0.46, 'index', up, backAcross)),
    pose(hand(-0.29, 1.54, 0.3, 'hook', up, across), hand(0.12, 1.52, 0.46, 'index', up, backAcross)),
  ],
  INSPIRE: [
    pose(hand(-0.15, 1.33, 0.36, 'gather'), hand(0.15, 1.33, 0.36, 'gather')),
    pose(hand(-0.23, 1.67, 0.34, 'spread'), hand(0.23, 1.67, 0.34, 'spread')),
  ],
  ALWAYS: Array.from({ length: 9 }, (_, i) =>
    pose(
      hand(
        -0.23 + 0.09 * Math.cos((i * Math.PI) / 2),
        1.6 + 0.09 * Math.sin((i * Math.PI) / 2),
        0.43,
        'index',
        up,
        inward,
      ),
    ),
  ),
  BELIEVE: [
    pose(headPoint),
    pose(hand(-0.06, 1.48, 0.4, 'curve', across, down), hand(0.1, 1.42, 0.4, 'curve', backAcross, up)),
  ],
  PATIENT: [pose(hand(-0.08, 1.93, 0.29, 'thumb', up, inward)), pose(hand(-0.08, 1.8, 0.3, 'thumb', up, inward))],
  FALL: [standing, fallen],
  RISE: [fallen, standing],
  NOT: [pose(hand(-0.1, 1.93, 0.29, 'thumb', up, inward)), pose(hand(-0.25, 1.83, 0.46, 'thumb', up, inward))],
  TRY: [
    pose(fist(-0.18, 1.52, 0.34), fist(0.18, 1.52, 0.34)),
    pose(hand(-0.22, 1.48, 0.51, 'thumb', front, up), hand(0.22, 1.48, 0.51, 'thumb', front, up)),
  ],
  CHANGE: [
    pose(hand(-0.03, 1.55, 0.42, 'hook', across, down), hand(0.06, 1.4, 0.42, 'hook', backAcross, up)),
    pose(hand(-0.03, 1.4, 0.42, 'hook', across, up), hand(0.06, 1.55, 0.42, 'hook', backAcross, down)),
  ],
  WORLD: [
    pose(hand(-0.03, 1.53, 0.44, 'W', front, down), worldLeft),
    pose(hand(-0.21, 1.42, 0.46, 'W', front, across), worldLeft),
    pose(hand(-0.04, 1.26, 0.44, 'W', front, up), hand(0.08, 1.43, 0.44, 'W', front, down)),
  ],
  FUTURE: [pose(hand(-0.25, 2.0, 0.29, 'flat', up, across)), pose(hand(-0.18, 1.93, 0.7, 'flat', front, across))],
  SAY: [pose(point(-0.06, 1.97, 0.3, across)), pose(point(-0.07, 1.98, 0.49, front))],
  MUSIC: [
    pose(hand(-0.18, 1.53, 0.38, 'flat', across, down), base),
    pose(hand(0.02, 1.58, 0.38, 'flat', up, down), base),
    pose(hand(-0.18, 1.53, 0.38, 'flat', across, down), base),
  ],
  HELP: help,
  LEARN: learn,
  KNOW: know,
  ME: [pose(point(-0.13, 1.49, 0.42, inward)), pose(point(-0.1, 1.49, 0.29, inward))],
  YOU: [pose(point(-0.2, 1.48, 0.31)), pose(point(-0.12, 1.53, 0.56))],
  TOGETHER: [
    near,
    pose(fist(0.0, 1.56, 0.45), fist(0.18, 1.56, 0.45)),
    pose(fist(-0.17, 1.47, 0.48), fist(0.01, 1.47, 0.48)),
    near,
  ],
  WORK: [lift, tap, lift, tap],
  WITH: [far, near],
  THINK: [pose(point(-0.3, 1.91, 0.32, up)), pose(headPoint)],
  UNDERSTAND: [pose(hand(-0.21, 2.06, 0.25, 'fist')), pose(hand(-0.21, 2.06, 0.25, 'index'))],
  WAIT: [
    pose(hand(-0.28, 1.43, 0.42, 'spread', front, up), hand(0.28, 1.45, 0.42, 'loose', front, up)),
    pose(hand(-0.28, 1.46, 0.42, 'loose', front, up), hand(0.28, 1.42, 0.42, 'spread', front, up)),
  ],
  GROW: [
    pose(hand(0, 1.4, 0.43, 'gather'), hand(0.12, 1.48, 0.42, 'curve', backAcross, front)),
    pose(hand(0, 1.77, 0.43, 'spread'), hand(0.12, 1.48, 0.42, 'curve', backAcross, front)),
  ],
  MEET: [
    pose(hand(-0.34, 1.47, 0.42, 'index', up, across), hand(0.34, 1.47, 0.42, 'index', up, backAcross)),
    pose(hand(-0.07, 1.47, 0.42, 'index', up, across), hand(0.07, 1.47, 0.42, 'index', up, backAcross)),
  ],
  WANT: [
    pose(hand(-0.23, 1.46, 0.59, 'spread', front, up), hand(0.23, 1.46, 0.59, 'spread', front, up)),
    pose(hand(-0.23, 1.44, 0.34, 'curve', front, up), hand(0.23, 1.44, 0.34, 'curve', front, up)),
  ],
  CAN: [
    pose(fist(-0.24, 1.59, 0.38), fist(0.24, 1.59, 0.38)),
    pose(fist(-0.24, 1.38, 0.38), fist(0.24, 1.38, 0.38), 0.08),
  ],
  FATHER: [pose(hand(-0.19, 2.12, 0.36, 'spread')), pose(hand(-0.15, 2.15, 0.24, 'spread'))],
  DREAM: [pose(headPoint), pose(hand(-0.19, 2.2, 0.36, 'hook')), pose(hand(-0.2, 2.27, 0.44, 'index'))],
  HARD: [
    pose(hand(-0.1, 1.66, 0.41, 'bentV', down, front), hand(0.1, 1.4, 0.41, 'bentV', backAcross, up)),
    pose(hand(-0.02, 1.53, 0.41, 'bentV', down, front), hand(0.1, 1.4, 0.41, 'bentV', backAcross, up)),
  ],
  GOOD: [
    pose(hand(-0.04, 1.92, 0.3, 'flat', up, inward), base),
    pose(hand(-0.05, 1.48, 0.42, 'flat', across, up), base),
  ],
  BEST: [pose(hand(-0.03, 1.91, 0.3, 'flat', up, inward)), pose(hand(-0.15, 2.05, 0.49, 'thumb', up, front))],
};
// A condensed draft of the concepts in each caption window. Full sentence
// interpretation and facial grammar still need fluent ASL review.
const phrases = [
  'MUSIC',
  'ALX GROUP TOGETHER FRIEND TEACHER HELP',
  'GROUP HELP ME LEARN GROW',
  'LEARN YOU NOT HARD PATIENT',
  'PATIENT GROW TOMORROW NOT WAIT',
  'MOON TRY THINK UNDERSTAND',
  'YOU MEET FRIEND DREAM WORK HARD',
  'ME GROUP WITH WANT WORLD CHANGE',
  'YOU WANT YOU KNOW YOU FROM',
  'FUTURE YOU CAN TRY INSPIRE',
  'HARD ME NOT KNOW LEARN',
  'ME LEARN BELIEVE ME CAN',
  'ME CAN FATHER ALWAYS SAY FALL RISE',
  'ME DREAM WORK TOGETHER',
  'HARD THINK CHANGE UNDERSTAND',
  'ALWAYS YOU TRY BEST',
];
if (starts.length !== phrases.length) throw new Error('Caption count differs from authored timeline');
// EthSL indexing descriptions: Translation of Continuous Signs in Ethiopian Sign
// Language to Amharic Text, table 2.2. These are original concept studies.
const ethslReference = 'https://www.academia.edu/64242781/Translation_of_Continuous_Signs_in_Ethiopian_Sign_Language_to_Amharic_Text';
const ethslSigns = {
  I: [pose(point(-0.17, 1.58, 0.46, inward)), pose(point(-0.05, 1.58, 0.28, inward))],
  YOU: [pose(point(-0.16, 1.55, 0.35)), pose(point(-0.08, 1.56, 0.62))],
  WE: [-0.19, -0.09, 0.02, 0.13, 0.19].map((x, i) =>
    pose(point(x, 1.55, 0.34 + 0.08 * Math.sin(i * Math.PI / 4), inward))),
};
// Offsets are within the original caption window; uncovered time stays neutral.
const ethslCues = new Map([
  [1, ['I', 1.7]], [3, ['YOU', 1.3]], [4, ['YOU', 0.7]],
  [5, ['YOU', 0.5]], [6, ['YOU', 0]], [7, ['I', 0.2]],
  [9, ['YOU', 0.1]], [11, ['I', 0.2]], [12, ['I', 0.3]], [13, ['WE', 3.4]],
]);
if (ethsl) Object.assign(root.userData, { reference: ethslReference, coverage: 'Selected pronouns only' });
const shapes = {
  flat: [0, 0, 0, 0, 0],
  spread: [0, 0, 0, 0, 0],
  loose: [0.25, 0.25, 0.35, 0.45, 0.5],
  fist: [0.85, 1.45, 1.45, 1.45, 1.45],
  thumb: [0, 1.45, 1.45, 1.45, 1.45],
  index: [0.85, 0, 1.45, 1.45, 1.45],
  curve: [0.5, 0.72, 0.72, 0.72, 0.72],
  gather: [0.7, 0.65, 0.65, 0.65, 0.65],
  hook: [0.8, 0.85, 1.45, 1.45, 1.45],
  A: [0.12, 1.45, 1.45, 1.45, 1.45],
  L: [0, 0, 1.45, 1.45, 1.45],
  crescent: [0.35, 0.48, 1.45, 1.45, 1.45],
  V: [0.8, 0, 0, 1.45, 1.45],
  W: [0.8, 0, 0, 0, 1.45],
  bentV: [0.8, 0.7, 0.7, 1.45, 1.45],
};
const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
function orient(joint, world) {
  joint.quaternion.copy(joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
  joint.updateWorldMatrix(false, true);
}
function arm(side, h) {
  const sign = side === 'Left' ? 1 : -1;
  const upper = bones.get(side + 'Arm'),
    lower = bones.get(side + 'ForeArm'),
    wrist = bones.get(side + 'Hand');
  const shoulder = upper.getWorldPosition(v()),
    delta = h.pos.clone().sub(shoulder);
  const length = Math.min(0.838, delta.length()),
    axis = delta.normalize();
  const pole = v(sign * 0.75, -0.8, -0.25);
  pole.addScaledVector(axis, -pole.dot(axis)).normalize();
  const elbow = shoulder
    .clone()
    .addScaledVector(axis, length / 2)
    .addScaledVector(pole, Math.sqrt(0.42 ** 2 - (length / 2) ** 2));
  orient(upper, new T.Quaternion().setFromUnitVectors(down, elbow.clone().sub(shoulder).normalize()));
  orient(lower, new T.Quaternion().setFromUnitVectors(down, h.pos.clone().sub(elbow).normalize()));
  const y = h.tips.clone().negate(),
    z = h.palm.clone().addScaledVector(y, -y.dot(h.palm));
  if (z.lengthSq() < 0.001) z.copy(front);
  z.normalize();
  const x = y.clone().cross(z).normalize();
  orient(wrist, new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, x.clone().cross(y))));
  fingers.forEach((finger, i) => {
    for (let j = 1; j <= 3; j++) {
      const curl = shapes[h.shape][i];
      const spread = ['spread', 'V', 'W'].includes(h.shape) ? 0.14 : 0.018;
      bones
        .get(side + 'Hand' + finger + j)
        .rotation.set(-curl, 0, j === 1 ? sign * (i === 0 ? -0.8 : (i - 2.5) * spread) : 0);
    }
  });
}
const animated = [...bones].filter(([name]) => name === 'Head' || /Arm|Hand/.test(name));
const clips = [];
for (const [i, phrase] of phrases.entries()) {
  const end = starts[i + 1] ?? duration,
    times = [],
    values = new Map(animated.map(([name]) => [name, []]));
  function key(time, p, headTurn = 0) {
    arm('Right', p.r);
    arm('Left', p.l);
    bones.get('Head').rotation.set(p.head, headTurn, 0);
    times.push(time);
    for (const [name, joint] of animated) values.get(name).push(...joint.quaternion.toArray());
  }
  const entry = ethslCues.get(i);
  if (ethsl && !entry) continue;
  const tokens = ethsl ? [entry[0]] : phrase.split(' '),
    window = end - starts[i];
  const period = Math.min(1.45, window / tokens.length);
  key(0, pose());
  const offset = ethsl ? entry[1] : 0;
  if (offset > 0) key(offset, pose());
  const vocabulary = ethsl ? ethslSigns : signs;
  tokens.forEach((word, k) =>
    vocabulary[word].forEach((p, j, poses) => {
      key(
        offset + (k * window) / tokens.length + period * (0.1 + (0.77 * j) / (poses.length - 1)),
        p,
        word === 'NOT' ? (j === 0 ? -0.23 : 0.23) : 0,
      );
    }),
  );
  key(offset + ((tokens.length - 1) * window) / tokens.length + period, pose());
  const tracks = animated.map(([name]) => new T.QuaternionKeyframeTrack(name + '.quaternion', times, values.get(name)));
  clips.push(new T.AnimationClip('cue-' + (i + 1), window, tracks));
}
// The second GLB carries only the joint hierarchy and keyframes.
root.userData.sourcePassages = source
  .toString()
  .trim()
  .split(/^\d+:\d+\s*$/m)
  .slice(1)
  .map((block) =>
    block
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(' '),
  );
root.traverse((o) => {
  if (o.isMesh) o.visible = false;
});
const buffers = await exporter.parseAsync(root, { binary: true, animations: clips, onlyVisible: true });
await writeFile(new URL('lesson-motion.glb', output), Buffer.from(buffers));
