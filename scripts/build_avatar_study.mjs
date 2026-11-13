import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createAvatarRig } from './avatar-rig.mjs';

// GLTFExporter uses the browser FileReader API to encode embedded buffers.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(value => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const { values } = parseArgs({ options: {
  manifest: { type: 'string' }, capture: { type: 'string' }, output: { type: 'string' },
  'source-kind': { type: 'string' }, segment: { type: 'string' },
} });
if (!values.manifest || !values.capture || !values.output || !['presenter-study', 'interpreter-draft'].includes(values['source-kind'])) {
  throw new Error('Required arguments are --manifest, --capture, --output and --source-kind presenter-study|interpreter-draft');
}
const manifest = JSON.parse(await readFile(values.manifest, 'utf8'));
if (manifest.schema_version !== '1.0' || !['ethsl', 'asl'].includes(manifest.language)) throw new Error('Unsupported manifest');
let previousEnd = 0;
for (const segment of manifest.segments) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(segment.id) || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < previousEnd || segment.end <= segment.start) throw new Error('Invalid source segment identity or timeline');
  previousEnd = segment.end;
}
if (manifest.segments.some(segment => segment.status === 'approved')) throw new Error('Use a pending authoring manifest');
const capture = (await readFile(values.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
const metadata = capture[0];
let frames = capture.filter(record => record.type === 'frame');
if (metadata.type !== 'metadata' || capture.at(-1)?.frames !== frames.length || !frames.length) throw new Error('Incomplete capture');
if (frames.some((frame, index) => !Number.isFinite(frame.time) || (index && frame.time <= frames[index - 1].time))) throw new Error('Capture timestamps must increase');
const selectedSegments = values.segment ? manifest.segments.filter(segment => segment.id === values.segment) : manifest.segments;
if (!selectedSegments.length) throw new Error('Unknown source segment');
let takeDuration;
if (values.segment) {
  const fps = metadata.fps || 1 / (frames.at(-1).time - frames.at(-2)?.time);
  takeDuration = frames.at(-1).time + 1 / fps;
  const segment = selectedSegments[0];
  if (!Number.isFinite(takeDuration) || takeDuration <= 0 || takeDuration > segment.end - segment.start + .001) throw new Error('Complete take must fit its source window; revise the interpretation or timeline');
  frames = frames.map(frame => ({ ...frame, time: frame.time + segment.start }));
} else if (frames.at(-1).time < manifest.segments.at(-1).start) {
  throw new Error('Capture must span the manifest timeline, or select a single --segment');
}
const output = resolve(values.output);
await mkdir(resolve(output, '..'), { recursive: true });
await mkdir(output); // A fresh directory avoids replacing previous authoring work.

const { root, bones, morphs } = createAvatarRig();
const exporter = new GLTFExporter();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function exportAsset(filename, object, animations = []) {
  const buffer = await exporter.parseAsync(object, { binary: true, animations, onlyVisible: false });
  const bytes = Buffer.from(buffer);
  await writeFile(join(output, filename), bytes, { flag: 'wx' });
  return { filename, sha256: hash(bytes), license: 'Source-derived motion draft — source performance/distribution rights pending review' };
}
manifest.rig = await exportAsset('access-african-woman-v1.glb', root);
manifest.rig.license = 'MIT — original procedural character, see repository LICENSE';
const calibration = new Map([...bones].map(([name, joint]) => [name, joint.quaternion.clone()]));
const cameraPoint = point => new THREE.Vector3(point[0], -point[1], -point[2]);
const point = (points, index) => points?.[index] && cameraPoint(points[index]);

function orientation(direction, forward) {
  if (direction.lengthSq() < 1e-8) return undefined;
  const y = direction.clone().normalize().negate();
  let z = forward.clone().addScaledVector(y, -forward.dot(y));
  if (z.lengthSq() < 1e-8) z = new THREE.Vector3(1, 0, 0).addScaledVector(y, -y.x);
  if (z.lengthSq() < 1e-8) return undefined;
  z.normalize();
  const x = y.clone().cross(z).normalize();
  z = x.clone().cross(y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

function setWorld(name, rotation) {
  if (!rotation) return;
  const joint = bones.get(name);
  const parentRotation = joint.parent.getWorldQuaternion(new THREE.Quaternion());
  joint.quaternion.copy(parentRotation.invert().multiply(rotation));
  if (values['source-kind'] === 'presenter-study' && ['Spine', 'Head'].includes(name)) {
    const angles = new THREE.Euler().setFromQuaternion(joint.quaternion, 'YXZ');
    angles.x = THREE.MathUtils.clamp(angles.x, -.25, .25);
    angles.y = THREE.MathUtils.clamp(angles.y, -.5, .5);
    angles.z = THREE.MathUtils.clamp(angles.z, -.2, .2);
    joint.quaternion.setFromEuler(angles);
  }
  joint.updateWorldMatrix(false, true);
}

function applyFrame(frame) {
  const pose = frame.pose_world;
  let forward = new THREE.Vector3(0, 0, 1);
  if (pose?.length === 33) {
    const left = point(pose, 11), right = point(pose, 12);
    const hips = point(pose, 23).add(point(pose, 24)).multiplyScalar(.5);
    const up = left.clone().add(right).multiplyScalar(.5).sub(hips).normalize();
    const x = left.clone().sub(right).normalize();
    forward = x.clone().cross(up).normalize();
    const torso = orientation(up.clone().negate(), forward);
    setWorld('Spine', torso);
    const eyes = point(pose, 2).add(point(pose, 5)).multiplyScalar(.5);
    const mouth = point(pose, 9).add(point(pose, 10)).multiplyScalar(.5);
    const headForward = point(pose, 7).sub(point(pose, 8)).cross(eyes.clone().sub(mouth)).normalize();
    setWorld('Head', orientation(mouth.sub(eyes), headForward));
    for (const [side, shoulder, elbow, wrist] of [['Left', 11, 13, 15], ['Right', 12, 14, 16]]) {
      if (frame.pose_visibility && [shoulder, elbow, wrist].some(index => frame.pose_visibility[index] < .5)) continue;
      setWorld(`${side}Arm`, orientation(point(pose, elbow).sub(point(pose, shoulder)), forward));
      setWorld(`${side}ForeArm`, orientation(point(pose, wrist).sub(point(pose, elbow)), forward));
    }
  }
  for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
    const hand = frame.hands?.[side];
    if (!hand || hand.confidence < .5 || frame.handedness_ambiguous) continue;
    const points = hand.world;
    if (points?.length !== 21) continue;
    const wrist = point(points, 0);
    const normal = point(points, 5).sub(wrist).cross(point(points, 17).sub(wrist)).multiplyScalar(sign).normalize();
    setWorld(`${side}Hand`, orientation(point(points, 9).sub(wrist), normal));
    for (const [finger, indices] of [
      ['Thumb', [1, 2, 3, 4]], ['Index', [5, 6, 7, 8]], ['Middle', [9, 10, 11, 12]],
      ['Ring', [13, 14, 15, 16]], ['Pinky', [17, 18, 19, 20]],
    ]) {
      for (let joint = 1; joint <= 3; joint++) {
        setWorld(`${side}Hand${finger}${joint}`, orientation(point(points, indices[joint]).sub(point(points, indices[joint - 1])), normal));
      }
    }
  }
  for (const object of morphs) {
    for (const [name, index] of Object.entries(object.morphTargetDictionary)) {
      object.morphTargetInfluences[index] = Math.max(0, Math.min(1, frame.face_blendshapes?.[name] || 0));
    }
  }
}

function nearestBefore(time) {
  let selected = frames[0];
  for (const frame of frames) {
    if (frame.time > time) break;
    selected = frame;
  }
  return selected;
}

for (const segment of selectedSegments) {
  for (const [name, joint] of bones) joint.quaternion.copy(calibration.get(name));
  root.updateMatrixWorld(true);
  const duration = takeDuration || segment.end - segment.start;
  const motionEnd = segment.start + duration;
  const samples = [
    { ...nearestBefore(segment.start), time: segment.start },
    ...frames.filter(frame => frame.time > segment.start && frame.time < motionEnd),
    { ...nearestBefore(motionEnd), time: motionEnd },
  ];
  const times = samples.map(frame => frame.time - segment.start);
  const rotations = new Map([...bones.keys()].map(name => [name, []]));
  const expressions = new Map(morphs.map(object => [object.name, []]));
  for (const frame of samples) {
    applyFrame(frame);
    for (const [name, joint] of bones) {
      const target = rotations.get(name);
      const previous = target.length && new THREE.Quaternion().fromArray(target, target.length - 4);
      const quaternion = joint.quaternion.clone();
      if (previous && previous.dot(quaternion) < 0) quaternion.set(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
      target.push(...quaternion.toArray());
    }
    for (const object of morphs) expressions.get(object.name).push(...object.morphTargetInfluences);
  }
  const tracks = [...rotations].map(([name, values]) => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  for (const [name, values] of expressions) tracks.push(new THREE.NumberKeyframeTrack(`${name}.morphTargetInfluences`, times, values));
  const clip = new THREE.AnimationClip(`${segment.id}-draft`, duration, tracks);
  const clipRoot = root.clone(true);
  const meshes = [];
  clipRoot.traverse(object => { if (object.isMesh) meshes.push(object); });
  // Morph-target animation export needs the target mesh. Reuse compact face meshes only.
  for (const object of meshes) if (!object.morphTargetInfluences?.length) object.removeFromParent();
  segment.motion = await exportAsset(`${segment.id}-draft.glb`, clipRoot, [clip]);
  segment.status = 'machine-draft';
  segment.clip_name = clip.name;
  segment.natural_duration = duration;
  segment.playback_rate = 1;
  delete segment.review_ref;
  delete segment.consent_ref;
}
const filename = `${manifest.lesson_id}-v${manifest.content_version}-${manifest.language}.json`;
await writeFile(join(output, filename), JSON.stringify(manifest, null, 2), { flag: 'wx' });
await writeFile(join(output, 'study-info.json'), JSON.stringify({
  schema_version: '1.0', source_kind: values['source-kind'], capture_source_sha256: metadata.source_sha256,
  capture_sha256: hash(await readFile(values.capture)), language_target: manifest.language,
  review_status: 'machine-draft', translation_status: 'pending',
  frames: frames.length, rig_bones: bones.size, finger_bones: [...bones.keys()].filter(name => /Hand\w+[123]$/.test(name)).length,
  face_morphs: morphs.map(object => ({ mesh: object.name, names: Object.keys(object.morphTargetDictionary) })),
  limitations: ['Monocular depth and wrist twist need correction', 'Missing observations hold the previous bone pose',
    'Transitions require editing', 'Source-presenter gestures require language translation before signing review'],
  study_view_stabilization: values['source-kind'] === 'presenter-study' ? 'Torso/head local rotation limited for frontal visibility' : null,
}, null, 2), { flag: 'wx' });
console.log(`Created ${selectedSegments.length} machine-draft clips and an articulated original rig in ${output}`);
