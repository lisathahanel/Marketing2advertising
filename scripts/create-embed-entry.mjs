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
const cssFiles = (await readdir(assetsDir)).filter((name) => name.endsWith('.css'));
const cssFile = cssFiles.find((name) => !name.toLowerCase().includes('emailextractor')) || cssFiles[0];

if (!cssFile) {
  throw new Error('Vite did not emit the M2A app stylesheet.');
}

await copyFile(path.join(dist, entry.file), path.join(assetsDir, 'm2a-embed.js'));
await copyFile(path.join(assetsDir, cssFile), path.join(assetsDir, 'm2a-embed.css'));
console.log(`Created stable M2A Blogger mount assets using ${cssFile}: assets/m2a-embed.js and assets/m2a-embed.css`);
