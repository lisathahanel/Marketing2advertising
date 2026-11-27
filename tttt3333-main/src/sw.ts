import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { createPartialResponse, RangeRequestsPlugin } from 'workbox-range-requests';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare global {
  interface Window {
    __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
  }
}

interface SWExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SWFetchEvent extends SWExtendableEvent {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

interface SWScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: SWExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: SWFetchEvent) => void): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent & { waitUntil?: (p: Promise<unknown>) => void }) => void
  ): void;
}

const sw = self as unknown as SWScope;

const OFFLINE_CACHE_NAME = 'm2a-offline-videos-24h';
const STREAM_VIDEO_CACHE_NAME = 'm2a-stream-videos-24h';
const OFFLINE_DB_NAME = 'm2a_offline_vault_v1';
const OFFLINE_DB_VERSION = 2;
const OFFLINE_STORE_NAME = 'videos';
const OFFLINE_BLOB_STORE = 'mediaBlobs';

interface VaultRecord {
  key: string;
  expiresAt: number;
  mediaCachePath?: string;
  thumbCachePath?: string;
}

interface VaultBlobRecord {
  key: string;
  videoBlob?: Blob;
  thumbBlob?: Blob;
  contentType?: string;
  expiresAt: number;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_BLOB_STORE)) {
        db.createObjectStore(OFFLINE_BLOB_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

async function idbRead<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openVaultDb();
    return await new Promise<T | null>((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

async function idbDeleteKey(key: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve) => {
      const stores = [OFFLINE_STORE_NAME, OFFLINE_BLOB_STORE].filter((s) =>
        db.objectStoreNames.contains(s)
      );
      if (stores.length === 0) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(stores, 'readwrite');
      for (const s of stores) {
        tx.objectStore(s).delete(key);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // ignore cleanup errors
  }
}

async function purgeExpiredRecords(): Promise<void> {
  const now = Date.now();
  try {
    const db = await openVaultDb();
    const entries = await new Promise<VaultRecord[]>((resolve) => {
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const req = tx.objectStore(OFFLINE_STORE_NAME).getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result as VaultRecord[]) || []);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    });

    const expired = entries.filter((e) => typeof e.expiresAt === 'number' && e.expiresAt <= now);
    if (expired.length === 0) return;

    const cache = await caches.open(OFFLINE_CACHE_NAME);
    await Promise.all(
      expired.map(async (entry) => {
        await idbDeleteKey(entry.key);
        if (entry.mediaCachePath) await cache.delete(entry.mediaCachePath);
        if (entry.thumbCachePath) await cache.delete(entry.thumbCachePath);
      })
    );
  } catch {
    // ignore
  }
}

async function getValidCachedMediaResponse(
  key: string,
  cachePath: string,
  isThumb: boolean
): Promise<{ response: Response | null; expired: boolean }> {
  const now = Date.now();
  const idbRecord = await idbRead<VaultRecord>(OFFLINE_STORE_NAME, key);

  if (idbRecord && idbRecord.expiresAt <= now) {
    await idbDeleteKey(key);
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    if (idbRecord.mediaCachePath) await cache.delete(idbRecord.mediaCachePath);
    if (idbRecord.thumbCachePath) await cache.delete(idbRecord.thumbCachePath);
    return { response: null, expired: true };
  }

  // 1. Check Cache API first
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const cachedResp = await cache.match(cachePath, { ignoreSearch: true });
  if (cachedResp) {
    const headerExpiry = Number(cachedResp.headers.get('X-M2A-Expires-At') || '0');
    if (headerExpiry > 0 && headerExpiry <= now) {
      await cache.delete(cachePath);
      await idbDeleteKey(key);
      return { response: null, expired: true };
    }
    return { response: cachedResp, expired: false };
  }

  // 2. Fallback to IndexedDB blob store
  const blobRecord = await idbRead<VaultBlobRecord>(OFFLINE_BLOB_STORE, key);
  if (blobRecord) {
    if (blobRecord.expiresAt <= now) {
      await idbDeleteKey(key);
      return { response: null, expired: true };
    }
    const blob = isThumb ? blobRecord.thumbBlob : blobRecord.videoBlob;
    if (blob && blob.size > 0) {
      const resp = new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': isThumb
            ? blob.type || 'image/jpeg'
            : blobRecord.contentType || blob.type || 'video/mp4',
          'Content-Length': String(blob.size),
          'Accept-Ranges': 'bytes',
          'X-M2A-Expires-At': String(blobRecord.expiresAt),
        },
      });
      return { response: resp, expired: false };
    }
  }

  return { response: null, expired: false };
}

async function handleOfflineVaultRequest(
  request: Request,
  kind: 'media' | 'thumb',
  source: string,
  id: string
): Promise<Response> {
  const key = `${source}:${id}`;
  const cachePath =
    kind === 'thumb'
      ? `/__offline_thumb__/${encodeURIComponent(source)}/${encodeURIComponent(id)}`
      : `/__offline_media__/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;

  const { response, expired } = await getValidCachedMediaResponse(
    key,
    cachePath,
    kind === 'thumb'
  );

  if (response) {
    if (kind === 'media' && request.headers.has('range')) {
      return createPartialResponse(request, response);
    }
    return response;
  }

  if (expired) {
    return new Response('Offline cache expired after 24 hours.', { status: 410 });
  }

  if (kind === 'media') {
    try {
      return await fetch(`/api/offline-media/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, {
        headers: request.headers.has('range')
          ? { Range: request.headers.get('range') || '' }
          : undefined,
      });
    } catch {
      return new Response('Video not cached for offline playback.', { status: 503 });
    }
  }

  return new Response('Offline thumbnail unavailable.', { status: 404 });
}

async function handleApiOfflineMediaRequest(
  request: Request,
  source: string,
  id: string
): Promise<Response> {
  const key = `${source}:${id}`;
  const cachePath = `/__offline_media__/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;
  const { response } = await getValidCachedMediaResponse(key, cachePath, false);

  if (response) {
    if (request.headers.has('range')) {
      return createPartialResponse(request, response);
    }
    return response;
  }

  return fetch(request);
}

// Activate immediately and clean outdated precaches
void sw.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute((self as unknown as SWScope).__WB_MANIFEST || []);

sw.addEventListener('activate', (event) => {
  event.waitUntil(purgeExpiredRecords());
});

sw.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object' && event.data.type === 'PURGE_EXPIRED') {
    const task = purgeExpiredRecords();
    if (event.waitUntil) event.waitUntil(task);
  }
});

// Intercept local 24h Offline Vault video & thumbnail URLs (with Range byte-seeking support)
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const vaultMatch = url.pathname.match(/^\/__offline_(media|thumb)__\/([^/]+)\/([^/]+)$/);
  if (vaultMatch) {
    const kind = vaultMatch[1] as 'media' | 'thumb';
    const source = decodeURIComponent(vaultMatch[2]);
    const id = decodeURIComponent(vaultMatch[3]);
    event.respondWith(handleOfflineVaultRequest(request, kind, source, id));
    return;
  }

  const apiMediaMatch = url.pathname.match(/^\/api\/offline-media\/([^/]+)\/([^/]+)$/);
  if (apiMediaMatch) {
    const source = decodeURIComponent(apiMediaMatch[1]);
    const id = decodeURIComponent(apiMediaMatch[2]);
    event.respondWith(handleApiOfflineMediaRequest(request, source, id));
  }
});

// Direct MP4 video streams (NASA & TILvids) cached for 24h with HTTP Range support
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    (request.destination === 'video' || /\.mp4(\?|$)/i.test(url.pathname)) &&
    (url.hostname === 'images-assets.nasa.gov' ||
      url.hostname === 'tilvids.com' ||
      url.origin === self.location.origin),
  new CacheFirst({
    cacheName: STREAM_VIDEO_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200, 206] }),
      new ExpirationPlugin({
        maxEntries: 25,
        maxAgeSeconds: 60 * 60 * 24,
      }),
      new RangeRequestsPlugin(),
    ],
  })
);

// App shell & UI assets (exclude /api/* and /__offline_* routes)
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/__offline_') &&
    request.destination !== 'video',
  new NetworkFirst({
    cacheName: 'm2a-app-shell-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 250,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

// Thumbnails (24-hour StaleWhileRevalidate)
registerRoute(
  ({ url }) =>
    url.pathname === '/api/thumb' ||
    /^https:\/\/(i\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com|lh3\.googleusercontent\.com|tilvids\.com|images-assets\.nasa\.gov)\//i.test(
      url.href
    ),
  new StaleWhileRevalidate({
    cacheName: 'm2a-thumbs-24h',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 250,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

// NASA video stream endpoint metadata (24h NetworkFirst so offline NASA stream lookup resolves)
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/nasa-video/'),
  new NetworkFirst({
    cacheName: 'm2a-api-24h',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

// Google Fonts
registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com\//i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => /^https:\/\/fonts\.gstatic\.com\//i.test(url.href),
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);
