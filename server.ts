import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Enable Express trust proxy so req.hostname, req.ip, and req.protocol reflect
// reverse proxies like Cloudflare Worker and Cloud Run
app.set('trust proxy', 1);

app.use(express.json());

// List of recognized / allowed hostnames for M2A
const ALLOWED_HOSTS = new Set([
  'm2a.marketing2advertising.com',
  'marketing2advertising.ai.studio',
  'marketing2advertising.com',
  'www.marketing2advertising.com',
  'naka.marketing2advertising.com',
]);

// CORS & Reverse Proxy Awareness Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if incoming origin is in our allowed domains or matches Cloud Run / AI Studio subdomains
  let isAllowedOrigin = false;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname.toLowerCase();
      if (
        ALLOWED_HOSTS.has(originHost) ||
        originHost.endsWith('.marketing2advertising.com') ||
        originHost.endsWith('.ai.studio') ||
        originHost.endsWith('.run.app') ||
        originHost === 'localhost' ||
        originHost === '127.0.0.1'
      ) {
        isAllowedOrigin = true;
      }
    } catch {
      isAllowedOrigin = false;
    }
  }

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Same-origin request
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  // Inform clients and proxies of the resolved public primary domain
  res.setHeader('X-Custom-Domain', 'https://m2a.marketing2advertising.com');
  res.setHeader('Vary', 'Origin, X-Forwarded-Host');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper function to fetch remote data with redirect handling
function fetchUrl(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }
      https.get(
        currentUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; M2A Mobile App) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/html, */*'
          }
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, currentUrl).toString();
            return makeRequest(nextUrl, redirectCount + 1);
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }

          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve(body));
        }
      ).on('error', (err) => reject(err));
    };

    makeRequest(targetUrl);
  });
}

// In-memory cache for feed requests (10 minutes TTL)
interface CacheEntry {
  timestamp: number;
  data: unknown;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Blogger Feed Proxy API (supports both main site and naka subdomain)
app.get('/api/blogger/feed', async (req, res) => {
  try {
    const {
      site = 'main', // 'main' | 'naka'
      type = 'posts', // 'posts' | 'pages' | 'summary'
      maxResults = 20,
      startIndex = 1,
      label,
      q,
      id
    } = req.query;

    const baseHost = site === 'naka' ? 'https://naka.marketing2advertising.com' : 'https://www.marketing2advertising.com';

    let feedPath = '';
    if (id) {
      feedPath = `/feeds/posts/default/${id}?alt=json`;
    } else if (label) {
      feedPath = `/feeds/posts/default/-/${encodeURIComponent(String(label))}?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    } else if (q) {
      feedPath = `/feeds/posts/default?alt=json&q=${encodeURIComponent(String(q))}&max-results=${maxResults}&start-index=${startIndex}`;
    } else if (type === 'pages') {
      feedPath = `/feeds/pages/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    } else if (type === 'summary') {
      feedPath = `/feeds/posts/summary?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    } else {
      feedPath = `/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    }

    const fullUrl = `${baseHost}${feedPath}`;
    const cacheKey = `feed:${fullUrl}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const rawData = await fetchUrl(fullUrl);
    const parsed = JSON.parse(rawData);

    cache.set(cacheKey, { timestamp: Date.now(), data: parsed });
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Feed error:', message);
    res.status(500).json({ error: 'Failed to fetch Blogger feed', message });
  }
});

// Dedicated Naka Firimu Movies Scanner API (scans and extracts playable video URLs)
app.get('/api/naka/movies', async (req, res) => {
  try {
    const {
      maxResults = 24,
      startIndex = 1,
      vj,
      q,
      label
    } = req.query;

    let feedPath = `/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    if (label) {
      feedPath = `/feeds/posts/default/-/${encodeURIComponent(String(label))}?alt=json&max-results=${maxResults}&start-index=${startIndex}`;
    } else if (q) {
      feedPath = `/feeds/posts/default?alt=json&q=${encodeURIComponent(String(q))}&max-results=${maxResults}&start-index=${startIndex}`;
    }

    const fullUrl = `https://naka.marketing2advertising.com${feedPath}`;
    const cacheKey = `naka_movies:${fullUrl}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const rawData = await fetchUrl(fullUrl);
    const parsed = JSON.parse(rawData);
    const entries = parsed.feed?.entry || [];
    const totalResults = parseInt(parsed.feed?.openSearch$totalResults?.$t || '0', 10);

    const movies = entries.map((entry: any) => {
      const postIdMatch = entry.id?.$t.match(/post-(\d+)/);
      const postId = postIdMatch ? postIdMatch[1] : (entry.id?.$t || Math.random().toString());
      const rawTitle = entry.title?.$t || 'Untitled Movie';
      const rawContent = entry.content?.$t || entry.summary?.$t || '';

      // 1. Scan and extract video URL:
      // Pattern A: [/ddr45/]URL[/ddr45/]
      const ddrMatch = rawContent.match(/\[\/ddr45\/\](.*?)\[\/ddr45\/\]/i);
      // Pattern B: direct MP4 URL
      const mp4Match = rawContent.match(/https?:\/\/[^\s"'<>]+\.mp4/i);
      // Pattern C: direct m3u8 URL
      const m3u8Match = rawContent.match(/https?:\/\/[^\s"'<>]+\.m3u8/i);
      // Pattern D: HTML video or source tag
      const videoTagMatch = rawContent.match(/<video[^>]+src=["']([^"']+)["']/i);
      const sourceTagMatch = rawContent.match(/<source[^>]+src=["']([^"']+)["']/i);
      // Pattern E: Iframe embed
      const iframeMatch = rawContent.match(/<iframe[^>]+src=["']([^"']+)["']/i);

      let videoUrl = '';
      if (ddrMatch && ddrMatch[1]) {
        videoUrl = ddrMatch[1].trim();
      } else if (mp4Match) {
        videoUrl = mp4Match[0].trim();
      } else if (m3u8Match) {
        videoUrl = m3u8Match[0].trim();
      } else if (sourceTagMatch) {
        videoUrl = sourceTagMatch[1].trim();
      } else if (videoTagMatch) {
        videoUrl = videoTagMatch[1].trim();
      } else if (iframeMatch) {
        videoUrl = iframeMatch[1].trim();
      }

      // 2. Scan VJ Name (VJ Junior, VJ Emmy, VJ Ice P, VJ Kriss Sweet, VJ MK Kisuule, VJ Jingo, etc.)
      const vjMatch = rawTitle.match(/(VJ\s+[A-Za-z0-9\s]+?)(?:\s*[-–—:]|\s+in|\s+kali|\s+new|\s*$)/i)
        || rawContent.match(/Kali\s+Mu:\s*<[^>]*>?(VJ\s+[^<]+)/i)
        || rawContent.match(/(VJ\s+[A-Za-z0-9\s]{3,20})/i);

      const vjName = vjMatch ? vjMatch[1].trim() : 'VJ Junior';

      // 3. Clean Movie Title
      let cleanTitle = rawTitle;
      cleanTitle = cleanTitle.replace(/^VJ\s+[^–—:-]+[–—:-]\s*/i, '').trim();

      // 4. Extract Poster / Thumbnail
      let poster = entry.media$thumbnail?.url || '';
      if (!poster) {
        const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) poster = imgMatch[1];
      }
      if (poster.includes('/s72-c/')) {
        poster = poster.replace('/s72-c/', '/w800-h500-c/');
      } else if (poster.includes('/s750/')) {
        poster = poster.replace('/s750/', '/w800-h500-c/');
      }

      // 5. Clean synopsis
      const tempSummary = rawContent
        .replace(/<[^>]+>/g, ' ')
        .replace(/\[\/ddr45\].*?\[\/ddr45\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);

      const altLink = (entry.link || []).find((l: any) => l.rel === 'alternate')?.href || '';
      const categories = (entry.category || []).map((c: any) => c.term);

      return {
        id: postId,
        title: rawTitle,
        cleanTitle,
        vj: vjName,
        videoUrl,
        poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        summary: tempSummary ? `${tempSummary}...` : '',
        content: rawContent,
        categories,
        published: entry.published?.$t || new Date().toISOString(),
        url: altLink
      };
    });

    const result = {
      movies,
      totalResults,
      hasMore: startIndex + movies.length <= totalResults
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Naka movies error:', message);
    res.status(500).json({ error: 'Failed to scan naka movies', message });
  }
});

// Real URL Embed Proxy API (allows in-app embedding without X-Frame-Options or frame-busting blocks)
app.get('/api/embed', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('Missing url parameter');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).send('Invalid url parameter');
    }

    const allowedHosts = [
      'marketing2advertising.com',
      'www.marketing2advertising.com',
      'naka.marketing2advertising.com',
      'm2a.marketing2advertising.com',
      'blogger.com',
      'blogspot.com',
      'nmj-movies.unseen.africa',
    ];

    const hostMatches = allowedHosts.some((h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`));
    if (!hostMatches) {
      return res.status(403).send('Domain not allowed for embedding');
    }

    const cacheKey = `embed:${rawUrl}`;
    const cached = cache.get(cacheKey);
    let html = '';
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      html = cached.data as string;
    } else {
      html = await fetchUrl(rawUrl);
      cache.set(cacheKey, { timestamp: Date.now(), data: html });
    }

    // Inject <base href="..."> into <head> so images, relative scripts, and css resolve correctly
    const baseTag = `<base href="${rawUrl}">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Neutralize frame-busting scripts (e.g. top.location = self.location, window.top.location = window.self.location)
    html = html.replace(/top\.location\s*=\s*(self|window)\.location/gi, '/* frame-busting neutralized */');
    html = html.replace(/window\.top\s*!==\s*window\.self/gi, 'false');
    html = html.replace(/top\s*!==\s*self/gi, 'false');

    // Remove any restrictive headers from the response
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Embed error:', message);
    res.status(500).send(`Failed to load embedded page: ${message}`);
  }
});

// Blogger Static Page Extractor API
app.get('/api/blogger/page', async (req, res) => {
  try {
    const pagePath = req.query.path as string;
    if (!pagePath || !pagePath.startsWith('/p/')) {
      return res.status(400).json({ error: 'Valid /p/... path is required' });
    }

    const pagesFilePath = path.join(__dirname, 'public', 'data', 'pages.json');
    if (fs.existsSync(pagesFilePath)) {
      try {
        const pagesData = JSON.parse(fs.readFileSync(pagesFilePath, 'utf8'));
        if (pagesData[pagePath]) {
          return res.json(pagesData[pagePath]);
        }
      } catch (err) {
        console.warn('Error reading pages.json:', err);
      }
    }

    const fullUrl = `https://www.marketing2advertising.com${pagePath}`;
    const cacheKey = `page:${fullUrl}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const html = await fetchUrl(fullUrl);

    // Extract page title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace('marketing2advertising:', '').trim() : 'M2A Page';

    let contentHtml = '';
    const bodyMatch = html.match(/<div class=['"][^'"]*post-body[^'"]*['"][^>]*>([\s\S]*?)<\/div>\s*<div class=['"][^'"]*post-footer/i)
      || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

    if (bodyMatch) {
      contentHtml = bodyMatch[1];
    } else {
      contentHtml = '<p>Content loaded from marketing2advertising.com</p>';
    }

    const result = {
      title,
      url: fullUrl,
      contentHtml
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: result });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Page error:', message);
    res.status(500).json({ error: 'Failed to fetch page', message });
  }
});

// App data API endpoints
app.get('/api/channels', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'data', 'channels.json');
    res.sendFile(filePath);
  } catch {
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

app.get('/api/apps', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'data', 'apps.json');
    res.sendFile(filePath);
  } catch {
    res.status(500).json({ error: 'Failed to load apps' });
  }
});

app.get('/api/games', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'data', 'games.json');
    res.sendFile(filePath);
  } catch {
    res.status(500).json({ error: 'Failed to load games' });
  }
});

// Health check endpoint for Cloud Run and Cloudflare Worker
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// App configuration and custom domain endpoint (proxy and host-aware)
app.get('/api/config', (req, res) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : req.get('host') || 'm2a.marketing2advertising.com';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';

  res.json({
    name: 'M2A',
    primaryPublicUrl: 'https://m2a.marketing2advertising.com/',
    currentOrigin: `${proto}://${host}`,
    customDomain: 'https://m2a.marketing2advertising.com',
    aiStudioDomain: 'https://marketing2advertising.ai.studio',
    mainDomain: 'https://www.marketing2advertising.com',
    nakaDomain: 'https://naka.marketing2advertising.com',
    canonicalUrl: 'https://m2a.marketing2advertising.com/',
    detectedHost: host,
    detectedProtocol: proto,
    status: 'configured',
  });
});

// Setup Vite or static serving
async function setupServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`M2A Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
