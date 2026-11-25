import express, {type Request, type Response} from 'express';
import fs from 'fs';
import net from 'net';
import path from 'path';
import {Readable} from 'stream';
import type {ReadableStream as NodeReadableStream} from 'stream/web';
import {fileURLToPath} from 'url';
import zlib from 'zlib';
import {
  parseBloggerFeed,
  parseBloggerPagesFeed,
  type BloggerRawFeed,
  type MovieItem,
  type StaticPageItem,
} from './src/lib/bloggerParser.ts';
import {
  BLOGGER_SOURCE_ORIGIN,
  CANONICAL_BASE_URL,
  MOVIE_FEED_LABEL,
  MOVIE_GENRES,
  SERIES_FEED_LABEL,
  VJ_LIST,
} from './src/lib/constants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PAGE_SIZE = 150;
const MAX_PAGES = 20;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

let postsCache: CacheEntry<MovieItem[]> | null = null;
let pagesCache: CacheEntry<StaticPageItem[]> | null = null;
let inFlightPosts: Promise<MovieItem[]> | null = null;
let inFlightPages: Promise<StaticPageItem[]> | null = null;

async function fetchBloggerJson(url: string): Promise<BloggerRawFeed> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (!contentType.includes('json') && text.trim().startsWith('<')) {
    throw new Error('Upstream returned HTML challenge instead of JSON');
  }

  return JSON.parse(text) as BloggerRawFeed;
}

async function fetchLabelPosts(
  label: string,
  contentType: 'movie' | 'series',
): Promise<MovieItem[]> {
  const firstUrl = `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${PAGE_SIZE}&start-index=1`;
  const firstRaw = await fetchBloggerJson(firstUrl);
  const firstParsed = parseBloggerFeed(firstRaw, contentType);
  const firstBatchCount = firstRaw.feed?.entry?.length ?? 0;

  if (firstBatchCount === 0 || firstBatchCount < PAGE_SIZE) {
    return firstParsed.items;
  }

  const totalResults = Number.isFinite(firstParsed.totalResults)
    ? firstParsed.totalResults
    : firstBatchCount;
  const startIndices: number[] = [];
  for (
    let startIndex = 1 + firstBatchCount, page = 1;
    page < MAX_PAGES && startIndex <= totalResults;
    page++, startIndex += PAGE_SIZE
  ) {
    startIndices.push(startIndex);
  }

  if (startIndices.length === 0) {
    return firstParsed.items;
  }

  const remainingPages = await Promise.all(
    startIndices.map(async (startIndex) => {
      const feedUrl = `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${PAGE_SIZE}&start-index=${startIndex}`;
      const raw = await fetchBloggerJson(feedUrl);
      return parseBloggerFeed(raw, contentType).items;
    }),
  );

  return [firstParsed.items, ...remainingPages].flat();
}

function refreshPostsCache(): Promise<MovieItem[]> {
  if (inFlightPosts) {
    return inFlightPosts;
  }

  inFlightPosts = (async () => {
    try {
      const [movieItems, seriesItems] = await Promise.all([
        fetchLabelPosts(MOVIE_FEED_LABEL, 'movie'),
        fetchLabelPosts(SERIES_FEED_LABEL, 'series'),
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
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

      postsCache = {data: allItems, fetchedAt: Date.now()};
      return allItems;
    } catch (err) {
      if (postsCache?.data?.length) {
        return postsCache.data;
      }
      throw err;
    } finally {
      inFlightPosts = null;
    }
  })();

  return inFlightPosts;
}

async function fetchAllBloggerPosts(): Promise<MovieItem[]> {
  if (postsCache) {
    if (Date.now() - postsCache.fetchedAt >= CACHE_TTL_MS) {
      // Stale-while-revalidate: serve cached catalogue immediately & refresh silently
      void refreshPostsCache().catch(() => {});
    }
    return postsCache.data;
  }
  return refreshPostsCache();
}

function refreshPagesCache(): Promise<StaticPageItem[]> {
  if (inFlightPages) {
    return inFlightPages;
  }

  inFlightPages = (async () => {
    try {
      const feedUrl = `${BLOGGER_SOURCE_ORIGIN}/feeds/pages/default?alt=json&max-results=50`;
      const raw = await fetchBloggerJson(feedUrl);
      const pages = parseBloggerPagesFeed(raw);
      pagesCache = {data: pages, fetchedAt: Date.now()};
      return pages;
    } catch (err) {
      if (pagesCache?.data?.length) {
        return pagesCache.data;
      }
      throw err;
    } finally {
      inFlightPages = null;
    }
  })();

  return inFlightPages;
}

async function fetchAllBloggerPages(): Promise<StaticPageItem[]> {
  if (pagesCache) {
    if (Date.now() - pagesCache.fetchedAt >= CACHE_TTL_MS) {
      void refreshPagesCache().catch(() => {});
    }
    return pagesCache.data;
  }
  return refreshPagesCache();
}

function normalizePathname(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\.html$/i, '').toLowerCase();
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

async function findSingleMovieFastOnServer(rawPath: string): Promise<MovieItem | null> {
  const normalizedTarget = normalizePathname(rawPath);
  const terms = extractSlugQueryTerms(rawPath);

  const queryFeed = async (querySuffix: string): Promise<MovieItem | null> => {
    const [moviesRaw, seriesRaw] = await Promise.all([
      fetchBloggerJson(
        `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(MOVIE_FEED_LABEL)}?alt=json&${querySuffix}`,
      ).catch(() => null),
      fetchBloggerJson(
        `${BLOGGER_SOURCE_ORIGIN}/feeds/posts/default/-/${encodeURIComponent(SERIES_FEED_LABEL)}?alt=json&${querySuffix}`,
      ).catch(() => null),
    ]);
    const candidates = [
      ...(seriesRaw ? parseBloggerFeed(seriesRaw, 'series').items : []),
      ...(moviesRaw ? parseBloggerFeed(moviesRaw, 'movie').items : []),
    ];
    return (
      candidates.find((item) => normalizePathname(item.pathname) === normalizedTarget) ??
      null
    );
  };

  if (terms) {
    const byQuery = await queryFeed(`q=${encodeURIComponent(terms)}&max-results=15`);
    if (byQuery) return byQuery;
  }

  const windowRange = buildMonthDateWindow(rawPath);
  if (windowRange) {
    const byMonth = await queryFeed(
      `published-min=${encodeURIComponent(windowRange.minIso)}&published-max=${encodeURIComponent(windowRange.maxIso)}&max-results=100`,
    );
    if (byMonth) return byMonth;
  }

  return null;
}

function sendJson(
  req: Request,
  res: Response,
  payload: unknown,
  cacheControl = 'public, max-age=120, stale-while-revalidate=600',
): void {
  const jsonText = JSON.stringify(payload);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);

  const acceptEncoding = String(req.headers['accept-encoding'] ?? '');
  if (acceptEncoding.includes('gzip') && jsonText.length > 1024) {
    zlib.gzip(Buffer.from(jsonText, 'utf-8'), (err, compressed) => {
      if (err) {
        res.send(jsonText);
        return;
      }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.send(compressed);
    });
    return;
  }

  res.send(jsonText);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Health endpoint
  app.get('/firimu/api/health', (_req, res) => {
    res.json({
      ok: true,
      cachedPosts: postsCache?.data.length ?? 0,
      cachedPages: pagesCache?.data.length ?? 0,
    });
  });

  // Catalogue API
  app.get('/firimu/api/movies', async (req, res) => {
    try {
      const allItems = await fetchAllBloggerPosts();
      const typeFilter = String(req.query.type ?? 'all').toLowerCase();
      const labelFilter = String(req.query.label ?? '').trim().toLowerCase();
      const vjFilter = String(req.query.vj ?? '').trim().toLowerCase();
      const query = String(req.query.q ?? '').trim().toLowerCase();
      const returnAll = req.query.all === 'true';

      let filtered = allItems;
      if (typeFilter === 'movie' || typeFilter === 'movies') {
        filtered = filtered.filter((item) => item.contentType === 'movie');
      } else if (typeFilter === 'series') {
        filtered = filtered.filter((item) => item.contentType === 'series');
      }

      if (labelFilter) {
        filtered = filtered.filter(
          (item) =>
            item.labels.some((l) => l.toLowerCase() === labelFilter) ||
            item.genres.some((g) => g.toLowerCase() === labelFilter) ||
            item.vjName.toLowerCase() === labelFilter,
        );
      }

      if (vjFilter && vjFilter !== 'all') {
        filtered = filtered.filter(
          (item) => item.vjName.toLowerCase() === vjFilter,
        );
      }

      if (query) {
        filtered = filtered.filter((item) => {
          const haystack = [
            item.displayTitle,
            item.title,
            item.vjName,
            ...item.genres,
            ...item.labels,
            ...item.synopsis,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        });
      }

      const genreSet = new Set<string>(MOVIE_GENRES);
      const vjSet = new Set<string>(VJ_LIST);
      for (const item of allItems) {
        for (const g of item.genres) genreSet.add(g);
        if (item.vjName && item.vjName !== 'All VJs') vjSet.add(item.vjName);
      }

      if (returnAll) {
        sendJson(req, res, {
          items: filtered,
          total: filtered.length,
          genres: Array.from(genreSet),
          vjs: Array.from(vjSet),
          fetchedAt: postsCache?.fetchedAt ?? Date.now(),
          source: 'server-cache',
        });
        return;
      }

      const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(String(req.query.limit ?? '24'), 10) || 24),
      );
      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      sendJson(req, res, {
        items: paged,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        genres: Array.from(genreSet),
        vjs: Array.from(vjSet),
        fetchedAt: postsCache?.fetchedAt ?? Date.now(),
        source: 'server-cache',
      });
    } catch {
      res.status(502).json({
        error: 'Unable to fetch upstream feed from server',
        fallbackRequired: true,
      });
    }
  });

  // Single movie/series endpoint (fast cold-boot path + instant cached path)
  app.get('/firimu/api/movie', async (req, res) => {
    const rawPath = String(req.query.path ?? '').trim();
    if (!rawPath || !rawPath.startsWith('/')) {
      res.status(400).json({error: 'Valid path parameter is required'});
      return;
    }

    const normalizedTarget = normalizePathname(rawPath);

    try {
      if (!postsCache) {
        // Trigger background full-catalogue warming while resolving this single movie quickly
        void fetchAllBloggerPosts().catch(() => {});
        const fastItem = await findSingleMovieFastOnServer(rawPath);
        if (fastItem) {
          sendJson(req, res, {
            item: fastItem,
            prevItem: null,
            nextItem: null,
            related: [],
          });
          return;
        }
      }

      const allItems = await fetchAllBloggerPosts();
      const idx = allItems.findIndex(
        (item) => normalizePathname(item.pathname) === normalizedTarget,
      );
      if (idx === -1) {
        res.status(404).json({error: 'Movie or series not found'});
        return;
      }

      const item = allItems[idx];
      const prevItem = idx > 0 ? allItems[idx - 1] : null; // Newer
      const nextItem = idx < allItems.length - 1 ? allItems[idx + 1] : null; // Older

      const related = allItems
        .filter((other) => other.pathname !== item.pathname)
        .map((other) => {
          let score = 0;
          if (other.vjName === item.vjName) score += 2;
          for (const g of other.genres) {
            if (item.genres.includes(g)) score += 3;
          }
          if (other.contentType === item.contentType) score += 1;
          return {other, score};
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((entry) => entry.other);

      sendJson(req, res, {item, prevItem, nextItem, related});
    } catch {
      res.status(502).json({
        error: 'Unable to fetch upstream feed from server',
        fallbackRequired: true,
      });
    }
  });

  // Static pages endpoint
  app.get('/firimu/api/pages', async (req, res) => {
    try {
      const pages = await fetchAllBloggerPages();
      sendJson(
        req,
        res,
        {pages, fetchedAt: pagesCache?.fetchedAt ?? Date.now()},
        'public, max-age=300, stale-while-revalidate=1800',
      );
    } catch {
      res.status(502).json({
        error: 'Unable to fetch static pages from server',
        fallbackRequired: true,
      });
    }
  });

  // SSRF-safe media stream endpoint for in-app 24h offline caching (CORS-free same-origin)
  const isPrivateHost = (hostname: string): boolean => {
    const low = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      low === 'localhost' ||
      low === '0.0.0.0' ||
      low === '::1' ||
      low.endsWith('.local') ||
      low.endsWith('.internal') ||
      low.endsWith('.localhost')
    ) {
      return true;
    }
    if (net.isIPv4(low)) {
      const parts = low.split('.').map(Number);
      if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
    }
    if (net.isIPv6(low)) {
      if (low === '::' || low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) {
        return true;
      }
    }
    return false;
  };

  app.get('/firimu/api/offline-media', async (req, res) => {
    const rawUrl = String(req.query.url ?? '').trim();
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({error: 'Invalid media URL'});
      return;
    }

    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      isPrivateHost(parsed.hostname)
    ) {
      res.status(403).json({error: 'Disallowed media host'});
      return;
    }

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    try {
      const upstream = await fetch(parsed.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
        signal: ac.signal,
      });

      if (upstream.url) {
        try {
          const finalUrl = new URL(upstream.url);
          if (isPrivateHost(finalUrl.hostname)) {
            res.status(403).json({error: 'Disallowed redirect target'});
            return;
          }
        } catch {
          res.status(400).json({error: 'Invalid redirect URL'});
          return;
        }
      }

      if (!upstream.ok || !upstream.body) {
        res.status(upstream.status || 502).json({error: 'Media stream unavailable'});
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'video/mp4';
      const contentLength = upstream.headers.get('content-length');
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'private, max-age=86400');

      const nodeStream = Readable.fromWeb(
        upstream.body as unknown as NodeReadableStream,
      );
      nodeStream.on('error', () => {
        if (!res.headersSent) {
          res.status(502).end();
        } else {
          res.end();
        }
      });
      nodeStream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({error: 'Failed to stream media for offline storage'});
      }
    }
  });

  // Robots.txt under /firimu/
  app.get('/firimu/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      `User-agent: *\nAllow: /firimu/\n\nSitemap: ${CANONICAL_BASE_URL}/sitemap.xml\n`,
    );
  });

  // Dynamic sitemap.xml under /firimu/
  app.get('/firimu/sitemap.xml', async (_req, res) => {
    let items: MovieItem[] = postsCache?.data ?? [];
    if (items.length === 0) {
      try {
        items = await fetchAllBloggerPosts();
      } catch {
        items = [];
      }
    }

    interface SitemapUrl {
      loc: string;
      priority: string;
      changefreq: string;
      lastmod?: string;
    }

    const staticUrls: SitemapUrl[] = [
      {loc: `${CANONICAL_BASE_URL}/`, priority: '1.0', changefreq: 'daily'},
      {loc: `${CANONICAL_BASE_URL}/search`, priority: '0.8', changefreq: 'daily'},
      {loc: `${CANONICAL_BASE_URL}/search/label/nakamovies`, priority: '0.9', changefreq: 'daily'},
      {loc: `${CANONICAL_BASE_URL}/search/label/nakaseries`, priority: '0.9', changefreq: 'daily'},
      {loc: `${CANONICAL_BASE_URL}/p/about`, priority: '0.5', changefreq: 'monthly'},
      {loc: `${CANONICAL_BASE_URL}/p/contact-us`, priority: '0.5', changefreq: 'monthly'},
      {loc: `${CANONICAL_BASE_URL}/p/terms-and-conditions`, priority: '0.4', changefreq: 'monthly'},
      {loc: `${CANONICAL_BASE_URL}/p/privacy-policy`, priority: '0.4', changefreq: 'monthly'},
    ];

    for (const genre of MOVIE_GENRES) {
      staticUrls.push({
        loc: `${CANONICAL_BASE_URL}/search/label/${encodeURIComponent(genre)}`,
        priority: '0.7',
        changefreq: 'daily',
      });
    }
    for (const vj of VJ_LIST) {
      staticUrls.push({
        loc: `${CANONICAL_BASE_URL}/search/label/${encodeURIComponent(vj)}`,
        priority: '0.7',
        changefreq: 'daily',
      });
    }

    const itemUrls: SitemapUrl[] = items.map((item) => ({
      loc: `${CANONICAL_BASE_URL}${item.pathname}`,
      lastmod: item.updatedAt,
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const xmlEntries = [...staticUrls, ...itemUrls]
      .map((u) => {
        const lastmodTag = u.lastmod
          ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>`
          : '';
        return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmodTag}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
      })
      .join('\n');

    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`,
      );
  });

  // Redirect bare root `/` to `/firimu/`
  app.get('/', (_req, res) => {
    res.redirect(302, '/firimu/');
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // SPA HTML fallback for deep routes under /firimu/*
    app.use('/firimu', async (req, res, next) => {
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({'Content-Type': 'text/html'}).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      '/firimu',
      express.static(distDir, {
        index: 'index.html',
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js') ||
            filePath.endsWith('manifest.webmanifest')
          ) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('/firimu/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`M2a Movies (Firimu) listening on http://0.0.0.0:${PORT}/firimu/`);
    // Warm server cache immediately on startup so external deep links resolve instantly
    void fetchAllBloggerPosts().catch(() => {});
    void fetchAllBloggerPages().catch(() => {});
  });
}

startServer();
