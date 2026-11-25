import {
  parseBloggerFeed,
  parseBloggerPagesFeed,
  type BloggerRawFeed,
  type MovieItem,
  type StaticPageItem,
} from '../lib/bloggerParser.ts';
import {
  BASE_PATH,
  BLOGGER_SOURCE_ORIGIN,
  MOVIE_FEED_LABEL,
  MOVIE_GENRES,
  SERIES_FEED_LABEL,
  VJ_LIST,
} from '../lib/constants.ts';

export interface CatalogueSnapshot {
  items: MovieItem[];
  genres: string[];
  vjs: string[];
  fetchedAt: number;
  source: 'api' | 'jsonp' | 'cache';
}

const SNAPSHOT_STORAGE_KEY = 'firimu_catalogue_snapshot_v5';
const SINGLE_MOVIE_CACHE_KEY = 'firimu_single_movie_cache_v1';
const PAGES_STORAGE_KEY = 'firimu_pages_snapshot_v1';
const STATIC_HOSTING_SESSION_KEY = 'firimu_static_host_v1';
export const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;
const JSONP_PAGE_SIZE = 150;
const JSONP_MAX_PAGES = 20;
const MAX_SINGLE_MOVIE_CACHE = 30;

let memorySnapshot: CatalogueSnapshot | null = null;
let memoryPages: {pages: StaticPageItem[]; fetchedAt: number} | null = null;
let activeLoadPromise: Promise<CatalogueSnapshot> | null = null;
let activePagesPromise: Promise<StaticPageItem[]> | null = null;
const inFlightSingleMovies = new Map<string, Promise<MovieItem | null>>();
let staticHostingDetected = readStaticHostingFlag();

export function normalizeMoviePathname(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\.html$/i, '').toLowerCase();
}

function readStaticHostingFlag(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(STATIC_HOSTING_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markStaticHostingDetected(): void {
  staticHostingDetected = true;
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STATIC_HOSTING_SESSION_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

function loadStoredSnapshot(): CatalogueSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogueSnapshot;
    if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
      return {...parsed, source: 'cache'};
    }
  } catch {
    return null;
  }
  return null;
}

export function getStoredSnapshotSync(): CatalogueSnapshot | null {
  if (memorySnapshot && memorySnapshot.items.length > 0) {
    return memorySnapshot;
  }
  const stored = loadStoredSnapshot();
  if (stored) {
    memorySnapshot = stored;
  }
  return stored;
}

function saveStoredSnapshot(snapshot: CatalogueSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors
  }
}

function readSingleMovieCacheList(): MovieItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SINGLE_MOVIE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MovieItem[]) : [];
  } catch {
    return [];
  }
}

export function getCachedSingleMovieSync(pathname: string): MovieItem | null {
  const normalized = normalizeMoviePathname(pathname);
  if (!normalized) return null;

  const snapshot = getStoredSnapshotSync();
  if (snapshot) {
    const fromSnapshot = snapshot.items.find(
      (item) => normalizeMoviePathname(item.pathname) === normalized,
    );
    if (fromSnapshot) return fromSnapshot;
  }

  const cachedSingles = readSingleMovieCacheList();
  return (
    cachedSingles.find(
      (item) => normalizeMoviePathname(item.pathname) === normalized,
    ) ?? null
  );
}

function saveCachedSingleMovie(item: MovieItem): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = readSingleMovieCacheList().filter(
      (entry) =>
        normalizeMoviePathname(entry.pathname) !==
        normalizeMoviePathname(item.pathname),
    );
    const updated = [item, ...existing].slice(0, MAX_SINGLE_MOVIE_CACHE);
    localStorage.setItem(SINGLE_MOVIE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

function loadBloggerJsonp(url: string, timeoutMs = 14000): Promise<BloggerRawFeed> {
  return new Promise((resolve, reject) => {
    const callbackName = `__firimuJsonp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Blogger JSONP request timed out'));
    }, timeoutMs);

    (window as unknown as Record<string, unknown>)[callbackName] = (
      data: BloggerRawFeed,
    ) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Failed to load m2a JP st'));
    };

    document.head.appendChild(script);
  });
}

async function fetchLabelViaJsonp(
  label: string,
  contentType: 'movie' | 'series',
): Promise<MovieItem[]> {
  const firstUrl = `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json-in-script&max-results=${JSONP_PAGE_SIZE}&start-index=1`;
  const firstRaw = await loadBloggerJsonp(firstUrl);
  const firstParsed = parseBloggerFeed(firstRaw, contentType);
  const firstBatchCount = firstRaw.feed?.entry?.length ?? 0;

  if (firstBatchCount === 0 || firstBatchCount < JSONP_PAGE_SIZE) {
    return firstParsed.items;
  }

  const totalResults = Number.isFinite(firstParsed.totalResults)
    ? firstParsed.totalResults
    : firstBatchCount;
  const startIndices: number[] = [];
  for (
    let startIndex = 1 + firstBatchCount, page = 1;
    page < JSONP_MAX_PAGES && startIndex <= totalResults;
    page++, startIndex += JSONP_PAGE_SIZE
  ) {
    startIndices.push(startIndex);
  }

  if (startIndices.length === 0) {
    return firstParsed.items;
  }

  const remainingPages = await Promise.all(
    startIndices.map(async (startIndex) => {
      const feedUrl = `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json-in-script&max-results=${JSONP_PAGE_SIZE}&start-index=${startIndex}`;
      const raw = await loadBloggerJsonp(feedUrl);
      return parseBloggerFeed(raw, contentType).items;
    }),
  );

  return [firstParsed.items, ...remainingPages].flat();
}

async function fetchCatalogueViaJsonp(): Promise<CatalogueSnapshot> {
  const [movieItems, seriesItems] = await Promise.all([
    fetchLabelViaJsonp(MOVIE_FEED_LABEL, 'movie'),
    fetchLabelViaJsonp(SERIES_FEED_LABEL, 'series'),
  ]);

  const byPath = new Map<string, MovieItem>();
  for (const item of [...movieItems, ...seriesItems]) {
    const existing = byPath.get(item.pathname);
    if (!existing) {
      byPath.set(item.pathname, item);
    } else if (item.contentType === 'series') {
      byPath.set(item.pathname, {
        ...item,
        labels: Array.from(new Set([...existing.labels, ...item.labels])),
      });
    }
  }

  const allItems = Array.from(byPath.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const genreSet = new Set<string>(MOVIE_GENRES);
  const vjSet = new Set<string>(VJ_LIST);
  for (const item of allItems) {
    for (const g of item.genres) genreSet.add(g);
    if (item.vjName && item.vjName !== 'All VJs') vjSet.add(item.vjName);
  }

  return {
    items: allItems,
    genres: Array.from(genreSet),
    vjs: Array.from(vjSet),
    fetchedAt: Date.now(),
    source: 'jsonp',
  };
}

async function fetchCatalogueViaApi(): Promise<CatalogueSnapshot> {
  if (staticHostingDetected) {
    throw new Error('Static hosting active');
  }

  const response = await fetch(`${BASE_PATH}/api/movies?all=true`, {
    headers: {Accept: 'application/json'},
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/json')) {
    void response.body?.cancel().catch(() => {});
    if (contentType.includes('text/html') || response.status === 404) {
      markStaticHostingDetected();
    }
    throw new Error(`API unavailable (${response.status})`);
  }

  const data = (await response.json()) as {
    items?: MovieItem[];
    genres?: string[];
    vjs?: string[];
    fetchedAt?: number;
  };

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Empty API response');
  }

  return {
    items: data.items,
    genres: data.genres ?? [...MOVIE_GENRES],
    vjs: data.vjs ?? [...VJ_LIST],
    fetchedAt: data.fetchedAt ?? Date.now(),
    source: 'api',
  };
}

function extractSlugQueryTerms(pathname: string): string {
  const slugPart = pathname.split('/').filter(Boolean).pop() ?? '';
  const cleaned = slugPart.replace(/\.html$/i, '').replace(/[_-]+/g, ' ').trim();
  const stopWords = new Set([
    'vj',
    'kali',
    'mu',
    'full',
    'movie',
    'movies',
    'series',
    'part',
    'episode',
    'ep',
    'luganda',
    'translated',
    'hd',
    '1080p',
    '720p',
  ]);
  const tokens = cleaned
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t.toLowerCase()) && !/^\d+$/.test(t));
  if (tokens.length > 0) {
    return tokens.slice(-3).join(' ');
  }
  return cleaned;
}

function buildMonthDateWindow(pathname: string): {minIso: string; maxIso: string} | null {
  const m = pathname.match(/^\/(\d{4})\/(\d{2})\//);
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  const minDate = new Date(Date.UTC(year, month - 1, 1));
  minDate.setUTCDate(minDate.getUTCDate() - 5);
  const maxDate = new Date(Date.UTC(year, month, 1));
  maxDate.setUTCDate(maxDate.getUTCDate() + 5);
  return {
    minIso: minDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    maxIso: maxDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}

async function fetchSingleMovieViaApi(pathname: string): Promise<MovieItem> {
  if (staticHostingDetected) {
    throw new Error('Static hosting active');
  }

  const response = await fetch(
    `${BASE_PATH}/api/movie?path=${encodeURIComponent(pathname)}`,
    {
      headers: {Accept: 'application/json'},
      signal: AbortSignal.timeout(6000),
    },
  );

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/json')) {
    void response.body?.cancel().catch(() => {});
    if (contentType.includes('text/html')) {
      markStaticHostingDetected();
    }
    throw new Error(`Movie API unavailable (${response.status})`);
  }

  const data = (await response.json()) as {item?: MovieItem};
  if (!data?.item) {
    throw new Error('Movie missing in API response');
  }
  return data.item;
}

async function fetchSingleMovieViaJsonp(pathname: string): Promise<MovieItem> {
  const normalizedTarget = normalizeMoviePathname(pathname);
  const terms = extractSlugQueryTerms(pathname);

  const queryBothLabels = async (querySuffix: string): Promise<MovieItem | null> => {
    const [moviesRaw, seriesRaw] = await Promise.all([
      loadBloggerJsonp(
        `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(MOVIE_FEED_LABEL)}?alt=json-in-script&${querySuffix}`,
        10000,
      ).catch(() => null),
      loadBloggerJsonp(
        `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(SERIES_FEED_LABEL)}?alt=json-in-script&${querySuffix}`,
        10000,
      ).catch(() => null),
    ]);

    const candidates = [
      ...(seriesRaw ? parseBloggerFeed(seriesRaw, 'series').items : []),
      ...(moviesRaw ? parseBloggerFeed(moviesRaw, 'movie').items : []),
    ];

    return (
      candidates.find(
        (item) => normalizeMoviePathname(item.pathname) === normalizedTarget,
      ) ?? null
    );
  };

  // Strategy 1: Ultra-fast keyword query (~5-15KB payload)
  if (terms) {
    const byQuery = await queryBothLabels(
      `q=${encodeURIComponent(terms)}&max-results=15`,
    );
    if (byQuery) return byQuery;
  }

  // Strategy 2: Exact publication month window (covers punctuation/title mismatches)
  const monthWindow = buildMonthDateWindow(pathname);
  if (monthWindow) {
    const byMonth = await queryBothLabels(
      `published-min=${encodeURIComponent(monthWindow.minIso)}&published-max=${encodeURIComponent(monthWindow.maxIso)}&max-results=100`,
    );
    if (byMonth) return byMonth;
  }

  throw new Error('Movie not found in fast lookup');
}

export async function loadSingleMovieFast(
  pathname: string,
): Promise<MovieItem | null> {
  const normalized = normalizeMoviePathname(pathname);
  if (!normalized) return null;

  const cached = getCachedSingleMovieSync(pathname);
  if (cached) return cached;

  const existingPromise = inFlightSingleMovies.get(normalized);
  if (existingPromise) return existingPromise;

  const task = (async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return null;
    }

    const racers: Promise<MovieItem>[] = [fetchSingleMovieViaJsonp(pathname)];
    if (!staticHostingDetected) {
      racers.unshift(fetchSingleMovieViaApi(pathname));
    }

    try {
      const winner = await Promise.any(racers);
      saveCachedSingleMovie(winner);
      return winner;
    } catch {
      return null;
    } finally {
      inFlightSingleMovies.delete(normalized);
    }
  })();

  inFlightSingleMovies.set(normalized, task);
  return task;
}

export async function loadCatalogue(forceRefresh = false): Promise<CatalogueSnapshot> {
  if (
    !forceRefresh &&
    memorySnapshot &&
    Date.now() - memorySnapshot.fetchedAt < CLIENT_CACHE_TTL_MS
  ) {
    return memorySnapshot;
  }

  if (!forceRefresh) {
    const stored = loadStoredSnapshot();
    if (stored) {
      memorySnapshot = stored;
      if (
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        Date.now() - stored.fetchedAt < CLIENT_CACHE_TTL_MS
      ) {
        return stored;
      }
    }
  }

  if (activeLoadPromise && !forceRefresh) {
    return activeLoadPromise;
  }

  activeLoadPromise = (async () => {
    try {
      const apiSnapshot = await fetchCatalogueViaApi();
      memorySnapshot = apiSnapshot;
      saveStoredSnapshot(apiSnapshot);
      return apiSnapshot;
    } catch {
      // Automatic client-side Blogger JSONP fallback (works on pure static Apache/Nginx & edge networks)
      try {
        const jsonpSnapshot = await fetchCatalogueViaJsonp();
        memorySnapshot = jsonpSnapshot;
        saveStoredSnapshot(jsonpSnapshot);
        return jsonpSnapshot;
      } catch (err) {
        const cached = loadStoredSnapshot();
        if (cached) {
          memorySnapshot = cached;
          return cached;
        }
        throw err;
      }
    } finally {
      activeLoadPromise = null;
    }
  })();

  return activeLoadPromise;
}

export async function loadStaticPages(forceRefresh = false): Promise<StaticPageItem[]> {
  if (
    !forceRefresh &&
    memoryPages &&
    Date.now() - memoryPages.fetchedAt < CLIENT_CACHE_TTL_MS
  ) {
    return memoryPages.pages;
  }

  if (activePagesPromise && !forceRefresh) {
    return activePagesPromise;
  }

  activePagesPromise = (async () => {
    try {
      if (staticHostingDetected) {
        throw new Error('Static hosting active');
      }
      const res = await fetch(`${BASE_PATH}/api/pages`, {
        headers: {Accept: 'application/json'},
      });
      const ct = res.headers.get('content-type') ?? '';
      if (!res.ok || !ct.includes('application/json')) {
        void res.body?.cancel().catch(() => {});
        if (ct.includes('text/html') || res.status === 404) {
          markStaticHostingDetected();
        }
        throw new Error('Pages API unavailable');
      }
      const data = (await res.json()) as {pages?: StaticPageItem[]};
      const pages = Array.isArray(data.pages) ? data.pages : [];
      memoryPages = {pages, fetchedAt: Date.now()};
      try {
        localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(memoryPages));
      } catch {
        // Ignore
      }
      return pages;
    } catch {
      try {
        const raw = await loadBloggerJsonp(
          `${BLOGGER_SOURCE_ORIGIN}/feeds/pages/default?alt=json-in-script&max-results=50`,
        );
        const pages = parseBloggerPagesFeed(raw);
        memoryPages = {pages, fetchedAt: Date.now()};
        try {
          localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(memoryPages));
        } catch {
          // Ignore
        }
        return pages;
      } catch {
        try {
          const cachedRaw = localStorage.getItem(PAGES_STORAGE_KEY);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw) as {pages: StaticPageItem[]; fetchedAt: number};
            if (Array.isArray(parsed?.pages)) return parsed.pages;
          }
        } catch {
          // Ignore
        }
        return [];
      }
    } finally {
      activePagesPromise = null;
    }
  })();

  return activePagesPromise;
}

export function getRelatedItems(allItems: MovieItem[], target: MovieItem, limit = 6): MovieItem[] {
  return allItems
    .filter((other) => other.pathname !== target.pathname)
    .map((other) => {
      let score = 0;
      if (other.vjName === target.vjName) score += 2;
      for (const g of other.genres) {
        if (target.genres.includes(g)) score += 3;
      }
      if (other.contentType === target.contentType) score += 1;
      return {other, score};
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.other);
}
