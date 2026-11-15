import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = resolve(process.env.ACCESS_COMPONENT_DIST || fileURLToPath(new URL('../packages/lesson-component/dist/', import.meta.url)));
const build = JSON.parse(await readFile(resolve(directory, 'build-meta.json'), 'utf8'));
const names = Object.keys(build.outputs).filter(name => /\.(js|css)$/.test(name)).map(name => basename(name)).sort();
if (new Set(names).size !== names.length || !['lesson.js', 'jobs.js', 'avatar-review.js'].every(name => names.includes(name))) throw new Error('Invalid component build outputs');
const manifest = {};
for (const name of ['lesson.js', 'jobs.js']) {
  const bytes = await readFile(resolve(directory, name));
  manifest[name] = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}
await writeFile(resolve(directory, 'integrity.json'), JSON.stringify(manifest) + '\n');
const files = [];
for (const name of names) {
  const bytes = await readFile(resolve(directory, name));
  files.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const releaseId = createHash('sha256').update(JSON.stringify(files)).digest('hex');
let commit = process.env.ACCESS_SOURCE_REVISION || null;
let dirty = null;
try {
  commit ||= execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
} catch {}
if (commit !== null && !/^[0-9a-f]{40}$/.test(commit)) throw new Error('Invalid source revision');
const release = { schema_version: '1.0', release_id: releaseId, component_version: '0.1.0',
  base_path: `/components/releases/${releaseId}/`, source_revision: commit, working_tree_dirty: dirty,
  files, integrity: manifest };
const frozen = resolve(process.env.ACCESS_COMPONENT_RELEASE_DIR || resolve(directory, 'releases'), releaseId);
await mkdir(frozen, { recursive: true });
for (const { path: name, sha256 } of files) {
  try {
    const existing = await readFile(resolve(frozen, name));
    if (createHash('sha256').update(existing).digest('hex') !== sha256) throw new Error('Frozen release differs from its content hash');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await copyFile(resolve(directory, name), resolve(frozen, name));
  }
}
let frozenRelease = release;
for (const [name, value] of [['integrity.json', manifest], ['release.json', release]]) {
  try {
    await writeFile(resolve(frozen, name), JSON.stringify(value) + '\n', { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = JSON.parse(await readFile(resolve(frozen, name), 'utf8'));
    if (name === 'integrity.json' && JSON.stringify(existing) !== JSON.stringify(manifest)) throw new Error('Frozen integrity metadata changed');
    if (name === 'release.json') {
      if (existing.release_id !== releaseId || existing.base_path !== release.base_path || JSON.stringify(existing.files) !== JSON.stringify(files) || JSON.stringify(existing.integrity) !== JSON.stringify(manifest)) throw new Error('Frozen release metadata changed');
      frozenRelease = existing;
    }
  }
}
await writeFile(resolve(directory, 'release.json'), JSON.stringify(frozenRelease) + '\n');
console.log(`Frozen component release: ${release.base_path}`);
