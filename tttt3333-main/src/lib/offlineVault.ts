import type { VideoItem } from '../types';

export const OFFLINE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const OFFLINE_CACHE_NAME = 'm2a-offline-videos-24h';
const OFFLINE_DB_NAME = 'm2a_offline_vault_v1';
const OFFLINE_DB_VERSION = 2;
const OFFLINE_STORE_NAME = 'videos';
const OFFLINE_BLOB_STORE = 'mediaBlobs';
const FEED_SNAPSHOT_KEY = 'm2a_cached_feed_snapshot_v1';

export interface OfflineSavedEntry {
  key: string; // `${source}:${id}`
  video: VideoItem;
  sizeBytes: number;
  savedAt: number;
  expiresAt: number;
  mediaCachePath: string;
  thumbCachePath?: string;
}

interface OfflineBlobRecord {
  key: string;
  videoBlob: Blob;
  thumbBlob?: Blob;
  contentType: string;
  expiresAt: number;
}

interface FeedSnapshot {
  savedAt: number;
  expiresAt: number;
  videos: VideoItem[];
}

export function getOfflineVideoKey(video: Pick<VideoItem, 'source' | 'id'>): string {
  return `${video.source}:${video.id}`;
}

export function isOfflineDownloadable(video: Pick<VideoItem, 'source' | 'offlineReady'>): boolean {
  return Boolean(video.offlineReady) || video.source === 'nasa' || video.source === 'tilvids';
}

function getMediaCachePath(source: string, id: string): string {
  return `/__offline_media__/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;
}

function getThumbCachePath(source: string, id: string): string {
  return `/__offline_thumb__/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
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
    req.onerror = () => reject(req.error || new Error('Failed to open offline DB'));
  });
}

async function idbGetAll(): Promise<OfflineSavedEntry[]> {
  try {
    const db = await openVaultDb();
    return await new Promise<OfflineSavedEntry[]>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        resolve((req.result as OfflineSavedEntry[]) || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openVaultDb();
    return await new Promise<T | null>((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openVaultDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function idbDeleteKey(key: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
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
        reject(tx.error);
      };
    });
  } catch {
    // ignore
  }
}

function notifyServiceWorkerPurge(): void {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'PURGE_EXPIRED' });
  }
}

export async function purgeExpiredOfflineVideos(): Promise<OfflineSavedEntry[]> {
  const now = Date.now();
  const entries = await idbGetAll();
  const valid: OfflineSavedEntry[] = [];
  const expired: OfflineSavedEntry[] = [];

  for (const entry of entries) {
    if (entry.expiresAt > now) {
      valid.push(entry);
    } else {
      expired.push(entry);
    }
  }

  if (expired.length > 0) {
    try {
      const cache = typeof caches !== 'undefined' ? await caches.open(OFFLINE_CACHE_NAME) : null;
      await Promise.all(
        expired.map(async (entry) => {
          await idbDeleteKey(entry.key);
          if (cache) {
            await cache.delete(entry.mediaCachePath);
            if (entry.thumbCachePath) await cache.delete(entry.thumbCachePath);
          }
        })
      );
      notifyServiceWorkerPurge();
    } catch {
      // ignore cleanup errors
    }
  }

  return valid.sort((a, b) => b.savedAt - a.savedAt);
}

export async function listOfflineVideos(): Promise<OfflineSavedEntry[]> {
  return purgeExpiredOfflineVideos();
}

export async function saveVideoFor24Hours(video: VideoItem): Promise<OfflineSavedEntry> {
  if (!isOfflineDownloadable(video)) {
    throw new Error('This platform requires an active internet connection.');
  }
  if (typeof caches === 'undefined') {
    throw new Error('Offline storage is unavailable in this browser.');
  }

  const key = getOfflineVideoKey(video);
  const mediaApiUrl = `/api/offline-media/${encodeURIComponent(video.source)}/${encodeURIComponent(video.id)}`;
  const mediaResp = await fetch(mediaApiUrl);
  if (!mediaResp.ok) {
    const body = (await mediaResp.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Could not download video for offline playback.');
  }

  const videoBlob = await mediaResp.blob();
  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('Downloaded video file was empty.');
  }

  const savedAt = Date.now();
  const expiresAt = savedAt + OFFLINE_TTL_MS;
  const contentType = videoBlob.type || 'video/mp4';

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const mediaCachePath = getMediaCachePath(video.source, video.id);
  await cache.put(
    mediaCachePath,
    new Response(videoBlob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(videoBlob.size),
        'Accept-Ranges': 'bytes',
        'X-M2A-Saved-At': String(savedAt),
        'X-M2A-Expires-At': String(expiresAt),
      },
    })
  );

  // Best-effort thumbnail caching through same-origin /api/thumb so poster works offline too
  let thumbCachePath: string | undefined;
  let thumbBlob: Blob | undefined;
  if (video.thumbnail) {
    try {
      const thumbFetchUrl = video.thumbnail.startsWith('/')
        ? video.thumbnail
        : `/api/thumb?url=${encodeURIComponent(video.thumbnail)}`;
      const thumbResp = await fetch(thumbFetchUrl);
      if (thumbResp.ok) {
        const fetchedThumb = await thumbResp.blob();
        if (fetchedThumb.size > 0) {
          thumbBlob = fetchedThumb;
          thumbCachePath = getThumbCachePath(video.source, video.id);
          await cache.put(
            thumbCachePath,
            new Response(fetchedThumb, {
              status: 200,
              headers: {
                'Content-Type': fetchedThumb.type || 'image/jpeg',
                'X-M2A-Saved-At': String(savedAt),
                'X-M2A-Expires-At': String(expiresAt),
              },
            })
          );
        }
      }
    } catch {
      // thumbnail cache is best-effort
    }
  }

  // Persist IndexedDB blob backup alongside metadata for ServiceWorker dual-source lookup
  try {
    await idbPut<OfflineBlobRecord>(OFFLINE_BLOB_STORE, {
      key,
      videoBlob,
      thumbBlob,
      contentType,
      expiresAt,
    });
  } catch {
    // Cache API already holds the media; IDB blob store is a secondary fallback
  }

  const entry: OfflineSavedEntry = {
    key,
    video: { ...video, offlineReady: true },
    sizeBytes: videoBlob.size,
    savedAt,
    expiresAt,
    mediaCachePath,
    thumbCachePath,
  };

  await idbPut(OFFLINE_STORE_NAME, entry);
  return entry;
}

export async function removeOfflineVideo(key: string): Promise<void> {
  const existing = await idbGet<OfflineSavedEntry>(OFFLINE_STORE_NAME, key);
  await idbDeleteKey(key);
  if (existing && typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      await cache.delete(existing.mediaCachePath);
      if (existing.thumbCachePath) await cache.delete(existing.thumbCachePath);
    } catch {
      // ignore
    }
  }
}

export async function clearAllOfflineVideos(): Promise<void> {
  const entries = await idbGetAll();
  await Promise.all(entries.map((e) => idbDeleteKey(e.key)));
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(OFFLINE_CACHE_NAME);
    } catch {
      // ignore
    }
  }
}

export async function getOfflinePlaybackAssets(
  video: Pick<VideoItem, 'source' | 'id'>
): Promise<{ videoUrl: string; thumbUrl?: string; entry: OfflineSavedEntry } | null> {
  const key = getOfflineVideoKey(video);
  const entry = await idbGet<OfflineSavedEntry>(OFFLINE_STORE_NAME, key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    await removeOfflineVideo(key);
    return null;
  }

  // Verify asset exists in Cache API or IndexedDB blob store
  let cachedMediaResp: Response | undefined;
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      cachedMediaResp = await cache.match(entry.mediaCachePath);
    } catch {
      cachedMediaResp = undefined;
    }
  }

  const idbBlobRecord = !cachedMediaResp
    ? await idbGet<OfflineBlobRecord>(OFFLINE_BLOB_STORE, key)
    : null;

  if (!cachedMediaResp && !idbBlobRecord?.videoBlob) {
    await removeOfflineVideo(key);
    return null;
  }

  // Prefer Service Worker-intercepted virtual URL when SW is controlling the page
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    return {
      videoUrl: entry.mediaCachePath,
      thumbUrl: entry.thumbCachePath,
      entry,
    };
  }

  // Fallback to object URL when SW hasn't claimed the tab yet
  try {
    const blob = cachedMediaResp ? await cachedMediaResp.blob() : idbBlobRecord?.videoBlob;
    if (!blob || blob.size === 0) return null;
    const videoUrl = URL.createObjectURL(blob);

    let thumbUrl: string | undefined;
    if (entry.thumbCachePath && typeof caches !== 'undefined') {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const thumbResp = await cache.match(entry.thumbCachePath);
      if (thumbResp) {
        const tBlob = await thumbResp.blob();
        if (tBlob.size > 0) thumbUrl = URL.createObjectURL(tBlob);
      }
    } else if (idbBlobRecord?.thumbBlob && idbBlobRecord.thumbBlob.size > 0) {
      thumbUrl = URL.createObjectURL(idbBlobRecord.thumbBlob);
    }

    return { videoUrl, thumbUrl, entry };
  } catch {
    return null;
  }
}

export async function getOfflineThumbObjectUrl(
  video: Pick<VideoItem, 'source' | 'id'>
): Promise<string | null> {
  const key = getOfflineVideoKey(video);
  const entry = await idbGet<OfflineSavedEntry>(OFFLINE_STORE_NAME, key);
  if (!entry || entry.expiresAt <= Date.now() || !entry.thumbCachePath) return null;

  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    return entry.thumbCachePath;
  }

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const thumbResp = await cache.match(entry.thumbCachePath);
      if (thumbResp) {
        const blob = await thumbResp.blob();
        if (blob.size > 0) return URL.createObjectURL(blob);
      }
    } catch {
      // fall through
    }
  }

  const idbBlobRecord = await idbGet<OfflineBlobRecord>(OFFLINE_BLOB_STORE, key);
  if (idbBlobRecord?.thumbBlob && idbBlobRecord.thumbBlob.size > 0) {
    return URL.createObjectURL(idbBlobRecord.thumbBlob);
  }
  return null;
}

export function saveFeedSnapshot(videos: VideoItem[]): void {
  if (videos.length === 0) return;
  try {
    const now = Date.now();
    const snapshot: FeedSnapshot = {
      savedAt: now,
      expiresAt: now + OFFLINE_TTL_MS,
      videos: videos.slice(0, 60),
    };
    localStorage.setItem(FEED_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

export function loadFeedSnapshot(): VideoItem[] {
  try {
    const raw = localStorage.getItem(FEED_SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedSnapshot;
    if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(FEED_SNAPSHOT_KEY);
      return [];
    }
    return Array.isArray(parsed.videos) ? parsed.videos : [];
  } catch {
    return [];
  }
}

export function formatTimeLeft(expiresAt: number): string {
  const diffMs = Math.max(0, expiresAt - Date.now());
  const totalMins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 10) return `${mb.toFixed(0)} MB`;
  return `${mb.toFixed(1)} MB`;
}
