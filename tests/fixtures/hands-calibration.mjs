import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createHandsRig, neutralHandsPose } from '../../packages/lesson-component/src/hands-rig.ts';
import { SigningPlayer } from '../../packages/lesson-component/src/signing-player.ts';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
};
const { root, bones } = createHandsRig();
assert.equal(bones.size, 43);
assert.equal([...bones.keys()].filter(name => /Hand\w+[123]$/.test(name)).length, 30);
assert.deepEqual(bones.get('LeftHand').position.toArray(), [0, -.42, 0]);
neutralHandsPose(bones);
root.updateMatrixWorld(true);
assert.ok(bones.get('LeftHand').getWorldPosition(new THREE.Vector3()).x > 0);
assert.ok(bones.get('RightHand').getWorldPosition(new THREE.Vector3()).x < 0);
assert.ok(bones.get('LeftHandThumb1').getWorldPosition(new THREE.Vector3()).x < bones.get('LeftHand').getWorldPosition(new THREE.Vector3()).x);
const clip = new THREE.AnimationClip('calibration-not-sign-language', 2, [
  new THREE.VectorKeyframeTrack('LeftHand.position', [0, 2], [0, -.42, 0, -.15, -.42, .08]),
]);
const bytes = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true, animations: [clip] }));
const asset = { url: '/api/v1/lessons/alx-transforming-africa/signing-assets/calibration.glb?version=1',
  sha256: createHash('sha256').update(bytes).digest('hex') };
const segment = { id: 'calibration-only', cue_ids: ['cue-2'], start: 1, end: 9, status: 'approved',
  motion: asset, clip_name: clip.name, natural_duration: 2, playback_rate: 1, presentation: 'hands-only',
  interpreter_video: null, requires_non_manual: false, hands_ambiguous: false, approved_render_sha256: '1'.repeat(64) };
const manifest = { schema_version: '1.0', language: 'ethsl', media_id: 'alx-africa-intro-v1', content_version: 1,
  lesson_id: 'alx-transforming-africa', course_version_id: 'alx-demo-v1',
  rig_version: 'access-hands-v1', rig: asset, approved_count: 1, segments: [segment] };
const scene = new THREE.Scene();
const player = new SigningPlayer(scene, manifest, { readAsset: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
await player.initialize(new URL('http://localhost/api/v1/'), new AbortController().signal);
for (const [time, expected] of [[1, 0], [2, -.075], [7, -.15], [1.5, -.0375], [1, 0]]) {
  assert.equal(player.update(time)?.id, segment.id);
  assert.ok(Math.abs(scene.getObjectByName('LeftHand').position.x - expected) < .00001);
}
assert.equal(player.update(10), undefined);
assert.equal(scene.children[0].visible, false);
assert.equal(scene.getObjectByName('LeftHand').position.x, 0);
assert.equal(player.update(2)?.id, segment.id);
player.dispose();
assert.equal(scene.children.length, 0);
await writeFile(join(process.argv[2], 'calibration.glb'), bytes);
await writeFile(join(process.argv[2], 'calibration.json'), JSON.stringify(manifest));
console.log('Synthetic rig, chirality, absolute seek, hold, gap reset and disposal assertions passed. Not EthSL content.');
