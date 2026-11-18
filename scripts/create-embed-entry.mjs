import { copyFile, mkdir, readFile } from 'node:fs/promises';
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

const cssFile = entry.css?.[0];
if (!cssFile) {
  throw new Error('The src/embed.tsx manifest entry has no associated stylesheet.');
}

await copyFile(path.join(dist, entry.file), path.join(assetsDir, 'm2a-embed.js'));
await copyFile(path.join(dist, cssFile), path.join(assetsDir, 'm2a-embed.css'));

console.log(`Created stable M2A Blogger mount assets from the exact embed entry: ${entry.file} + ${cssFile}`);
