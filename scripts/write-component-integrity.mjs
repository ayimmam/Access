import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../packages/lesson-component/dist/', import.meta.url);
const manifest = {};
for (const name of ['lesson.js', 'jobs.js']) {
  const bytes = await readFile(new URL(name, directory));
  manifest[name] = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
}
await writeFile(new URL('integrity.json', directory), JSON.stringify(manifest) + '\n');
