const CACHE_NAME = 'm2a-cache-v6';

function scopedUrl(path = '') {
  return new URL(path, self.registration.scope).toString();
}

const STATIC_ASSETS = [
  '',
  'index.html',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'data/channels.json'
].map(scopedUrl);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('M2A precache warning:', error);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('m2a-cache-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // The standalone Email Extractor is a separate production entry point.
  // Never let an old cached app shell replace it with the main homepage.
  if (url.pathname === '/m2a-emailextractor.html' && request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => new Response(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email Extractor offline</title><body style="margin:0;background:#05070D;color:#e2e8f0;font:16px system-ui;padding:32px"><h1>Email Extractor is temporarily unavailable offline</h1><p>Reconnect to the internet and refresh this page.</p></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      ))
    );
    return;
  }

  const isFeedOrApi = url.pathname.includes('/feeds/') || url.pathname.includes('/api/');
  const isNavigation = request.mode === 'navigate';

  if (isFeedOrApi || isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (isNavigation ? caches.match(scopedUrl('index.html')) : Response.error());
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
