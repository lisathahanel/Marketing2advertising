import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const required = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png'];
for (const file of required) {
  if (!fs.existsSync(path.join(dist, file))) {
    throw new Error(`Cannot prepare mobile app: missing dist/${file}`);
  }
}

// Preserve the previous mobile app before the desktop homepage overlays dist/index.html.
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html
  .replace(/href=(["'])(?:https:\/\/marketing2advertising\.com\/|\.\/)?manifest\.json\1/gi, 'href="/m2a-mobile.webmanifest"')
  .replace(/href=(["'])(?:https:\/\/marketing2advertising\.com\/|\.\/)?icon\.svg\1/gi, 'href="/__m2a-mobile-assets/icon.svg"')
  .replace(/href=(["'])(?:https:\/\/marketing2advertising\.com\/|\.\/)?icon-192\.png\1/gi, 'href="/__m2a-mobile-assets/icon-192.png"');
fs.writeFileSync(path.join(dist, '__m2a-mobile.html'), html);

const mobileAssets = path.join(dist, '__m2a-mobile-assets');
fs.mkdirSync(mobileAssets, { recursive: true });
for (const file of ['icon.svg', 'icon-192.png', 'icon-512.png']) {
  fs.copyFileSync(path.join(dist, file), path.join(mobileAssets, file));
}

const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
manifest.id = '/';
manifest.start_url = '/';
manifest.scope = '/';
manifest.icons = (manifest.icons || []).map((icon) => ({
  ...icon,
  src: `/__m2a-mobile-assets/${path.basename(icon.src)}`,
}));
fs.writeFileSync(path.join(dist, 'm2a-mobile.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

const mobileSw = `const CACHE_NAME = 'm2a-mobile-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/__m2a-mobile.html',
  '/m2a-mobile.webmanifest',
  '/__m2a-mobile-assets/icon.svg',
  '/__m2a-mobile-assets/icon-192.png',
  '/__m2a-mobile-assets/icon-512.png',
  '/data/channels.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) =>
        (key.startsWith('m2a-cache-') || key.startsWith('m2a-mobile-cache-')) &&
        key !== CACHE_NAME
      )
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isNavigation = request.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (isNavigation) {
        return (await cache.match('/')) || new Response(
          'The M2A mobile app is unavailable offline. Reconnect and refresh.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
      }
      return Response.error();
    }
  })());
});
`;
fs.writeFileSync(path.join(dist, '__m2a-mobile-sw.js'), mobileSw);

for (const file of ['__m2a-mobile.html', '__m2a-mobile-sw.js', 'm2a-mobile.webmanifest']) {
  if (!fs.statSync(path.join(dist, file)).size) throw new Error(`Mobile app artifact is empty: dist/${file}`);
}
console.log('Preserved mobile app shell, icons, manifest, and isolated service worker.');
