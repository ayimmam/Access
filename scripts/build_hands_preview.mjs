import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createHandsRig, neutralHandsPose, HANDS_RIG_VERSION } from '../packages/lesson-component/src/hands-rig.ts';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.(); }); }
};
const { values } = parseArgs({ options: { manifest: { type: 'string' }, output: { type: 'string' } } });
if (!values.manifest || !values.output) throw new Error('Provide --manifest and a new --output directory');
const manifest = JSON.parse(await readFile(values.manifest, 'utf8'));
if (manifest.language !== 'ethsl' || manifest.segments.some(segment => segment.motion || segment.status === 'approved')) {
  throw new Error('Use a pending EthSL manifest with empty motion slots');
}
const { root, bones } = createHandsRig();
neutralHandsPose(bones);
const bytes = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true }));
manifest.rig_version = HANDS_RIG_VERSION;
manifest.render_profile = 'hands-front-v1';
manifest.rig = { filename: `${HANDS_RIG_VERSION}.glb`, sha256: createHash('sha256').update(bytes).digest('hex'),
  license: 'MIT — original project-authored hands rig; anatomical and EthSL review pending' };
const output = resolve(values.output);
await mkdir(output);
await writeFile(join(output, manifest.rig.filename), bytes, { flag: 'wx' });
await writeFile(join(output, `${manifest.lesson_id}-v${manifest.content_version}-ethsl.json`), JSON.stringify(manifest, null, 2), { flag: 'wx' });
console.log(`Exported ${bones.size} joints; ${manifest.segments.length} pending cue slots; zero lesson motions.`);
