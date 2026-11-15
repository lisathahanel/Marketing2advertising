import express, { type NextFunction, type Request, type Response } from 'express';\nimport nodemailer from 'nodemailer';\nimport dns from 'node:dns/promises';
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

app.use(express.json({ limit: '512kb' }));

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


const M2A_FRONTEND_ORIGIN = 'https://marketing2advertising.com';

function resolveConfiguredOrigins(): Set<string> {
  const origins = new Set<string>([M2A_FRONTEND_ORIGIN]);
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }
  return origins;
}

const ALLOWED_EXTERNAL_ORIGINS = resolveConfiguredOrigins();

function isOriginAllowed(originHeader: string | undefined, req: Request): boolean {
  if (!originHeader) return true; // Non-browser / same-host requests without Origin
  if (ALLOWED_EXTERNAL_ORIGINS.has(originHeader)) return true;

  // Always allow same-origin requests from the hosted app itself
  const hostHeader = req.get('host');
  if (hostHeader) {
    if (originHeader === `https://${hostHeader}` || originHeader === `http://${hostHeader}`) {
      return true;
    }
  }
  return false;
}

const STRICT_EMAIL_REGEX =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function isValidEmail(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254 || trimmed.includes('..')) return false;
  return STRICT_EMAIL_REGEX.test(trimmed);
}

function hasHeaderInjection(value: string | undefined): boolean {
  if (!value) return false;
  return /[\r\n\0]/.test(value);
}

function isPublicHostname(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host.length > 253 || /[\s/\\@]/.test(host)) return false;

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return false;
  }

  return /^[a-z0-9.-]+$/i.test(host) || /^[0-9a-f:]+$/i.test(host);
}

function isSafeExternalHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return isPublicHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function sanitizeErrorText(rawMessage: string): string {
  return rawMessage
    .replace(/(api[_-]?key|apikey|key|token|password|pass)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bSG\.[A-Za-z0-9._-]{10,}\b/g, 'SG.[REDACTED]')
    .slice(0, 280);
}

interface RateBucket {
  count: number;
  resetAt: number;
}

function createRateLimiter(maxRequests: number, windowMs: number, actionLabel: string) {
  const buckets = new Map<string, RateBucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const existing = buckets.get(ip);

    if (!existing || existing.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - 1)));
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        ok: false,
        error: `Rate limit exceeded for ${actionLabel}. Try again in ${retryAfterSec}s.`,
      });
      return;
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - existing.count)));
    next();
  };
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
}

interface ApiConfig {
  provider: 'resend' | 'sendgrid' | 'brevo' | 'postmark' | 'custom';
  endpointUrl: string;
  authHeaderName: string;
  authToken: string;
}

interface SendOnePayload {
  mode: 'smtp' | 'api';
  smtp?: SmtpConfig;
  api?: ApiConfig;
  fromName?: string;
  fromEmail: string;
  replyTo?: string;
  to: string;
  subject: string;
  html?: string;
  text: string;
}

const healthLimiter = createRateLimiter(120, 60_000, 'health check');
const smtpTestLimiter = createRateLimiter(15, 60_000, 'SMTP connection testing');
const verifySenderLimiter = createRateLimiter(30, 60_000, 'sender verification');
const verifyRecipientLimiter = createRateLimiter(120, 60_000, 'recipient verification');
const sendMinuteLimiter = createRateLimiter(100, 60_000, 'email sending');
const sendHourLimiter = createRateLimiter(1000, 60 * 60_000, 'hourly email sending');

// Campaign endpoints are intentionally restricted to the production M2A frontend.
app.use('/api/campaign', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const sameOrigin = !origin || origin === `https://${req.get('host')}` || origin === `http://${req.get('host')}`;
  if (origin && origin !== M2A_FRONTEND_ORIGIN && !sameOrigin) {
    res.removeHeader('Access-Control-Allow-Origin');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.status(403).json({ ok: false, error: 'Cross-origin request blocked by CORS policy.' });
    return;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
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
app.get('/api/health', healthLimiter, (_req: Request, res: Response) => {
  res.json({
    ok: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    emailCampaignEndpoints: [
      'POST /api/campaign/test-smtp',
      'POST /api/campaign/verify-sender',
      'POST /api/campaign/verify-recipient',
      'POST /api/campaign/send-one',
    ],
    emailCampaignCorsOrigin: M2A_FRONTEND_ORIGIN,
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

  // Verify user's SMTP credentials without storing or logging them
  app.post('/api/campaign/test-smtp', smtpTestLimiter, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Partial<SmtpConfig>;
    const host = (body.host ?? '').trim();
    const port = Number(body.port);

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      res.status(400).json({ ok: false, error: 'Valid SMTP host and port (1-65535) are required.' });
      return;
    }

    if (!isPublicHostname(host)) {
      res.status(400).json({
        ok: false,
        error: 'Private, loopback, or invalid SMTP hostnames are not permitted.',
      });
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: Boolean(body.secure),
        auth: body.username?.trim()
          ? {
              user: body.username.trim(),
              pass: body.password ?? '',
            }
          : undefined,
        connectionTimeout: 9000,
        greetingTimeout: 9000,
        socketTimeout: 10000,
      });

      await transporter.verify();
      res.json({
        ok: true,
        message: `Connected and authenticated to ${host}:${port}.`,
      });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Unable to connect to SMTP server.';
      res.status(400).json({ ok: false, error: sanitizeErrorText(rawMessage) });
    }
  });

  // Discreetly verify From Email domain DNS (MX / SPF / DMARC) & SMTP username alignment
  app.post(
    '/api/campaign/verify-sender',
    verifySenderLimiter,
    async (req: Request, res: Response) => {
      const body = (req.body ?? {}) as {
        fromEmail?: string;
        smtpUsername?: string;
        smtpHost?: string;
      };

      const email = (body.fromEmail ?? '').trim().toLowerCase();
      const smtpUser = (body.smtpUsername ?? '').trim().toLowerCase();
      const smtpHost = (body.smtpHost ?? '').trim().toLowerCase();

      if (!isValidEmail(email)) {
        res.status(400).json({
          ok: false,
          error: 'Enter a valid From Email address before verifying.',
        });
        return;
      }

      const domain = email.split('@')[1] ?? '';
      const smtpUserIsEmail = isValidEmail(smtpUser);
      const matchesSmtpUser = smtpUserIsEmail && email === smtpUser;
      const sameDomainAsSmtpUser =
        smtpUserIsEmail && (smtpUser.split('@')[1] ?? '') === domain;

      const withTimeout = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 4500)),
          ]);
        } catch {
          return fallback;
        }
      };

      const mxRecords = await withTimeout(dns.resolveMx(domain), []);
      const hasMx = Array.isArray(mxRecords) && mxRecords.length > 0;

      if (!hasMx) {
        res.status(400).json({
          ok: false,
          email,
          domain,
          hasMx: false,
          hasSpf: false,
          hasDmarc: false,
          matchesSmtpUser,
          sameDomainAsSmtpUser,
          error: `Domain "${domain}" has no valid MX mail records. Use a real sending domain or your SMTP Username.`,
        });
        return;
      }

      const rootTxt = await withTimeout(dns.resolveTxt(domain), []);
      const hasSpf = rootTxt.some((chunks) =>
        chunks.join('').toLowerCase().includes('v=spf1')
      );

      const dmarcTxt = await withTimeout(dns.resolveTxt(`_dmarc.${domain}`), []);
      const hasDmarc = dmarcTxt.some((chunks) =>
        chunks.join('').toLowerCase().includes('v=dmarc1')
      );

      const isRelayHost =
        smtpHost.includes('sendgrid') ||
        smtpHost.includes('smtp.com') ||
        smtpHost.includes('amazonaws');

      const dnsParts = [
        'MX verified',
        hasSpf ? 'SPF found' : 'SPF missing',
        hasDmarc ? 'DMARC found' : 'DMARC missing',
      ].join(' · ');

      const relayNote = isRelayHost
        ? ' Ensure this sender is also authorized in your SendGrid / SMTP.com / SES dashboard.'
        : '';

      res.json({
        ok: true,
        email,
        domain,
        hasMx,
        hasSpf,
        hasDmarc,
        matchesSmtpUser,
        sameDomainAsSmtpUser,
        message: `Sender ${email} verified (${dnsParts}).${relayNote}`,
      });
    }
  );

  // Proxy third-party email verification API checks (never persists or logs API keys)
  app.post(
    '/api/campaign/verify-recipient',
    verifyRecipientLimiter,
    async (req: Request, res: Response) => {
      const body = (req.body ?? {}) as {
        provider?: string;
        apiKey?: string;
        customEndpoint?: string;
        email?: string;
      };

      const provider = (body.provider ?? 'zerobounce').trim().toLowerCase();
      const apiKey = (body.apiKey ?? '').trim();
      const email = (body.email ?? '').trim().toLowerCase();

      if (!isValidEmail(email)) {
        res.status(400).json({ ok: false, error: 'A valid recipient email address is required.' });
        return;
      }

      if (!apiKey && provider !== 'custom') {
        res.status(400).json({ ok: false, error: 'Verification API key is required.' });
        return;
      }

      type NormalizedVerdict = 'Valid' | 'Invalid' | 'Catch-all' | 'Risky' | 'Role-based' | 'Unknown';

      try {
        let targetUrl = '';
        const headers: Record<string, string> = { Accept: 'application/json' };

        if (provider === 'zerobounce') {
          targetUrl = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(
            apiKey
          )}&email=${encodeURIComponent(email)}`;
        } else if (provider === 'hunter') {
          targetUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
            email
          )}&api_key=${encodeURIComponent(apiKey)}`;
        } else if (provider === 'neverbounce') {
          targetUrl = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(
            apiKey
          )}&email=${encodeURIComponent(email)}`;
        } else if (provider === 'kickbox') {
          targetUrl = `https://api.kickbox.com/v2/verify?email=${encodeURIComponent(
            email
          )}&apikey=${encodeURIComponent(apiKey)}`;
        } else if (provider === 'abstract') {
          targetUrl = `https://emailvalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(
            apiKey
          )}&email=${encodeURIComponent(email)}`;
        } else if (provider === 'myemailverifier') {
          targetUrl = `https://client.myemailverifier.com/verifier/validate_single/${encodeURIComponent(
            email
          )}/${encodeURIComponent(apiKey)}`;
        } else if (provider === 'custom') {
          const templateUrl = (body.customEndpoint ?? '').trim();
          if (!templateUrl) {
            res.status(400).json({ ok: false, error: 'Custom verification endpoint URL is required.' });
            return;
          }
          let resolvedUrl = templateUrl.replace(/\{email\}/gi, encodeURIComponent(email));
          if (/\{apiKey\}/i.test(resolvedUrl)) {
            resolvedUrl = resolvedUrl.replace(/\{apiKey\}/gi, encodeURIComponent(apiKey));
          } else {
            const joiner = resolvedUrl.includes('?') ? '&' : '?';
            if (!/email=/i.test(resolvedUrl) && !templateUrl.toLowerCase().includes('{email}')) {
              resolvedUrl = `${resolvedUrl}${joiner}email=${encodeURIComponent(email)}`;
            }
            if (apiKey) {
              headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
            }
          }
          if (!isSafeExternalHttpsUrl(resolvedUrl)) {
            res.status(400).json({
              ok: false,
              error: 'Custom verification URL must be a valid public HTTPS URL.',
            });
            return;
          }
          targetUrl = resolvedUrl;
        } else {
          res.status(400).json({ ok: false, error: `Unsupported verification provider: ${provider}` });
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const apiRes = await fetch(targetUrl, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);

        const rawText = await apiRes.text();
        let data: Record<string, unknown> | null = null;
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          data = null;
        }

        if (!apiRes.ok) {
          const nestedErrors = Array.isArray(data?.errors)
            ? (data?.errors[0] as Record<string, unknown> | undefined)?.details
            : undefined;
          const errMsg =
            (typeof data?.error === 'string' && data.error) ||
            (typeof data?.message === 'string' && data.message) ||
            (typeof nestedErrors === 'string' && nestedErrors) ||
            `Provider returned HTTP ${apiRes.status}`;
          res.status(502).json({ ok: false, error: sanitizeErrorText(errMsg) });
          return;
        }

        let deliverability: NormalizedVerdict = 'Unknown';
        let rawStatus = 'unknown';
        let detail = 'Verification check completed';

        if (provider === 'zerobounce' && data) {
          if (typeof data.error === 'string' && data.error) {
            res.status(400).json({ ok: false, error: sanitizeErrorText(data.error) });
            return;
          }
          const status = String(data.status ?? '').toLowerCase();
          const subStatus = String(data.sub_status ?? '').toLowerCase();
          rawStatus = subStatus ? `${status} (${subStatus})` : status || 'unknown';
          if (status === 'valid') {
            deliverability = 'Valid';
            detail = 'Mailbox confirmed deliverable by ZeroBounce';
          } else if (status === 'invalid' || status === 'spamtrap' || status === 'abuse') {
            deliverability = 'Invalid';
            detail = subStatus ? `ZeroBounce: ${subStatus.replace(/_/g, ' ')}` : 'Undeliverable address';
          } else if (status === 'catch-all') {
            deliverability = 'Catch-all';
            detail = 'Domain accepts all mail (catch-all server)';
          } else if (status === 'do_not_mail') {
            deliverability = subStatus === 'role_based' ? 'Role-based' : 'Risky';
            detail = subStatus ? `Do not mail: ${subStatus.replace(/_/g, ' ')}` : 'Flagged do_not_mail';
          } else {
            deliverability = 'Unknown';
            detail = subStatus ? `Status unknown (${subStatus.replace(/_/g, ' ')})` : 'Status unknown';
          }
        } else if (provider === 'hunter' && data) {
          const payloadData = (data.data as Record<string, unknown> | undefined) ?? data;
          const status = String(payloadData.status ?? '').toLowerCase();
          const score = typeof payloadData.score === 'number' ? payloadData.score : undefined;
          rawStatus = status || 'unknown';
          if (status === 'valid' || status === 'webmail') {
            deliverability = 'Valid';
            detail =
              score !== undefined
                ? `Hunter score ${score}/100 (${status})`
                : `Hunter status: ${status}`;
          } else if (status === 'invalid' || status === 'disposable') {
            deliverability = 'Invalid';
            detail = `Hunter status: ${status}`;
          } else if (status === 'accept_all') {
            deliverability = 'Catch-all';
            detail =
              score !== undefined ? `Accept-all domain (score ${score}/100)` : 'Accept-all domain';
          } else {
            deliverability = 'Unknown';
            detail =
              score !== undefined
                ? `Hunter status: ${status} (score ${score}/100)`
                : `Hunter status: ${status}`;
          }
        } else if (provider === 'neverbounce' && data) {
          if (data.status && data.status !== 'success') {
            res.status(400).json({
              ok: false,
              error: sanitizeErrorText(
                String(data.message ?? data.status ?? 'NeverBounce verification failed')
              ),
            });
            return;
          }
          const result = String(data.result ?? '').toLowerCase();
          rawStatus = result || 'unknown';
          if (result === 'valid') {
            deliverability = 'Valid';
            detail = 'Confirmed valid by NeverBounce';
          } else if (result === 'invalid' || result === 'disposable') {
            deliverability = 'Invalid';
            detail = `NeverBounce: ${result}`;
          } else if (result === 'catchall') {
            deliverability = 'Catch-all';
            detail = 'Catch-all domain detected by NeverBounce';
          } else {
            deliverability = 'Unknown';
            detail = `NeverBounce: ${result || 'unknown'}`;
          }
        } else if (provider === 'kickbox' && data) {
          if (data.success === false) {
            res.status(400).json({
              ok: false,
              error: sanitizeErrorText(String(data.message ?? 'Kickbox API error')),
            });
            return;
          }
          const result = String(data.result ?? '').toLowerCase();
          const reason = String(data.reason ?? '');
          rawStatus = result || 'unknown';
          if (result === 'deliverable') {
            deliverability = data.role === true ? 'Role-based' : 'Valid';
            detail =
              data.role === true
                ? 'Deliverable role-based mailbox'
                : 'Deliverable mailbox (Kickbox)';
          } else if (result === 'undeliverable') {
            deliverability = 'Invalid';
            detail = reason ? `Undeliverable (${reason})` : 'Undeliverable mailbox';
          } else if (result === 'risky') {
            deliverability = data.accept_all === true ? 'Catch-all' : 'Risky';
            detail = reason ? `Risky (${reason})` : 'Flagged risky by Kickbox';
          } else {
            deliverability = 'Unknown';
            detail = reason ? `Unknown (${reason})` : 'Status unknown';
          }
        } else if (provider === 'abstract' && data) {
          const deliv = String(data.deliverability ?? '').toUpperCase();
          rawStatus = deliv || 'UNKNOWN';
          if (deliv === 'DELIVERABLE') {
            deliverability =
              data.is_role_email &&
              (data.is_role_email as Record<string, unknown>).value === true
                ? 'Role-based'
                : 'Valid';
            detail = 'Deliverable (AbstractAPI)';
          } else if (deliv === 'UNDELIVERABLE') {
            deliverability = 'Invalid';
            detail = 'Undeliverable (AbstractAPI)';
          } else if (deliv === 'RISKY') {
            deliverability = 'Risky';
            detail = 'Risky address (AbstractAPI)';
          } else {
            deliverability = 'Unknown';
            detail = 'Status unknown (AbstractAPI)';
          }
        } else if (provider === 'myemailverifier' && data) {
          const status = String(data.Status ?? data.status ?? '');
          const lower = status.toLowerCase();
          rawStatus = status || 'Unknown';
          if (lower === 'valid') {
            deliverability = data.Role_Based === 'true' ? 'Role-based' : 'Valid';
            detail = String(data.Diagnosis ?? 'Valid mailbox (MyEmailVerifier)');
          } else if (lower === 'invalid') {
            deliverability = 'Invalid';
            detail = String(data.Diagnosis ?? 'Invalid mailbox');
          } else if (lower.includes('catch')) {
            deliverability = 'Catch-all';
            detail = String(data.Diagnosis ?? 'Catch-all domain');
          } else {
            deliverability = 'Unknown';
            detail = String(data.Diagnosis ?? `Status: ${rawStatus}`);
          }
        } else if (data) {
          const candidate = String(
            data.status ??
              data.result ??
              data.deliverability ??
              (data.data as Record<string, unknown> | undefined)?.status ??
              ''
          ).toLowerCase();
          rawStatus = candidate || 'response received';
          if (['valid', 'deliverable', 'ok', 'safe'].includes(candidate)) {
            deliverability = 'Valid';
            detail = `Custom API returned: ${rawStatus}`;
          } else if (['invalid', 'undeliverable', 'bad', 'bounced'].includes(candidate)) {
            deliverability = 'Invalid';
            detail = `Custom API returned: ${rawStatus}`;
          } else if (['catch-all', 'catchall', 'accept_all'].includes(candidate)) {
            deliverability = 'Catch-all';
            detail = `Custom API returned: ${rawStatus}`;
          } else if (['risky', 'do_not_mail', 'disposable'].includes(candidate)) {
            deliverability = 'Risky';
            detail = `Custom API returned: ${rawStatus}`;
          } else {
            deliverability = 'Unknown';
            detail = `Custom API returned: ${rawStatus}`;
          }
        }

        res.json({
          ok: true,
          email,
          provider,
          deliverability,
          rawStatus,
          detail,
          safeToSend:
            deliverability === 'Valid' ||
            deliverability === 'Catch-all' ||
            deliverability === 'Role-based',
        });
      } catch (error) {
        const rawMessage =
          error instanceof Error ? error.message : 'Unable to reach verification provider.';
        res.status(502).json({ ok: false, error: sanitizeErrorText(rawMessage) });
      }
    }
  );

  // Relay one campaign email via user's own authenticated SMTP or Email API (never persisted or logged)
  app.post(
    '/api/campaign/send-one',
    sendMinuteLimiter,
    sendHourLimiter,
    async (req: Request, res: Response) => {
      const payload = (req.body ?? {}) as Partial<SendOnePayload>;

      const toEmail = (payload.to ?? '').trim();
      const fromEmail = (payload.fromEmail ?? '').trim();
      const replyTo = (payload.replyTo ?? '').trim();
      const fromName = (payload.fromName ?? '').trim();
      const subject = (payload.subject ?? '').trim();

      if (!isValidEmail(toEmail) || !isValidEmail(fromEmail)) {
        res.status(400).json({
          ok: false,
          error: 'Valid single recipient (to) and sender (fromEmail) addresses are required.',
        });
        return;
      }

      if (replyTo && !isValidEmail(replyTo)) {
        res.status(400).json({
          ok: false,
          error: 'Reply-To must be a valid email address.',
        });
        return;
      }

      if (
        hasHeaderInjection(toEmail) ||
        hasHeaderInjection(fromEmail) ||
        hasHeaderInjection(replyTo) ||
        hasHeaderInjection(fromName) ||
        hasHeaderInjection(subject)
      ) {
        res.status(400).json({
          ok: false,
          error: 'Header fields cannot contain line breaks or control characters.',
        });
        return;
      }

      if (!subject || subject.length > 300) {
        res.status(400).json({
          ok: false,
          error: 'Subject is required and must be 300 characters or fewer.',
        });
        return;
      }

      if (fromName.length > 120) {
        res.status(400).json({
          ok: false,
          error: 'From Name must be 120 characters or fewer.',
        });
        return;
      }

      if (!payload.text?.trim() && !payload.html?.trim()) {
        res.status(400).json({
          ok: false,
          error: 'Email message body (text or html) is required.',
        });
        return;
      }

      const fromFormatted = fromName
        ? `"${fromName.replace(/["\\]/g, '')}" <${fromEmail}>`
        : fromEmail;

      const unsubscribeAddress = replyTo || fromEmail;

      if (payload.mode === 'smtp') {
        const smtp = payload.smtp;
        const host = (smtp?.host ?? '').trim();
        const port = Number(smtp?.port);

        if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
          res.status(400).json({
            ok: false,
            error: 'Valid SMTP host and port (1-65535) are required.',
          });
          return;
        }

        if (!isPublicHostname(host)) {
          res.status(400).json({
            ok: false,
            error: 'Private, loopback, or invalid SMTP hostnames are not permitted.',
          });
          return;
        }

        // Prevent unauthenticated open-relay abuse
        if (!smtp?.username?.trim() || !smtp?.password) {
          res.status(400).json({
            ok: false,
            error: 'SMTP authentication (username and password) is required to send.',
          });
          return;
        }

        try {
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: Boolean(smtp.secure),
            auth: {
              user: smtp.username.trim(),
              pass: smtp.password,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          });

          const info = await transporter.sendMail({
            from: fromFormatted,
            to: toEmail,
            replyTo: replyTo || undefined,
            subject,
            text: payload.text || '',
            html: payload.html || undefined,
            headers: {
              'List-Unsubscribe': `<mailto:${unsubscribeAddress}?subject=unsubscribe>`,
            },
          });

          res.json({
            ok: true,
            messageId: info.messageId,
            detail: info.response || 'Accepted by SMTP server',
          });
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : 'SMTP delivery failed.';
          res.status(502).json({ ok: false, error: sanitizeErrorText(rawMessage) });
        }
        return;
      }

      if (payload.mode === 'api') {
        const api = payload.api;
        if (!api?.endpointUrl || !api?.authToken?.trim()) {
          res.status(400).json({
            ok: false,
            error: 'API endpoint URL and authorization token/key are required.',
          });
          return;
        }

        const endpointUrl = api.endpointUrl.trim();
        if (!isSafeExternalHttpsUrl(endpointUrl)) {
          res.status(400).json({
            ok: false,
            error: 'Email API endpoint must be a valid public HTTPS URL.',
          });
          return;
        }

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          let requestBody: Record<string, unknown>;
          const token = api.authToken.trim();

          if (api.provider === 'resend') {
            headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            requestBody = {
              from: fromFormatted,
              to: [toEmail],
              subject,
              text: payload.text || undefined,
              html: payload.html || undefined,
              reply_to: replyTo || undefined,
              headers: {
                'List-Unsubscribe': `<mailto:${unsubscribeAddress}?subject=unsubscribe>`,
              },
            };
          } else if (api.provider === 'sendgrid') {
            headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            const content = [
              { type: 'text/plain', value: payload.text || ' ' },
              ...(payload.html ? [{ type: 'text/html', value: payload.html }] : []),
            ];
            requestBody = {
              personalizations: [{ to: [{ email: toEmail }] }],
              from: {
                email: fromEmail,
                ...(fromName ? { name: fromName } : {}),
              },
              ...(replyTo ? { reply_to: { email: replyTo } } : {}),
              subject,
              content,
              headers: {
                'List-Unsubscribe': `<mailto:${unsubscribeAddress}?subject=unsubscribe>`,
              },
            };
          } else if (api.provider === 'brevo') {
            headers['api-key'] = token;
            requestBody = {
              sender: {
                email: fromEmail,
                ...(fromName ? { name: fromName } : {}),
              },
              to: [{ email: toEmail }],
              ...(replyTo ? { replyTo: { email: replyTo } } : {}),
              subject,
              textContent: payload.text || undefined,
              htmlContent: payload.html || undefined,
              headers: {
                'List-Unsubscribe': `<mailto:${unsubscribeAddress}?subject=unsubscribe>`,
              },
            };
          } else if (api.provider === 'postmark') {
            headers['X-Postmark-Server-Token'] = token;
            headers.Accept = 'application/json';
            requestBody = {
              From: fromFormatted,
              To: toEmail,
              ...(replyTo ? { ReplyTo: replyTo } : {}),
              Subject: subject,
              TextBody: payload.text || undefined,
              HtmlBody: payload.html || undefined,
              Headers: [
                {
                  Name: 'List-Unsubscribe',
                  Value: `<mailto:${unsubscribeAddress}?subject=unsubscribe>`,
                },
              ],
            };
          } else {
            // Custom REST API
            const headerName = api.authHeaderName?.trim() || 'Authorization';
            if (hasHeaderInjection(headerName)) {
              res.status(400).json({ ok: false, error: 'Invalid Auth Header name.' });
              return;
            }
            headers[headerName] =
              headerName.toLowerCase() === 'authorization' && !token.includes(' ')
                ? `Bearer ${token}`
                : token;
            requestBody = {
              from: fromFormatted,
              fromName: fromName || undefined,
              fromEmail,
              replyTo: replyTo || undefined,
              to: toEmail,
              subject,
              text: payload.text || '',
              html: payload.html || undefined,
            };
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const apiRes = await fetch(endpointUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const rawResponseText = await apiRes.text();
          let parsedJson: Record<string, unknown> | null = null;
          try {
            parsedJson = JSON.parse(rawResponseText) as Record<string, unknown>;
          } catch {
            parsedJson = null;
          }

          if (!apiRes.ok) {
            const errDetail =
              (parsedJson?.message as string) ||
              (parsedJson?.error as string) ||
              rawResponseText.slice(0, 220) ||
              `API returned HTTP ${apiRes.status}`;
            res.status(502).json({ ok: false, error: sanitizeErrorText(errDetail) });
            return;
          }

          const messageId =
            (parsedJson?.id as string) ||
            (parsedJson?.messageId as string) ||
            (parsedJson?.MessageID as string) ||
            undefined;

          res.json({
            ok: true,
            messageId,
            detail: `HTTP ${apiRes.status} accepted by ${api.provider.toUpperCase()} API`,
          });
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : 'Email API request failed.';
          res.status(502).json({ ok: false, error: sanitizeErrorText(rawMessage) });
        }
        return;
      }

      res.status(400).json({ ok: false, error: 'Unsupported send mode. Use "smtp" or "api".' });
    }
  );

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
