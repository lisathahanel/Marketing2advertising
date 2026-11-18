import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const manifestPath = path.join(dist, '.vite', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entry = manifest['src/embed.tsx'];

if (!entry?.file) {
  throw new Error('Vite manifest is missing the src/embed.tsx entry.');
}

const assetsDir = path.join(dist, 'assets');
await mkdir(assetsDir, { recursive: true });

// Vite/Rolldown currently emits the shared M2A app stylesheet as src-*.css.
// The entry manifest does not list CSS directly because the stylesheet is
// imported through the app entry's shared module graph.
const cssFiles = (await readdir(assetsDir)).filter((name) => name.endsWith('.css'));
const cssFile = cssFiles.find((name) => name.startsWith('src-'));

if (!cssFile) {
  throw new Error('Could not find the shared M2A app stylesheet (expected src-*.css).');
}

await copyFile(path.join(dist, entry.file), path.join(assetsDir, 'm2a-embed.js'));
await copyFile(path.join(assetsDir, cssFile), path.join(assetsDir, 'm2a-embed.css'));

console.log(`Created stable M2A Blogger mount assets using ${entry.file} + ${cssFile}`);
