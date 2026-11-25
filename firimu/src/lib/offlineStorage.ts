import type {MovieItem, MoviePart, StaticPageItem} from './bloggerParser.ts';
import {BASE_PATH} from './constants.ts';

export const OFFLINE_VIDEO_CACHE = 'firimu-offline-videos-v1';
export const OFFLINE_APP_POSTERS_CACHE = 'firimu-posters-cache';
export const OFFLINE_META_KEY = 'firimu_offline_vault_v1';
export const APP_OFFLINE_KEY = 'firimu_app_offline_24h_v1';
export const OFFLINE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface OfflineSavedPart {
  partIndex: number;
  partNumber: number;
  label: string;
  url: string;
  sizeBytes: number;
  savedAt: number;
  expiresAt: number;
}

export interface OfflineSavedMovie {
  pathname: string;
  displayTitle: string;
  posterUrl: string;
  vjName: string;
  contentType: 'movie' | 'series';
  totalParts: number;
  savedAt: number;
  expiresAt: number;
  parts: Record<number, OfflineSavedPart>;
}

export interface AppOfflineStatus {
  enabledAt: number;
  expiresAt: number;
  cachedPosters: number;
  cachedPages: number;
  totalTitles: number;
}

export interface OfflineDownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

function readRawVault(): Record<string, OfflineSavedMovie> {
  try {
    const raw = localStorage.getItem(OFFLINE_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRawVault(vault: Record<string, OfflineSavedMovie>): void {
  try {
    localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(vault));
  } catch {
    // Ignore storage quota errors
  }
}

export function getAppOfflineStatus(): AppOfflineStatus | null {
  try {
    const raw = localStorage.getItem(APP_OFFLINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppOfflineStatus;
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(APP_OFFLINE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAppOfflineStatus(): void {
  try {
    localStorage.removeItem(APP_OFFLINE_KEY);
  } catch {
    // Ignore
  }
}

export async function purgeExpiredOfflineItems(): Promise<OfflineSavedMovie[]> {
  const vault = readRawVault();
  const now = Date.now();
  let changed = false;
  const expiredUrls: string[] = [];

  for (const [pathname, movie] of Object.entries(vault)) {
    const nextParts: Record<number, OfflineSavedPart> = {};
    let maxExpiry = 0;

    for (const [idxStr, part] of Object.entries(movie.parts ?? {})) {
      if (part.expiresAt > now) {
        nextParts[Number(idxStr)] = part;
        if (part.expiresAt > maxExpiry) maxExpiry = part.expiresAt;
      } else {
        changed = true;
        expiredUrls.push(part.url);
      }
    }

    if (Object.keys(nextParts).length === 0) {
      delete vault[pathname];
      changed = true;
    } else {
      vault[pathname] = {
        ...movie,
        expiresAt: maxExpiry,
        parts: nextParts,
      };
    }
  }

  if (changed) {
    writeRawVault(vault);
    if (typeof caches !== 'undefined' && expiredUrls.length > 0) {
      try {
        const cache = await caches.open(OFFLINE_VIDEO_CACHE);
        await Promise.all(expiredUrls.map((url) => cache.delete(url)));
      } catch {
        // Ignore Cache API errors
      }
    }
  }

  // Also check app-wide 24h offline expiry
  getAppOfflineStatus();

  return Object.values(vault).sort((a, b) => b.savedAt - a.savedAt);
}

export function listOfflineMoviesSync(): OfflineSavedMovie[] {
  const vault = readRawVault();
  const now = Date.now();
  return Object.values(vault)
    .filter((movie) => {
      const validParts = Object.values(movie.parts ?? {}).filter(
        (p) => p.expiresAt > now,
      );
      return validParts.length > 0;
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

async function fetchStreamWithProxyFallback(
  videoUrl: string,
  signal?: AbortSignal,
): Promise<Response> {
  // 1. Try direct CORS fetch first (works on pure static hosting if CDN enables CORS)
  try {
    const directRes = await fetch(videoUrl, {
      mode: 'cors',
      credentials: 'omit',
      signal,
    });
    if (directRes.ok && directRes.body) {
      return directRes;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    // Fall through to same-origin Express stream proxy
  }

  // 2. Fallback to Express same-origin proxy route so any direct MP4 can be saved offline
  const proxyUrl = `${BASE_PATH}/api/offline-media?url=${encodeURIComponent(videoUrl)}`;
  const proxyRes = await fetch(proxyUrl, {signal});
  if (!proxyRes.ok) {
    throw new Error(`Unable to fetch video for offline viewing (HTTP ${proxyRes.status})`);
  }
  return proxyRes;
}

export async function saveVideoPartOffline(
  movie: MovieItem,
  part: MoviePart,
  onProgress?: (progress: OfflineDownloadProgress) => void,
  signal?: AbortSignal,
): Promise<OfflineSavedMovie> {
  if (typeof caches === 'undefined') {
    throw new Error('Offline storage is not supported in this browser context.');
  }
  if (part.sourceType !== 'video') {
    throw new Error('Only direct video streams can be saved for offline viewing.');
  }

  // Request persistent storage when available so OS doesn't prematurely evict cached movies
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Optional best-effort
  }

  const response = await fetchStreamWithProxyFallback(part.url, signal);
  const contentType = response.headers.get('content-type') || 'video/mp4';
  const totalBytes = Number.parseInt(
    response.headers.get('content-length') ?? '0',
    10,
  ) || 0;

  let blob: Blob;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loadedBytes += value.byteLength;
        const percent =
          totalBytes > 0
            ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100))
            : 0;
        onProgress?.({loadedBytes, totalBytes, percent});
      }
    }

    blob = new Blob(chunks as BlobPart[], {type: contentType});
  } else {
    blob = await response.blob();
  }

  if (blob.size === 0) {
    throw new Error('Downloaded stream was empty.');
  }

  const cache = await caches.open(OFFLINE_VIDEO_CACHE);
  const cacheResponse = new Response(blob, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(blob.size),
    },
  });
  await cache.put(part.url, cacheResponse);

  // Best-effort cache poster for completely offline library display
  if (movie.posterUrl) {
    try {
      const posterCache = await caches.open(OFFLINE_APP_POSTERS_CACHE);
      await posterCache.add(new Request(movie.posterUrl, {mode: 'no-cors'}));
    } catch {
      // Ignore poster caching errors
    }
  }

  onProgress?.({
    loadedBytes: blob.size,
    totalBytes: blob.size,
    percent: 100,
  });

  const now = Date.now();
  const expiresAt = now + OFFLINE_TTL_MS;
  const vault = readRawVault();
  const existing = vault[movie.pathname];

  const savedPart: OfflineSavedPart = {
    partIndex: part.index,
    partNumber: part.partNumber,
    label: part.label,
    url: part.url,
    sizeBytes: blob.size,
    savedAt: now,
    expiresAt,
  };

  const updatedMovie: OfflineSavedMovie = {
    pathname: movie.pathname,
    displayTitle: movie.displayTitle,
    posterUrl: movie.posterUrl,
    vjName: movie.vjName,
    contentType: movie.contentType,
    totalParts: movie.parts.length,
    savedAt: now,
    expiresAt,
    parts: {
      ...(existing?.parts ?? {}),
      [part.index]: savedPart,
    },
  };

  vault[movie.pathname] = updatedMovie;
  writeRawVault(vault);
  return updatedMovie;
}

export async function getOfflinePartPlayback(
  pathname: string,
  partIndex: number,
  url: string,
): Promise<{blobUrl: string; expiresAt: number; sizeBytes: number} | null> {
  if (typeof caches === 'undefined') return null;

  const vault = readRawVault();
  const movie = vault[pathname];
  const partMeta = movie?.parts?.[partIndex];
  const now = Date.now();

  if (partMeta && partMeta.expiresAt <= now) {
    await removeOfflinePart(pathname, partIndex);
    return null;
  }

  try {
    const cache = await caches.open(OFFLINE_VIDEO_CACHE);
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    if (!blob || blob.size === 0) return null;

    return {
      blobUrl: URL.createObjectURL(blob),
      expiresAt: partMeta?.expiresAt ?? now + OFFLINE_TTL_MS,
      sizeBytes: blob.size,
    };
  } catch {
    return null;
  }
}

export async function removeOfflinePart(
  pathname: string,
  partIndex: number,
): Promise<OfflineSavedMovie[]> {
  const vault = readRawVault();
  const movie = vault[pathname];
  if (!movie) return listOfflineMoviesSync();

  const targetPart = movie.parts?.[partIndex];
  if (targetPart && typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_VIDEO_CACHE);
      await cache.delete(targetPart.url);
    } catch {
      // Ignore
    }
  }

  if (movie.parts) {
    delete movie.parts[partIndex];
  }

  if (!movie.parts || Object.keys(movie.parts).length === 0) {
    delete vault[pathname];
  } else {
    const maxExpiry = Math.max(
      ...Object.values(movie.parts).map((p) => p.expiresAt),
    );
    vault[pathname] = {...movie, expiresAt: maxExpiry};
  }

  writeRawVault(vault);
  return listOfflineMoviesSync();
}

export async function removeOfflineMovie(
  pathname: string,
): Promise<OfflineSavedMovie[]> {
  const vault = readRawVault();
  const movie = vault[pathname];
  if (!movie) return listOfflineMoviesSync();

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_VIDEO_CACHE);
      await Promise.all(
        Object.values(movie.parts ?? {}).map((p) => cache.delete(p.url)),
      );
    } catch {
      // Ignore
    }
  }

  delete vault[pathname];
  writeRawVault(vault);
  return listOfflineMoviesSync();
}

export async function clearAllOfflineVideos(): Promise<void> {
  try {
    localStorage.removeItem(OFFLINE_META_KEY);
  } catch {
    // Ignore
  }
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete(OFFLINE_VIDEO_CACHE);
    } catch {
      // Ignore
    }
  }
}

export async function enableFullAppOffline24h(
  items: MovieItem[],
  pages: StaticPageItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<AppOfflineStatus> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Ignore
  }

  const uniquePosters = Array.from(
    new Set(
      items
        .slice(0, 72)
        .map((i) => i.posterUrl)
        .filter((u): u is string => Boolean(u)),
    ),
  );

  let cachedPosters = 0;
  const total = uniquePosters.length + 1;
  onProgress?.(0, total);

  if (typeof caches !== 'undefined' && uniquePosters.length > 0) {
    try {
      const cache = await caches.open(OFFLINE_APP_POSTERS_CACHE);
      const batchSize = 6;
      for (let i = 0; i < uniquePosters.length; i += batchSize) {
        const batch = uniquePosters.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (posterUrl) => {
            try {
              const existing = await cache.match(posterUrl);
              if (!existing) {
                await cache.add(new Request(posterUrl, {mode: 'no-cors'}));
              }
              cachedPosters++;
            } catch {
              // Skip failed poster
            }
          }),
        );
        onProgress?.(Math.min(i + batch.length, uniquePosters.length), total);
      }
    } catch {
      // Ignore cache failure
    }
  }

  // Ensure app shell index & pages are warmed in cache
  if (typeof caches !== 'undefined') {
    try {
      const shellCache = await caches.open('firimu-app-shell-24h');
      await shellCache.add(`${BASE_PATH}/`).catch(() => undefined);
    } catch {
      // Ignore
    }
  }

  onProgress?.(total, total);

  const now = Date.now();
  const status: AppOfflineStatus = {
    enabledAt: now,
    expiresAt: now + OFFLINE_TTL_MS,
    cachedPosters,
    cachedPages: pages.length,
    totalTitles: items.length,
  };

  try {
    localStorage.setItem(APP_OFFLINE_KEY, JSON.stringify(status));
  } catch {
    // Ignore
  }

  return status;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.max(1, Math.round(mb))} MB`;
}

export function formatOfflineCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const totalMins = Math.floor(diff / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m left`;
  }
  return `${Math.max(1, mins)}m left`;
}
