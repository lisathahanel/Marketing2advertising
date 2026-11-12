import { BlogPost } from '../types';

interface BloggerEntry {
  id?: { $t: string };
  title?: { $t: string };
  published?: { $t: string };
  updated?: { $t: string };
  content?: { $t: string };
  summary?: { $t: string };
  category?: Array<{ term: string }>;
  author?: Array<{ name: { $t: string }; gd$image?: { src?: string } }>;
  link?: Array<{ rel: string; href: string }>;
  media$thumbnail?: { url: string };
}

interface BloggerFeedResponse {
  feed?: {
    openSearch$totalResults?: { $t: string };
    openSearch$startIndex?: { $t: string };
    entry?: BloggerEntry[];
  };
}

const CACHE_KEY_PREFIX = 'm2a_feed_';
export function normalizeBloggerPostUrl(rawUrl: string, site: 'main' | 'naka' = 'main'): string {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (site === 'main' && url.hostname === 'www.marketing2advertising.com') {
      url.hostname = 'marketing2advertising.com';
    } else if (site === 'naka' && url.hostname === 'naka.marketing2advertising.com') {
      if (!url.pathname.startsWith('/firimu/')) url.pathname = `/firimu${url.pathname.startsWith('/') ? '' : '/'}${url.pathname}`;
      url.hostname = 'marketing2advertising.com';
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}
const FEED_HOSTS = {
  main: 'https://www.marketing2advertising.com',
  naka: 'https://naka.marketing2advertising.com',
} as const;

let jsonpSequence = 0;

function requestBloggerJsonp(url: URL): Promise<BloggerFeedResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__m2aBloggerFeed_${Date.now()}_${++jsonpSequence}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeout);
      script.onerror = null;
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };

    const finish = (error?: Error, payload?: BloggerFeedResponse) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(payload || {});
    };

    const timeout = window.setTimeout(
      () => finish(new Error('Blogger feed timed out. Check that the site feed is enabled.')),
      15000,
    );

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: BloggerFeedResponse) => {
      finish(undefined, payload);
    };

    url.searchParams.set('alt', 'json-in-script');
    url.searchParams.set('callback', callbackName);
    url.searchParams.set('_', String(Date.now()));
    script.async = true;
    script.src = url.toString();
    script.onerror = () => finish(new Error('Blogger blocked or could not return the feed.'));
    document.head.appendChild(script);
  });
}

function getFeedUrl(site: 'main' | 'naka', options: {
  maxResults: number;
  startIndex: number;
  label?: string;
  q?: string;
  id?: string;
}): URL {
  const base = FEED_HOSTS[site];
  let path = '/feeds/posts/default';

  if (options.id) {
    path += `/${encodeURIComponent(options.id)}`;
  } else if (options.label) {
    path += `/-/${encodeURIComponent(options.label)}`;
  }

  const url = new URL(path, base);
  if (!options.id) {
    url.searchParams.set('max-results', String(options.maxResults));
    url.searchParams.set('start-index', String(options.startIndex));
    if (options.q) url.searchParams.set('q', options.q);
  }
  return url;
}

export async function fetchBloggerPosts(options: {
  site?: 'main' | 'naka';
  maxResults?: number;
  startIndex?: number;
  label?: string;
  q?: string;
  id?: string;
}): Promise<{ posts: BlogPost[]; totalResults: number }> {
  const {
    site = 'main',
    maxResults = 12,
    startIndex = 1,
    label,
    q,
    id,
  } = options;

  const cacheParams = new URLSearchParams({
    site,
    maxResults: String(maxResults),
    startIndex: String(startIndex),
    ...(label ? { label } : {}),
    ...(q ? { q } : {}),
    ...(id ? { id } : {}),
  });
  const cacheKey = `${CACHE_KEY_PREFIX}${cacheParams.toString()}`;

  try {
    // GitHub Pages is a static host and has no /api/blogger/feed server route.
    // Blogger's JSON-in-script feed provides JSONP, avoiding browser CORS restrictions.
    const data = await requestBloggerJsonp(getFeedUrl(site, {
      maxResults,
      startIndex,
      label,
      q,
      id,
    }));
    const entries = data.feed?.entry || [];
    const parsedTotal = Number.parseInt(data.feed?.openSearch$totalResults?.$t || '0', 10);
    const totalResults = Number.isFinite(parsedTotal) ? parsedTotal : 0;

    const posts: BlogPost[] = entries.map((entry, index) => {
      const rawContent = entry.content?.$t || entry.summary?.$t || '';
      const postIdMatch = entry.id?.$t?.match(/post-(\d+)/);
      const postId = postIdMatch?.[1] || entry.id?.$t || `m2a-${startIndex}-${index}`;

      let thumbnail = entry.media$thumbnail?.url || '';
      if (!thumbnail) {
        const imageMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imageMatch) thumbnail = imageMatch[1].replace(/&amp;/g, '&');
      }
      if (thumbnail.includes('/s72-c/')) {
        thumbnail = thumbnail.replace('/s72-c/', '/w800-h450-c/');
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawContent;
      const cleanSummary = (tempDiv.textContent || tempDiv.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);

      const altLink = (entry.link || []).find((link) => link.rel === 'alternate')?.href || '';
      const categories = (entry.category || []).map((category) => category.term);

      return {
        id: postId,
        title: entry.title?.$t || 'Untitled Post',
        published: entry.published?.$t || new Date().toISOString(),
        updated: entry.updated?.$t,
        content: rawContent,
        summary: cleanSummary ? `${cleanSummary}...` : '',
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        author: {
          name: entry.author?.[0]?.name?.$t || 'M2A Team',
          avatar: entry.author?.[0]?.gd$image?.src,
        },
        categories,
        url: normalizeBloggerPostUrl(altLink, site),
      };
    }).filter((post) => Boolean(post.url));

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ posts, totalResults, time: Date.now() }));
    } catch {
      // Offline caching is optional; private browsing may disable storage.
    }

    return { posts, totalResults };
  } catch (error) {
    console.warn('Blogger JSONP feed error; checking offline cache:', error);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { posts: (parsed.posts || []).map((post: BlogPost) => ({ ...post, url: normalizeBloggerPostUrl(post.url, site) })), totalResults: parsed.totalResults || 0 };
      }
    } catch {
      // Ignore unavailable or malformed offline cache.
    }
    throw error;
  }
}
