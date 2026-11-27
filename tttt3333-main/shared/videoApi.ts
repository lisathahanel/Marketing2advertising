export type VideoSource = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'tilvids' | 'nasa';
export type SourceFilter = 'all' | VideoSource;
export type CategoryId =
  | 'trending'
  | 'family'
  | 'funny'
  | 'restaurants'
  | 'gadgets'
  | 'news'
  | 'howto'
  | 'podcasts'
  | 'music'
  | 'education'
  | 'sports'
  | 'cars';

export type EmojiKey = 'fire' | 'heart' | 'laugh' | 'clap' | 'star';

export interface VideoItem {
  id: string;
  source: VideoSource;
  title: string;
  author: string;
  authorHandle?: string;
  thumbnail: string;
  duration: string;
  views: string;
  published: string;
  isShort: boolean;
  category: CategoryId;
  mediaUrl?: string;
  canonicalUrl?: string;
  offlineReady?: boolean;
}

export interface CreatorProfile {
  handle: string;
  displayName: string;
  avatar: string;
  platforms: VideoSource[];
}

export interface StoredEngagementRecord {
  viewDevices: string[];
  reactionsByDevice: Record<string, EmojiKey>;
}

export interface EngagementSnapshot {
  views: number;
  reactions: Record<EmojiKey, number>;
  userEmoji: EmojiKey | null;
}

export const VALID_EMOJI_KEYS = new Set<EmojiKey>(['fire', 'heart', 'laugh', 'clap', 'star']);
export const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
export const VIDEO_KEY_RE = /^[a-z]{2,16}:[a-zA-Z0-9_.\-() ]{1,120}$/;

export const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
export const TIKTOK_ID_RE = /^\d{15,22}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const HANDLE_RE = /^[a-zA-Z0-9_.-]{1,50}$/;
export const NASA_ID_RE = /^[a-zA-Z0-9_ .\-()]{1,120}$/;

export const MAX_OFFLINE_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_THUMB_BYTES = 5 * 1024 * 1024;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function createEmptyReactions(): Record<EmojiKey, number> {
  return { fire: 0, heart: 0, laugh: 0, clap: 0, star: 0 };
}

function normalizeOrigin(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigin(
  requestOrigin: string | null,
  requestUrl: URL,
  configuredAppUrl?: string,
  extraAllowedOrigins?: string
): string | null {
  if (!requestOrigin) return null;
  const normalized = normalizeOrigin(requestOrigin);
  if (!normalized) return null;

  // Same-origin requests are always allowed
  if (normalized === requestUrl.origin) return normalized;

  // Production domain origins
  const allowed = new Set<string>([
    'https://marketing2advertising.com',
    'https://www.marketing2advertising.com',
  ]);

  if (configuredAppUrl) {
    const appOrigin = normalizeOrigin(configuredAppUrl);
    if (appOrigin) allowed.add(appOrigin);
  }

  if (extraAllowedOrigins) {
    for (const part of extraAllowedOrigins.split(',')) {
      const origin = normalizeOrigin(part);
      if (origin) allowed.add(origin);
    }
  }

  // Allow localhost origins only when the API itself is running locally
  if (
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'
  ) {
    const originHost = new URL(normalized).hostname;
    if (originHost === 'localhost' || originHost === '127.0.0.1') {
      return normalized;
    }
  }

  return allowed.has(normalized) ? normalized : null;
}

export function buildCorsHeaders(
  requestOrigin: string | null,
  requestUrl: URL,
  configuredAppUrl?: string,
  extraAllowedOrigins?: string
): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(
    requestOrigin,
    requestUrl,
    configuredAppUrl,
    extraAllowedOrigins
  );
  if (!allowedOrigin) {
    return { Vary: 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function isRequestOriginAllowed(
  requestOrigin: string | null,
  requestUrl: URL,
  configuredAppUrl?: string,
  extraAllowedOrigins?: string
): boolean {
  if (!requestOrigin) return true; // Non-browser or same-origin navigation without Origin header
  return Boolean(
    getAllowedOrigin(requestOrigin, requestUrl, configuredAppUrl, extraAllowedOrigins)
  );
}

export const VALID_CATEGORIES = new Set<CategoryId>([
  'trending',
  'family',
  'funny',
  'restaurants',
  'gadgets',
  'news',
  'howto',
  'podcasts',
  'music',
  'education',
  'sports',
  'cars',
]);

export const CATEGORY_EXPANSIONS: Record<CategoryId, string[]> = {
  trending: [
    'fun viral entertainment videos family friendly',
    'amazing wholesome moments clips shorts',
    'incredible talent tricks satisfying videos',
    'new trending viral clips clean fun',
  ],
  family: [
    'kids cartoons family friendly animation songs',
    'wholesome kids adventure crafts fun learning',
    'family game night clean entertainment kids',
    'cute animals cartoons for kids and families',
  ],
  funny: [
    'funny comedy skits clean humor',
    'try not to laugh clean funny animals kids',
    'hilarious stand up comedy clean clips',
    'funny fails wholesome moments shorts',
  ],
  restaurants: [
    'best restaurant food tour street food review',
    'amazing restaurant chef kitchen behind the scenes',
    'top hidden gem restaurants food tasting',
    'street food market restaurant cooking shorts',
  ],
  gadgets: [
    'cool new gadgets tech review unboxing',
    'best everyday tech gadgets inventions',
    'smart home gadgets future tech review',
    'useful pocket gadgets tech shorts',
  ],
  news: [
    'world news headlines today BBC Reuters',
    'science technology breaking news update',
    'positive good news stories around the world',
    'latest global news summary today',
  ],
  howto: [
    'how to tutorial step by step helpful guide',
    'diy home tips life hacks how to fix',
    'how to cook easy beginner tutorial',
    'useful skills how to learn fast guide',
  ],
  podcasts: [
    'best podcast interview clips inspiring',
    'science history storytelling podcast episode',
    'comedy talk podcast highlight clips',
    'tech entrepreneurship podcast full interview',
  ],
  music: [
    'amazing live music acoustic performance',
    'street musician violin piano cover viral',
    'feel good music festival concert highlights',
    'talented singer live studio session',
  ],
  education: [
    'educational science history documentary for all',
    'how things work animated educational video',
    'fascinating space biology physics explained',
    'fun educational facts world geography',
  ],
  sports: [
    'incredible sports highlights best moments',
    'amazing soccer basketball goals trick shots',
    'olympics athletics inspiring sports clips',
    'unbelievable sports plays saves shorts',
  ],
  cars: [
    'supercar review test drive automotive',
    'classic car restoration garage build',
    'electric cars new technology review',
    'amazing motorsport rally racing highlights',
  ],
};

// Strict family-safe filter blocking any sexual, pornographic, or NSFW content
const UNSAFE_CONTENT_RE =
  /\b(porn|porno|pornography|xxx|nsfw|nude|nudity|naked|sex|sexual|sexy|erotic|erotica|hentai|fetish|bdsm|onlyfans|stripper|striptease|lingerie|bikini\s*haul|boobs|breasts|buttocks|twerk|orgasm|escort|hookup|adult\s*film|18\+|rated\s*r|uncensored|playboy|camgirl|webcam\s*model)\b/i;

export function isFamilySafeText(text: string): boolean {
  if (!text) return true;
  return !UNSAFE_CONTENT_RE.test(text);
}

export function isFamilySafeVideo(video: Pick<VideoItem, 'title' | 'author'>): boolean {
  return isFamilySafeText(video.title) && isFamilySafeText(video.author);
}

const ALLOWED_THUMB_HOST_SUFFIXES = [
  '.ytimg.com',
  '.ggpht.com',
  '.googleusercontent.com',
  '.tiktokcdn.com',
  '.tiktokcdn-us.com',
  '.tiktokcdn-eu.com',
  '.tiktokv.com',
  '.muscdn.com',
  '.nasa.gov',
];

const ALLOWED_THUMB_EXACT_HOSTS = new Set([
  'i.ytimg.com',
  'img.youtube.com',
  'yt3.ggpht.com',
  'tilvids.com',
  'images-assets.nasa.gov',
]);

// Pure-TS IP check (compatible with both Cloudflare Workers and Node without node:net)
export function isIpAddress(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return true;
  if (/^[0-9a-fA-F:]+$/.test(clean) && clean.includes(':')) return true;
  if (/^\d+$/.test(clean)) return true; // decimal IPv4
  if (/^0x[0-9a-fA-F]+$/i.test(clean)) return true; // hex IPv4
  return false;
}

export function isAllowedThumbHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (!lower || isIpAddress(lower)) return false;
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) return false;
  if (ALLOWED_THUMB_EXACT_HOSTS.has(lower)) return true;
  return ALLOWED_THUMB_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<VideoItem[]>>();
const tiktokMetaCache = new Map<string, CacheEntry<Partial<VideoItem>>>();
const ytEmbedCache = new Map<string, CacheEntry<boolean>>();
const creatorCache = new Map<string, CacheEntry<{ creator: CreatorProfile; videos: VideoItem[] }>>();

const CACHE_TTL_MS = 60 * 1000;
const TIKTOK_META_TTL_MS = 30 * 60 * 1000;
const YT_EMBED_TTL_MS = 60 * 60 * 1000;

interface TikTokSeed {
  id: string;
  handle: string;
  author: string;
  title: string;
  duration: string;
  views: string;
  category: CategoryId;
  keywords: string[];
}

const TIKTOK_CATALOG: TikTokSeed[] = [
  {
    id: '6768504823336815877',
    handle: 'zachking',
    author: 'Zach King',
    title: 'Hogwarts Broomstick Optical Illusion',
    duration: '0:16',
    views: '2.2B views',
    category: 'education',
    keywords: ['magic', 'illusion', 'broomstick', 'zachking', 'funny', 'trending', 'education', 'family'],
  },
  {
    id: '6718335390845095173',
    handle: 'scout2015',
    author: 'Scout & Suki',
    title: 'Playful Golden Retriever & Puppy Adventures',
    duration: '0:15',
    views: '34M views',
    category: 'funny',
    keywords: ['dog', 'dogs', 'puppy', 'funny', 'cute', 'trending', 'scout2015', 'family'],
  },
];

const FALLBACK_YOUTUBE: VideoItem[] = [
  {
    id: 'dQw4w9WgXcQ',
    source: 'youtube',
    title: 'Never Gonna Give You Up — Classic Remastered Music Video',
    author: 'Rick Astley',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    duration: '3:33',
    views: '1.5B views',
    published: 'Classic',
    isShort: false,
    category: 'music',
  },
  {
    id: 'jNQXAC9IVRw',
    source: 'youtube',
    title: 'Me at the Zoo — Original Classic Moment',
    author: 'jawed',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    duration: '0:19',
    views: '340M views',
    published: 'Classic',
    isShort: false,
    category: 'education',
  },
];

export const DEFAULT_FEED_CREATORS: string[] = [
  'BestEverFoodReviewShow',
  'MrBeast',
  'SamSpedy',
  'NatGeo',
  'BBCNews',
  'tseries',
  'kimpro828',
  'NatGeoAnimals',
  'Nicktoons',
  'MunaUG256',
];

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) return items.slice();
  const out = items.slice();
  let state = (Math.abs(Math.floor(seed)) || 1) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function safeThumbUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const normalized = rawUrl.startsWith('http://')
      ? `https://${rawUrl.slice(7)}`
      : rawUrl;
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') return '';
    if (!isAllowedThumbHost(parsed.hostname)) return '';
    if (
      parsed.hostname.endsWith('ytimg.com') ||
      parsed.hostname.endsWith('ggpht.com') ||
      parsed.hostname.endsWith('googleusercontent.com') ||
      parsed.hostname === 'tilvids.com' ||
      parsed.hostname === 'images-assets.nasa.gov'
    ) {
      return parsed.toString();
    }
    return `/api/thumb?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return '';
  }
}

function formatCompactCount(num: number | undefined): string {
  if (!num || !Number.isFinite(num)) return 'Popular';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B views`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K views`;
  return `${num} views`;
}

function formatSeconds(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return '0:20';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = Math.floor(sec % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

const ALLOWED_META_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
]);

async function resolveSafeFacebookRedirect(initialUrl: string): Promise<string | null> {
  let current = initialUrl;
  for (let hop = 0; hop < 3; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== 'https:' ||
      parsed.port ||
      parsed.username ||
      parsed.password ||
      isIpAddress(host) ||
      !ALLOWED_META_HOSTS.has(host)
    ) {
      return null;
    }
    if (host !== 'fb.watch' && !parsed.pathname.startsWith('/share/')) {
      return parsed.toString();
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const resp = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': BROWSER_UA },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const location = resp.headers.get('location');
      if (!location) break;
      const nextUrl = new URL(location, parsed);
      current = nextUrl.toString();
    } catch {
      return null;
    }
  }
  return current;
}

interface ParsedVideoUrl {
  source: VideoSource;
  id: string;
  handle?: string;
  canonicalUrl?: string;
  isShortHint?: boolean;
}

function parseMetaStaticUrl(u: URL): ParsedVideoUrl | null {
  const host = u.hostname.toLowerCase();
  if (host === 'instagram.com' || host === 'www.instagram.com' || host === 'm.instagram.com') {
    const igMatch = u.pathname.match(/^\/(reel|reels|p)\/([a-zA-Z0-9_-]{5,30})/);
    if (igMatch) {
      const kind = igMatch[1] === 'p' ? 'p' : 'reel';
      const id = igMatch[2];
      return {
        source: 'instagram',
        id,
        canonicalUrl: `https://www.instagram.com/${kind}/${id}/`,
        isShortHint: kind !== 'p',
      };
    }
  }

  if (
    host === 'facebook.com' ||
    host === 'www.facebook.com' ||
    host === 'm.facebook.com' ||
    host === 'web.facebook.com'
  ) {
    const watchParam = u.searchParams.get('v') || '';
    if (u.pathname.startsWith('/watch') && /^\d{5,25}$/.test(watchParam)) {
      return {
        source: 'facebook',
        id: watchParam,
        canonicalUrl: `https://www.facebook.com/watch/?v=${watchParam}`,
        isShortHint: false,
      };
    }
    const reelMatch = u.pathname.match(/^\/reel\/(\d{5,25})/);
    if (reelMatch) {
      return {
        source: 'facebook',
        id: reelMatch[1],
        canonicalUrl: `https://www.facebook.com/reel/${reelMatch[1]}/`,
        isShortHint: true,
      };
    }
    const pageVideoMatch = u.pathname.match(/^\/([a-zA-Z0-9_.]+)\/videos\/(\d{5,25})/);
    if (pageVideoMatch) {
      return {
        source: 'facebook',
        id: pageVideoMatch[2],
        handle: pageVideoMatch[1],
        canonicalUrl: `https://www.facebook.com/${pageVideoMatch[1]}/videos/${pageVideoMatch[2]}/`,
        isShortHint: false,
      };
    }
  }

  return null;
}

export async function parseVideoUrl(input: string): Promise<ParsedVideoUrl | null> {
  const trimmed = input.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\/+/, '').split('/')[0];
      if (YOUTUBE_ID_RE.test(id)) return { source: 'youtube', id };
    }
    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      const vParam = u.searchParams.get('v') || '';
      if (YOUTUBE_ID_RE.test(vParam)) return { source: 'youtube', id: vParam };
      const shortsMatch = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return { source: 'youtube', id: shortsMatch[1] };
      const embedMatch = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return { source: 'youtube', id: embedMatch[1] };
    }
    if (host === 'tiktok.com' || host === 'www.tiktok.com' || host === 'm.tiktok.com') {
      const ttMatch = u.pathname.match(/^\/@([a-zA-Z0-9_.]+)\/video\/(\d{15,22})/);
      if (ttMatch) return { source: 'tiktok', id: ttMatch[2], handle: ttMatch[1] };
      const playerMatch = u.pathname.match(/^\/(?:player\/v1|embed\/v2)\/(\d{15,22})/);
      if (playerMatch) return { source: 'tiktok', id: playerMatch[1] };
    }
    if (host === 'tilvids.com') {
      const tvMatch = u.pathname.match(/\/(?:w|videos\/watch|videos\/embed)\/([0-9a-f-]{36})/i);
      if (tvMatch && UUID_RE.test(tvMatch[1])) return { source: 'tilvids', id: tvMatch[1] };
    }

    const staticMeta = parseMetaStaticUrl(u);
    if (staticMeta) return staticMeta;

    if (
      host === 'fb.watch' ||
      ((host === 'facebook.com' ||
        host === 'www.facebook.com' ||
        host === 'm.facebook.com' ||
        host === 'web.facebook.com') &&
        u.pathname.startsWith('/share/'))
    ) {
      const normalized = u.protocol === 'http:' ? `https://${u.host}${u.pathname}${u.search}` : u.toString();
      const resolvedUrl = await resolveSafeFacebookRedirect(normalized);
      if (resolvedUrl) {
        const resolvedParsed = parseMetaStaticUrl(new URL(resolvedUrl));
        if (resolvedParsed) return resolvedParsed;
      }
      if (host === 'fb.watch') {
        const slug = u.pathname.replace(/^\/+/, '').split('/')[0];
        if (/^[a-zA-Z0-9_-]{4,30}$/.test(slug)) {
          return {
            source: 'facebook',
            id: slug,
            canonicalUrl: `https://fb.watch/${slug}/`,
            isShortHint: false,
          };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchTikTokDetails(
  id: string,
  handle?: string
): Promise<Partial<VideoItem> | null> {
  if (!TIKTOK_ID_RE.test(id)) return null;
  const cached = tiktokMetaCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const safeHandle = handle && /^[a-zA-Z0-9_.]+$/.test(handle) ? handle : 'tiktok';
  const targetUrl = `https://www.tiktok.com/@${safeHandle}/video/${id}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) return null;
    const html = await resp.text();
    const match = html.match(/id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    const vd = data?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
    const item = vd?.itemInfo?.itemStruct;
    if (vd?.statusCode !== 0 || !item || item.privateItem || !item?.video?.playAddr) {
      return null;
    }

    const title = typeof item.desc === 'string' && item.desc.trim() ? item.desc.trim() : undefined;
    const author =
      typeof item?.author?.nickname === 'string' && item.author.nickname.trim()
        ? item.author.nickname.trim()
        : undefined;
    if ((title && !isFamilySafeText(title)) || (author && !isFamilySafeText(author))) {
      return null;
    }

    const rawCover = item?.video?.cover || item?.video?.originCover || '';
    const detail: Partial<VideoItem> = {
      title,
      author,
      thumbnail: safeThumbUrl(rawCover),
      duration: formatSeconds(item?.video?.duration),
      views: formatCompactCount(item?.stats?.playCount),
      isShort: true,
    };

    tiktokMetaCache.set(id, { value: detail, expiresAt: Date.now() + TIKTOK_META_TTL_MS });
    return detail;
  } catch {
    return null;
  }
}

async function resolveDirectVideo(
  parsed: ParsedVideoUrl,
  category: CategoryId
): Promise<VideoItem | null> {
  if (parsed.source === 'youtube') {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${parsed.id}`
      )}&format=json`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        const data = (await resp.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
          width?: number;
          height?: number;
        };
        const title = data.title || 'YouTube Video';
        const author = data.author_name || 'YouTube Creator';
        if (!isFamilySafeText(title) || !isFamilySafeText(author)) {
          return null;
        }
        const isShort = Boolean(data.height && data.width && data.height > data.width);
        return {
          id: parsed.id,
          source: 'youtube',
          title,
          author,
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
          duration: isShort ? 'Short' : 'Watch',
          views: 'Direct Link',
          published: 'YouTube',
          isShort,
          category,
        };
      }
    } catch {
      // fallback
    }
    return {
      id: parsed.id,
      source: 'youtube',
      title: 'YouTube Video',
      author: 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
      duration: 'Watch',
      views: 'Direct Link',
      published: 'YouTube',
      isShort: false,
      category,
    };
  }

  if (parsed.source === 'tiktok') {
    const detail = await fetchTikTokDetails(parsed.id, parsed.handle);
    if (!detail) return null;
    return {
      id: parsed.id,
      source: 'tiktok',
      title: detail.title || `TikTok Clip #${parsed.id.slice(-6)}`,
      author: detail.author || (parsed.handle ? `@${parsed.handle}` : 'TikTok Creator'),
      authorHandle: parsed.handle,
      thumbnail: detail.thumbnail || '',
      duration: detail.duration || '0:20',
      views: detail.views || 'TikTok',
      published: 'TikTok',
      isShort: true,
      category,
    };
  }

  if (parsed.source === 'instagram') {
    const label = parsed.isShortHint ? 'Instagram Reel' : 'Instagram Post';
    const author = parsed.handle ? `@${parsed.handle}` : 'Instagram Creator';
    if (!isFamilySafeText(author)) return null;
    return {
      id: parsed.id,
      source: 'instagram',
      title: `${label} · ${parsed.id}`,
      author,
      authorHandle: parsed.handle,
      thumbnail: '',
      duration: parsed.isShortHint ? 'Reel' : 'Post',
      views: 'Direct Link',
      published: 'Instagram',
      isShort: Boolean(parsed.isShortHint),
      category,
      canonicalUrl: parsed.canonicalUrl || `https://www.instagram.com/reel/${parsed.id}/`,
      offlineReady: false,
    };
  }

  if (parsed.source === 'facebook') {
    const author = parsed.handle || 'Facebook Watch';
    if (!isFamilySafeText(author)) return null;
    const isReel = Boolean(parsed.isShortHint);
    return {
      id: parsed.id,
      source: 'facebook',
      title: isReel ? `Facebook Reel · ${parsed.id}` : `Facebook Video · ${parsed.id}`,
      author,
      authorHandle: parsed.handle,
      thumbnail: '',
      duration: isReel ? 'Reel' : 'Watch',
      views: 'Direct Link',
      published: 'Facebook',
      isShort: isReel,
      category,
      canonicalUrl:
        parsed.canonicalUrl || `https://www.facebook.com/watch/?v=${parsed.id}`,
      offlineReady: false,
    };
  }

  if (parsed.source === 'tilvids') {
    try {
      const resp = await fetch(`https://tilvids.com/api/v1/videos/${parsed.id}`);
      if (resp.ok) {
        const d = (await resp.json()) as {
          uuid?: string;
          name?: string;
          nsfw?: boolean;
          duration?: number;
          views?: number;
          thumbnailPath?: string;
          account?: { displayName?: string; name?: string };
        };
        if (d.nsfw) return null;
        const title = d.name || 'TILvids Video';
        const author = d.account?.displayName || d.account?.name || 'TILvids';
        if (!isFamilySafeText(title) || !isFamilySafeText(author)) return null;
        return {
          id: d.uuid || parsed.id,
          source: 'tilvids',
          title,
          author,
          thumbnail: d.thumbnailPath ? `https://tilvids.com${d.thumbnailPath}` : '',
          duration: formatSeconds(d.duration),
          views: formatCompactCount(d.views),
          published: 'TILvids',
          isShort: false,
          category,
          offlineReady: true,
        };
      }
    } catch {
      // fallback
    }
  }

  return null;
}

function extractText(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const rec = obj as Record<string, unknown>;
  if (typeof rec.simpleText === 'string') return rec.simpleText;
  if (typeof rec.content === 'string') return rec.content;
  if (Array.isArray(rec.runs)) {
    return rec.runs
      .map((r) =>
        r && typeof r === 'object' && typeof (r as Record<string, unknown>).text === 'string'
          ? (r as Record<string, unknown>).text
          : ''
      )
      .join('');
  }
  return '';
}

function extractHandleFromRuns(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const rec = node as Record<string, unknown>;
  if (!Array.isArray(rec.runs)) return undefined;
  for (const run of rec.runs) {
    if (!run || typeof run !== 'object') continue;
    const nav = (run as Record<string, unknown>).navigationEndpoint as
      | Record<string, unknown>
      | undefined;
    const browse = nav?.browseEndpoint as Record<string, unknown> | undefined;
    const cmdMeta = (nav?.commandMetadata as Record<string, unknown> | undefined)
      ?.webCommandMetadata as Record<string, unknown> | undefined;
    const candidates = [
      typeof browse?.canonicalBaseUrl === 'string' ? browse.canonicalBaseUrl : '',
      typeof cmdMeta?.url === 'string' ? cmdMeta.url : '',
    ];
    for (const base of candidates) {
      const match = base.match(/^\/@([a-zA-Z0-9_.-]{2,50})/);
      if (match && HANDLE_RE.test(match[1])) {
        return match[1];
      }
    }
  }
  return undefined;
}

function collectYouTubeVideos(
  node: unknown,
  category: CategoryId,
  out: VideoItem[],
  seen: Set<string>,
  defaultAuthor?: string,
  defaultHandle?: string,
  maxItems = 32
): void {
  if (!node || typeof node !== 'object' || out.length >= maxItems) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectYouTubeVideos(item, category, out, seen, defaultAuthor, defaultHandle, maxItems);
      if (out.length >= maxItems) return;
    }
    return;
  }

  const rec = node as Record<string, unknown>;

  if (rec.videoRenderer && typeof rec.videoRenderer === 'object') {
    const vr = rec.videoRenderer as Record<string, unknown>;
    const videoId = typeof vr.videoId === 'string' ? vr.videoId : '';
    if (YOUTUBE_ID_RE.test(videoId) && !seen.has(videoId)) {
      const title = extractText(vr.title);
      const author =
        extractText(vr.ownerText) || extractText(vr.longBylineText) || defaultAuthor || 'YouTube';
      const extractedHandle =
        defaultHandle ||
        extractHandleFromRuns(vr.ownerText) ||
        extractHandleFromRuns(vr.longBylineText);
      const duration = extractText(vr.lengthText) || 'Video';
      const views =
        extractText(vr.shortViewCountText) || extractText(vr.viewCountText) || 'Popular';
      const published = extractText(vr.publishedTimeText) || 'YouTube';

      const isLive = duration.toUpperCase() === 'LIVE';
      if (title && !isLive && isFamilySafeVideo({ title, author })) {
        seen.add(videoId);
        out.push({
          id: videoId,
          source: 'youtube',
          title,
          author,
          authorHandle: extractedHandle,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration,
          views,
          published,
          isShort: false,
          category,
        });
      }
    }
  }

  if (rec.lockupViewModel && typeof rec.lockupViewModel === 'object') {
    const lvm = rec.lockupViewModel as Record<string, unknown>;
    const videoId = typeof lvm.contentId === 'string' ? lvm.contentId : '';
    if (YOUTUBE_ID_RE.test(videoId) && !seen.has(videoId)) {
      const meta = lvm.metadata as Record<string, unknown> | undefined;
      const lockupMeta = meta?.lockupMetadataViewModel as Record<string, unknown> | undefined;
      const title = extractText(lockupMeta?.title);
      const contentMeta = (lockupMeta?.metadata as Record<string, unknown> | undefined)
        ?.contentMetadataViewModel as Record<string, unknown> | undefined;
      const rows = Array.isArray(contentMeta?.metadataRows) ? contentMeta.metadataRows : [];
      const firstRowParts = Array.isArray((rows[0] as Record<string, unknown> | undefined)?.metadataParts)
        ? ((rows[0] as Record<string, unknown>).metadataParts as Record<string, unknown>[])
        : [];
      const views = extractText(firstRowParts[0]?.text) || 'Popular';
      const published = extractText(firstRowParts[1]?.text) || 'YouTube';

      const thumbModel = (lvm.contentImage as Record<string, unknown> | undefined)
        ?.thumbnailViewModel as Record<string, unknown> | undefined;
      const overlays = Array.isArray(thumbModel?.overlays) ? thumbModel.overlays : [];
      const badge = (overlays[0] as Record<string, unknown> | undefined)
        ?.thumbnailBottomOverlayViewModel as Record<string, unknown> | undefined;
      const badges = Array.isArray(badge?.badges) ? badge.badges : [];
      const duration =
        extractText((badges[0] as Record<string, unknown> | undefined)?.thumbnailBadgeViewModel) ||
        'Video';

      const author = defaultAuthor || 'YouTube Creator';
      if (title && duration.toUpperCase() !== 'LIVE' && isFamilySafeVideo({ title, author })) {
        seen.add(videoId);
        out.push({
          id: videoId,
          source: 'youtube',
          title,
          author,
          authorHandle: defaultHandle,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration,
          views,
          published,
          isShort: false,
          category,
        });
      }
    }
  }

  if (rec.shortsLockupViewModel && typeof rec.shortsLockupViewModel === 'object') {
    const sl = rec.shortsLockupViewModel as Record<string, unknown>;
    const onTap = sl.onTap as Record<string, unknown> | undefined;
    const innertubeCommand = onTap?.innertubeCommand as Record<string, unknown> | undefined;
    const reelWatchEndpoint = innertubeCommand?.reelWatchEndpoint as
      | Record<string, unknown>
      | undefined;
    const videoId =
      typeof reelWatchEndpoint?.videoId === 'string' ? reelWatchEndpoint.videoId : '';

    if (YOUTUBE_ID_RE.test(videoId) && !seen.has(videoId)) {
      const overlayMeta = sl.overlayMetadata as Record<string, unknown> | undefined;
      const primaryText = extractText(overlayMeta?.primaryText);
      const secondaryText = extractText(overlayMeta?.secondaryText);
      const author = defaultAuthor || 'YouTube Shorts';
      if (primaryText && isFamilySafeVideo({ title: primaryText, author })) {
        seen.add(videoId);
        out.push({
          id: videoId,
          source: 'youtube',
          title: primaryText,
          author,
          authorHandle: defaultHandle,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: 'Short',
          views: secondaryText || 'Short',
          published: 'Shorts',
          isShort: true,
          category,
        });
      }
    }
  }

  for (const key of Object.keys(rec)) {
    if (
      key === 'videoRenderer' ||
      key === 'shortsLockupViewModel' ||
      key === 'lockupViewModel'
    ) {
      continue;
    }
    collectYouTubeVideos(rec[key], category, out, seen, defaultAuthor, defaultHandle, maxItems);
    if (out.length >= maxItems) return;
  }
}

async function isYouTubeEmbeddable(videoId: string): Promise<boolean> {
  const cached = ytEmbedCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: {
        'User-Agent': BROWSER_UA,
        Referer: 'https://www.google.com/',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      ytEmbedCache.set(videoId, { value: false, expiresAt: Date.now() + YT_EMBED_TTL_MS });
      return false;
    }
    const html = await resp.text();
    const match = html.match(/"embedded_player_response":"((?:\\.|[^"\\])*)"/);
    if (match) {
      const parsed = JSON.parse(JSON.parse(`"${match[1]}"`)) as {
        previewPlayabilityStatus?: { status?: string; playableInEmbed?: boolean };
      };
      const status = parsed.previewPlayabilityStatus;
      const ok = Boolean(
        status && status.status === 'OK' && status.playableInEmbed !== false
      );
      ytEmbedCache.set(videoId, { value: ok, expiresAt: Date.now() + YT_EMBED_TTL_MS });
      return ok;
    }
    const fallbackOk =
      !html.includes('Playback on other websites has been disabled') &&
      !html.includes('Video unavailable');
    ytEmbedCache.set(videoId, { value: fallbackOk, expiresAt: Date.now() + YT_EMBED_TTL_MS });
    return fallbackOk;
  } catch {
    return true;
  }
}

async function filterEmbeddableYouTube(videos: VideoItem[]): Promise<VideoItem[]> {
  const checks = await Promise.all(
    videos.map(async (v) => ((await isYouTubeEmbeddable(v.id)) ? v : null))
  );
  return checks.filter((v): v is VideoItem => v !== null);
}

async function searchYouTube(
  query: string,
  category: CategoryId,
  shortsOnly = false,
  freshRecent = false,
  bypassCache = false,
  seed = 0
): Promise<VideoItem[]> {
  const effective = shortsOnly ? `${query} #shorts` : query;
  const cacheKey = `yt:${category}:${shortsOnly ? 's' : 'a'}:${freshRecent ? 'f' : 'p'}:${effective.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (!bypassCache && cached && cached.expiresAt > Date.now()) {
    return seed > 0 ? shuffleWithSeed(cached.value, seed) : cached.value;
  }

  try {
    const spParam = freshRecent ? '&sp=EgIIAw%253D%253D' : '';
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(effective)}${spParam}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const resp = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) return FALLBACK_YOUTUBE;

    const html = await resp.text();
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!match) return FALLBACK_YOUTUBE;

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

    const results: VideoItem[] = [];
    const seen = new Set<string>();
    collectYouTubeVideos(contents, category, results, seen);

    const filtered = shortsOnly ? results.filter((v) => v.isShort) : results;
    const candidateList = filtered.length > 0 ? filtered : results;
    const finalOut = await filterEmbeddableYouTube(candidateList);

    if (finalOut.length > 0) {
      searchCache.set(cacheKey, { value: finalOut, expiresAt: Date.now() + CACHE_TTL_MS });
      return seed > 0 ? shuffleWithSeed(finalOut, seed) : finalOut;
    }
  } catch {
    // Graceful fallback
  }

  return FALLBACK_YOUTUBE;
}

async function getTikTokVideos(query: string, category: CategoryId): Promise<VideoItem[]> {
  const q = query.trim().toLowerCase();
  let matching = TIKTOK_CATALOG.filter((item) => {
    if (q) {
      return (
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.handle.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q) || q.includes(kw))
      );
    }
    if (category !== 'trending') {
      return item.category === category || item.keywords.includes(category);
    }
    return true;
  });

  if (matching.length === 0 && !q) {
    matching = TIKTOK_CATALOG;
  }

  const enriched = await Promise.all(
    matching.map(async (seed): Promise<VideoItem | null> => {
      const live = await fetchTikTokDetails(seed.id, seed.handle);
      if (!live) return null;
      const item: VideoItem = {
        id: seed.id,
        source: 'tiktok',
        title: live.title || seed.title,
        author: live.author || seed.author,
        authorHandle: seed.handle,
        thumbnail: live.thumbnail || '',
        duration: live.duration || seed.duration,
        views: live.views || seed.views,
        published: 'TikTok',
        isShort: true,
        category: seed.category,
      };
      return isFamilySafeVideo(item) ? item : null;
    })
  );

  return enriched.filter((x): x is VideoItem => x !== null);
}

const TILVIDS_ROTATING_SORTS = ['-publishedAt', '-trending', '-views', '-publishedAt'] as const;

async function searchTilvids(
  query: string,
  category: CategoryId,
  page = 0,
  bypassCache = false,
  seed = 0
): Promise<VideoItem[]> {
  const q = query.trim();
  const sortParam = q
    ? '-publishedAt'
    : TILVIDS_ROTATING_SORTS[(seed + page) % TILVIDS_ROTATING_SORTS.length];
  const rotatedOffsetPage = q ? page : ((seed % 5) + page) % 6;
  const start = rotatedOffsetPage * 8;
  const cacheKey = `tilvids:${category}:${q.toLowerCase()}:${sortParam}:${start}`;
  const cached = searchCache.get(cacheKey);
  if (!bypassCache && cached && cached.expiresAt > Date.now()) {
    return seed > 0 ? shuffleWithSeed(cached.value, seed + page * 13) : cached.value;
  }

  try {
    const endpoint = q
      ? `https://tilvids.com/api/v1/search/videos?search=${encodeURIComponent(q)}&count=8&start=${start}&sort=${sortParam}&nsfw=false`
      : `https://tilvids.com/api/v1/videos?count=8&start=${start}&sort=${sortParam}&nsfw=false`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      data?: Array<{
        uuid?: string;
        name?: string;
        duration?: number;
        views?: number;
        thumbnailPath?: string;
        nsfw?: boolean;
        account?: { displayName?: string; name?: string };
      }>;
    };

    const items: VideoItem[] = (json.data || [])
      .filter((v) => !v.nsfw && v.uuid && UUID_RE.test(v.uuid) && v.name)
      .map((v) => ({
        id: v.uuid!,
        source: 'tilvids' as const,
        title: v.name!,
        author: v.account?.displayName || v.account?.name || 'TILvids Creator',
        authorHandle: v.account?.name,
        thumbnail: v.thumbnailPath ? `https://tilvids.com${v.thumbnailPath}` : '',
        duration: formatSeconds(v.duration),
        views: formatCompactCount(v.views),
        published: 'TILvids',
        isShort: Boolean(v.duration && v.duration <= 60),
        category,
        offlineReady: true,
      }))
      .filter(isFamilySafeVideo);

    searchCache.set(cacheKey, { value: items, expiresAt: Date.now() + CACHE_TTL_MS });
    return seed > 0 ? shuffleWithSeed(items, seed + page * 13) : items;
  } catch {
    return [];
  }
}

const NASA_ROTATING_TOPICS = [
  'james webb nebula',
  'earth from space',
  'mars perseverance rover',
  'rocket launch liftoff',
  'apollo moon surface',
  'international space station',
  'jupiter saturn rings',
  'aurora borealis space',
];

async function searchNasaVideos(
  query: string,
  _category: CategoryId,
  page = 0,
  seed = 0
): Promise<VideoItem[]> {
  const rotatedTopic = NASA_ROTATING_TOPICS[(seed + page) % NASA_ROTATING_TOPICS.length];
  const q = query.trim() || rotatedTopic;
  const apiPage = query.trim() ? page + 1 : ((Math.floor(seed / 3) + page) % 3) + 1;
  const cacheKey = `nasa:${q.toLowerCase()}:${apiPage}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return seed > 0 ? shuffleWithSeed(cached.value, seed + page * 17) : cached.value;
  }

  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=video&page=${apiPage}&page_size=6`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      collection?: {
        items?: Array<{
          data?: Array<{
            nasa_id?: string;
            title?: string;
            center?: string;
            date_created?: string;
          }>;
          links?: Array<{ href?: string; rel?: string }>;
        }>;
      };
    };

    const rawItems = (data.collection?.items || []).slice(0, 6);
    const items = rawItems
      .map((item): VideoItem | null => {
        const meta = item.data?.[0];
        if (!meta?.nasa_id || !meta.title) return null;
        const thumb = item.links?.find((l) => l.rel === 'preview')?.href || '';
        return {
          id: meta.nasa_id,
          source: 'nasa',
          title: meta.title,
          author: `NASA ${meta.center || 'Media'}`,
          thumbnail: safeThumbUrl(thumb),
          duration: 'Clip',
          views: 'NASA Public',
          published: meta.date_created ? meta.date_created.slice(0, 4) : 'NASA',
          isShort: false,
          category: 'education',
          mediaUrl: `/api/nasa-video/${encodeURIComponent(meta.nasa_id)}`,
          offlineReady: true,
        };
      })
      .filter((x): x is VideoItem => x !== null && isFamilySafeVideo(x));

    searchCache.set(cacheKey, { value: items, expiresAt: Date.now() + CACHE_TTL_MS });
    return seed > 0 ? shuffleWithSeed(items, seed + page * 17) : items;
  } catch {
    return [];
  }
}

async function fetchYouTubeCreator(
  handle: string
): Promise<{ displayName: string; avatar: string; videos: VideoItem[] }> {
  const clean = handle.replace(/^@+/, '');
  const videos: VideoItem[] = [];
  const seen = new Set<string>();
  let displayName = `@${clean}`;
  let avatar = '';

  const [videosHtml, shortsHtml] = await Promise.all([
    fetch(`https://www.youtube.com/@${encodeURIComponent(clean)}/videos`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
    fetch(`https://www.youtube.com/@${encodeURIComponent(clean)}/shorts`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
    })
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
  ]);

  for (const [idx, html] of [videosHtml, shortsHtml].entries()) {
    if (!html) continue;
    const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!match) continue;
    try {
      const data = JSON.parse(match[1]);
      if (idx === 0) {
        const headerTitle =
          data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.title?.dynamicTextViewModel
            ?.text?.content || data?.metadata?.channelMetadataRenderer?.title;
        if (typeof headerTitle === 'string' && headerTitle.trim()) {
          displayName = headerTitle.trim();
        }
        const avatarUrl =
          data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image
            ?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url ||
          data?.metadata?.channelMetadataRenderer?.avatar?.thumbnails?.[0]?.url;
        if (typeof avatarUrl === 'string') {
          avatar = safeThumbUrl(avatarUrl);
        }
      }
      collectYouTubeVideos(
        data?.contents,
        'trending',
        videos,
        seen,
        displayName,
        clean,
        28
      );
    } catch {
      // ignore parse errors
    }
  }

  const playableYoutube = await filterEmbeddableYouTube(videos.filter(isFamilySafeVideo));
  return { displayName, avatar, videos: playableYoutube };
}

async function fetchTilvidsCreator(handle: string): Promise<VideoItem[]> {
  const clean = handle.replace(/^@+/, '').toLowerCase();
  try {
    const resp = await fetch(
      `https://tilvids.com/api/v1/accounts/${encodeURIComponent(clean)}/videos?count=8&nsfw=false`
    );
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      data?: Array<{
        uuid?: string;
        name?: string;
        duration?: number;
        views?: number;
        thumbnailPath?: string;
        nsfw?: boolean;
        account?: { displayName?: string; name?: string };
      }>;
    };
    return (json.data || [])
      .filter((v) => !v.nsfw && v.uuid && UUID_RE.test(v.uuid) && v.name)
      .map((v) => ({
        id: v.uuid!,
        source: 'tilvids' as const,
        title: v.name!,
        author: v.account?.displayName || v.account?.name || clean,
        authorHandle: clean,
        thumbnail: v.thumbnailPath ? `https://tilvids.com${v.thumbnailPath}` : '',
        duration: formatSeconds(v.duration),
        views: formatCompactCount(v.views),
        published: 'TILvids',
        isShort: Boolean(v.duration && v.duration <= 60),
        category: 'trending' as const,
        offlineReady: true,
      }))
      .filter(isFamilySafeVideo);
  } catch {
    return [];
  }
}

async function fetchRotatingCreatorFeedVideos(
  handles: string[],
  seed: number,
  pageNum: number,
  shortsMode: boolean
): Promise<VideoItem[]> {
  const pool = handles.length > 0 ? handles : DEFAULT_FEED_CREATORS;
  const idx1 = Math.abs(seed + pageNum * 3) % pool.length;
  const idx2 =
    pool.length > 1
      ? (idx1 + 1 + (Math.abs(seed + pageNum) % Math.max(1, pool.length - 1))) % pool.length
      : -1;
  const chosen = idx2 >= 0 && idx2 !== idx1 ? [pool[idx1], pool[idx2]] : [pool[idx1]];

  const lists = await Promise.all(
    chosen.map(async (handle, i) => {
      const clean = handle.replace(/^@+/, '');
      const cacheKey = `creator:${clean.toLowerCase()}`;
      const cached = creatorCache.get(cacheKey);
      let videos: VideoItem[] = [];

      if (cached && cached.expiresAt > Date.now()) {
        videos = cached.value.videos;
      } else {
        try {
          const yt = await Promise.race([
            fetchYouTubeCreator(clean),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500)),
          ]);
          if (yt && yt.videos.length > 0) {
            videos = yt.videos;
            creatorCache.set(cacheKey, {
              value: {
                creator: {
                  handle: clean,
                  displayName: yt.displayName,
                  avatar: yt.avatar,
                  platforms: ['youtube'],
                },
                videos: yt.videos,
              },
              expiresAt: Date.now() + CACHE_TTL_MS,
            });
          }
        } catch {
          videos = [];
        }
      }

      const preferred = shortsMode ? videos.filter((v) => v.isShort) : videos;
      const base = preferred.length > 0 ? preferred : videos;
      return shuffleWithSeed(base, seed + (i + 1) * 29).slice(0, 6);
    })
  );

  const interleaved: VideoItem[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) interleaved.push(list[i]);
    }
  }
  return interleaved;
}

export async function fetchVideosBatch(params: {
  rawQ: string;
  source: SourceFilter;
  category: CategoryId;
  shortsMode: boolean;
  pageNum: number;
  fresh: boolean;
  seenSet: Set<string>;
  seed: number;
  creatorHandles: string[];
}): Promise<{ videos: VideoItem[]; hasMore: boolean; resolvedDirectUrl?: boolean }> {
  const { rawQ, source, category, shortsMode, pageNum, fresh, seenSet, seed, creatorHandles } =
    params;

  if (rawQ && !isFamilySafeText(rawQ)) {
    return { videos: [], hasMore: false };
  }

  const directParsed = await parseVideoUrl(rawQ);
  if (directParsed && pageNum === 0) {
    const directVideo = await resolveDirectVideo(directParsed, category);
    if (directVideo && isFamilySafeVideo(directVideo)) {
      return {
        videos: [directVideo],
        hasMore: false,
        resolvedDirectUrl: true,
      };
    }
    return { videos: [], hasMore: false };
  }

  if (source === 'instagram' || source === 'facebook') {
    return { videos: [], hasMore: false };
  }

  const expansions = CATEGORY_EXPANSIONS[category];
  const freshSuffixes = [
    'new',
    'latest',
    'this week',
    'highlights',
    '2026',
    'best',
    'viral',
    'trending',
  ];

  const collected: VideoItem[] = [];
  const localSeen = new Set<string>(seenSet);

  for (let attempt = 0; attempt < 2; attempt++) {
    const effPage = pageNum + attempt;
    const stepSeed = seed + effPage * 19 + attempt * 7;
    const baseQuery = rawQ
      ? effPage === 0 && !fresh && seed % 2 === 0
        ? rawQ
        : `${rawQ} ${freshSuffixes[(stepSeed + (fresh ? 1 : 0)) % freshSuffixes.length]}`
      : expansions[(stepSeed + (fresh ? 1 : 0)) % expansions.length];

    const useFreshFilter = fresh || (effPage + seed) % 2 === 1;
    const includeCreatorClips = source === 'all' && !rawQ;

    const [ytResults, ttRawResults, tvResults, nasaResults, creatorClips] = await Promise.all([
      source === 'all' || source === 'youtube'
        ? searchYouTube(baseQuery, category, shortsMode, useFreshFilter, fresh, stepSeed)
        : Promise.resolve([]),
      (source === 'all' || source === 'tiktok') && effPage === 0
        ? getTikTokVideos(rawQ, category)
        : Promise.resolve([]),
      source === 'all' || source === 'tilvids'
        ? searchTilvids(rawQ, category, effPage, fresh, stepSeed)
        : Promise.resolve([]),
      source === 'all' || source === 'nasa'
        ? searchNasaVideos(rawQ, category, effPage, stepSeed)
        : Promise.resolve([]),
      includeCreatorClips
        ? fetchRotatingCreatorFeedVideos(creatorHandles, stepSeed, effPage, shortsMode)
        : Promise.resolve([]),
    ]);

    const ttResults = stepSeed > 0 ? shuffleWithSeed(ttRawResults, stepSeed + 5) : ttRawResults;

    let combined: VideoItem[] = [];
    if (source === 'youtube') combined = ytResults;
    else if (source === 'tiktok') combined = ttResults;
    else if (source === 'tilvids') combined = tvResults;
    else if (source === 'nasa') combined = nasaResults;
    else {
      const limitedTv = tvResults.slice(0, 2);
      const limitedNasa = nasaResults.slice(0, 2);
      const sparseVaultClips = shuffleWithSeed([...limitedTv, ...limitedNasa], stepSeed + 11);

      if (shortsMode) {
        const primaryShorts = [
          ...creatorClips.filter((v) => v.isShort),
          ...ttResults,
          ...ytResults.filter((v) => v.isShort),
        ];
        const fallbackClips = [
          ...creatorClips.filter((v) => !v.isShort),
          ...ytResults.filter((v) => !v.isShort),
          ...sparseVaultClips,
        ];
        combined = [...primaryShorts, ...fallbackClips];
      } else {
        const leadPools = [creatorClips, ytResults, ttResults].filter((p) => p.length > 0);
        const leadCombined: VideoItem[] = [];
        const maxLen = Math.max(0, ...leadPools.map((p) => p.length));
        for (let i = 0; i < maxLen; i++) {
          for (const pool of leadPools) {
            if (i < pool.length) leadCombined.push(pool[i]);
          }
        }

        let vaultCursor = 0;
        for (let i = 0; i < leadCombined.length; i++) {
          combined.push(leadCombined[i]);
          if ((i + 1) % 6 === 0 && vaultCursor < sparseVaultClips.length) {
            combined.push(sparseVaultClips[vaultCursor++]);
          }
        }
        while (vaultCursor < sparseVaultClips.length) {
          combined.push(sparseVaultClips[vaultCursor++]);
        }
      }
    }

    for (const v of combined) {
      if (!isFamilySafeVideo(v)) continue;
      const key = `${v.source}:${v.id}`;
      if (localSeen.has(key)) continue;
      localSeen.add(key);
      collected.push(v);
    }

    if (collected.length >= 16 || source === 'tiktok') {
      break;
    }
  }

  return {
    videos: collected,
    hasMore: source !== 'tiktok' && collected.length > 0,
  };
}

export async function resolveNasaCompactMp4(
  nasaId: string,
  preferCompact: boolean
): Promise<string | null> {
  if (!NASA_ID_RE.test(nasaId)) return null;
  const resp = await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`);
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    collection?: { items?: Array<{ href?: string }> };
  };
  const items = (data.collection?.items || []).filter((i) => i.href?.endsWith('.mp4'));
  const pick = preferCompact
    ? items.find((i) => i.href?.endsWith('~small.mp4')) ||
      items.find((i) => i.href?.endsWith('~preview.mp4')) ||
      items.find((i) => i.href?.endsWith('~mobile.mp4')) ||
      items.find((i) => i.href?.endsWith('~medium.mp4')) ||
      items[0]
    : items.find((i) => i.href?.endsWith('~medium.mp4')) ||
      items.find((i) => i.href?.endsWith('~small.mp4')) ||
      items[0];
  if (!pick?.href) return null;
  const parsed = new URL(pick.href);
  if (parsed.hostname !== 'images-assets.nasa.gov') return null;
  parsed.protocol = 'https:';
  return parsed.toString();
}

export async function resolveTilvidsCompactMp4(uuid: string): Promise<string | null> {
  if (!UUID_RE.test(uuid)) return null;
  const resp = await fetch(`https://tilvids.com/api/v1/videos/${encodeURIComponent(uuid)}`);
  if (!resp.ok) return null;
  const d = (await resp.json()) as {
    nsfw?: boolean;
    name?: string;
    account?: { displayName?: string; name?: string };
    files?: Array<{ fileUrl?: string; size?: number; resolution?: { id?: number } }>;
    streamingPlaylists?: Array<{
      files?: Array<{ fileUrl?: string; size?: number; resolution?: { id?: number } }>;
    }>;
  };
  if (d.nsfw) return null;
  if (!isFamilySafeText(d.name || '') || !isFamilySafeText(d.account?.displayName || '')) {
    return null;
  }

  const candidates = [
    ...(d.files || []),
    ...(d.streamingPlaylists?.[0]?.files || []),
  ].filter((f) => {
    if (!f.fileUrl) return false;
    const resId = f.resolution?.id ?? 0;
    if (resId === 0) return false;
    if (typeof f.size === 'number' && f.size > MAX_OFFLINE_VIDEO_BYTES) return false;
    return true;
  });

  const sorted = candidates.sort((a, b) => {
    const score = (resId: number) => {
      if (resId === 360) return 0;
      if (resId === 480) return 1;
      if (resId === 240) return 2;
      if (resId === 720) return 3;
      if (resId === 144) return 4;
      return 5;
    };
    return score(a.resolution?.id ?? 999) - score(b.resolution?.id ?? 999);
  });

  const chosen = sorted[0];
  if (!chosen?.fileUrl) return null;
  const parsed = new URL(chosen.fileUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'tilvids.com') return null;
  return parsed.toString();
}

export async function fetchOfflinePack(): Promise<VideoItem[]> {
  const [nasaEarth, nasaRocket, tilvidsLatest] = await Promise.all([
    searchNasaVideos('earth space aurora', 'education', 0),
    searchNasaVideos('rocket launch mars', 'education', 0),
    searchTilvids('', 'trending', 0, false),
  ]);
  const pool: VideoItem[] = [];
  const maxLen = Math.max(nasaEarth.length, nasaRocket.length, tilvidsLatest.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < nasaEarth.length) pool.push(nasaEarth[i]);
    if (i < tilvidsLatest.length) pool.push(tilvidsLatest[i]);
    if (i < nasaRocket.length) pool.push(nasaRocket[i]);
  }
  return pool.slice(0, 12);
}

export async function fetchCreatorProfile(
  rawHandle: string
): Promise<{ creator: CreatorProfile; videos: VideoItem[] } | null> {
  const cleanHandle = rawHandle.trim().replace(/^@+/, '');
  if (!cleanHandle || !HANDLE_RE.test(cleanHandle) || !isFamilySafeText(cleanHandle)) {
    return null;
  }

  const cacheKey = cleanHandle.toLowerCase();
  const cached = creatorCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const [ytCreator, ttVideos, tvVideos] = await Promise.all([
    fetchYouTubeCreator(cleanHandle),
    getTikTokVideos(cleanHandle, 'trending'),
    fetchTilvidsCreator(cleanHandle),
  ]);

  const exactTikTok = ttVideos.filter(
    (v) =>
      v.authorHandle?.toLowerCase() === cacheKey ||
      v.author.toLowerCase().replace(/\s+/g, '') === cacheKey
  );

  const combined: VideoItem[] = [...exactTikTok, ...ytCreator.videos, ...tvVideos];
  const platforms = Array.from(new Set(combined.map((v) => v.source)));
  const payload = {
    creator: {
      handle: cleanHandle,
      displayName:
        ytCreator.displayName !== `@${cleanHandle}` ? ytCreator.displayName : `@${cleanHandle}`,
      avatar: ytCreator.avatar,
      platforms,
    },
    videos: combined,
  };

  if (combined.length > 0) {
    creatorCache.set(cacheKey, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return payload;
}

export function parseVideosRequestInput(
  body: Record<string, unknown>,
  query: Record<string, string | undefined>
) {
  const rawQ = String(body.q ?? query.q ?? '').slice(0, 200).trim();
  const rawSource = String(body.source ?? query.source ?? 'all');
  const rawCategory = String(body.category ?? query.category ?? 'trending');
  const rawMode = String(body.mode ?? query.mode ?? 'all');
  const pageNum = Math.max(
    0,
    Math.min(30, Number.parseInt(String(body.page ?? query.page ?? '0'), 10) || 0)
  );
  const fresh = body.fresh === true || query.fresh === '1';
  const rawSeed = Number.parseInt(String(body.seed ?? query.seed ?? ''), 10);
  const seed =
    Number.isFinite(rawSeed) && rawSeed >= 0
      ? Math.min(1_000_000_000, rawSeed)
      : Math.floor(Math.random() * 10000);

  const rawSeenIds = Array.isArray(body.seenIds) ? body.seenIds : [];
  const seenSet = new Set<string>();
  for (const entry of rawSeenIds.slice(0, 600)) {
    if (typeof entry === 'string' && /^[a-z]+:[a-zA-Z0-9_.\-() ]{1,120}$/.test(entry)) {
      seenSet.add(entry);
    }
  }

  const rawCreators = Array.isArray(body.creatorHandles) ? body.creatorHandles : [];
  const creatorHandles: string[] = [];
  const seenCreators = new Set<string>();
  for (const entry of rawCreators.slice(0, 30)) {
    if (typeof entry !== 'string') continue;
    const clean = entry.trim().replace(/^@+/, '');
    if (
      clean &&
      HANDLE_RE.test(clean) &&
      isFamilySafeText(clean) &&
      !seenCreators.has(clean.toLowerCase())
    ) {
      seenCreators.add(clean.toLowerCase());
      creatorHandles.push(clean);
    }
  }

  const validSources = new Set<SourceFilter>([
    'all',
    'youtube',
    'tiktok',
    'instagram',
    'facebook',
    'tilvids',
    'nasa',
  ]);
  const source: SourceFilter = validSources.has(rawSource as SourceFilter)
    ? (rawSource as SourceFilter)
    : 'all';
  const category: CategoryId = VALID_CATEGORIES.has(rawCategory as CategoryId)
    ? (rawCategory as CategoryId)
    : 'trending';
  const shortsMode = rawMode === 'shorts';

  return {
    rawQ,
    source,
    category,
    shortsMode,
    pageNum,
    fresh,
    seenSet,
    seed,
    creatorHandles: creatorHandles.length > 0 ? creatorHandles : DEFAULT_FEED_CREATORS,
  };
}
