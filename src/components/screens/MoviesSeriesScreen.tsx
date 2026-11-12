import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Film, Loader2, RefreshCw, Search, Tv } from 'lucide-react';
import { AdSenseAd } from '../AdSenseAd';

type CatalogueKind = 'movie' | 'series';
type FeedEntry = {
  id?: { $t?: string };
  title?: { $t?: string };
  published?: { $t?: string };
  updated?: { $t?: string };
  content?: { $t?: string };
  summary?: { $t?: string };
  link?: Array<{ rel?: string; type?: string; href?: string }>;
  media$thumbnail?: { url?: string };
  category?: Array<{ term?: string }>;
};
type CatalogueItem = {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  url: string;
  published: string;
  labels: string[];
  kind: CatalogueKind;
  source: string;
};
type FeedPayload = { feed?: { entry?: FeedEntry[]; 'openSearch$totalResults'?: { $t?: string } } };

const FEEDS = [
  { key: 'naka', url: 'https://naka.marketing2advertising.com', kind: 'movie' as const, label: 'Naka Firimu' },
  { key: 'serie', url: 'https://serie.marketing2advertising.com', kind: 'series' as const, label: 'M2A Series' },
  { key: 'main', url: 'https://www.marketing2advertising.com', kind: 'series' as const, label: 'M2A Blog' },
];
const PAGE_SIZE = 50;
const MAX_PAGES = 4;
let jsonpSequence = 0;

function cleanText(value: string): string {
  if (!value) return '';
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function extractImage(entry: FeedEntry): string {
  if (entry.media$thumbnail?.url) return entry.media$thumbnail.url.replace(/\/s\d+(-c)?\//, '/s800/');
  const html = entry.content?.$t || entry.summary?.$t || '';
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (match?.[1]) return match[1].replace(/&amp;/g, '&');
  return '';
}

function normalizeCataloguePostUrl(rawUrl: string, source: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (source === 'main' && url.hostname === 'www.marketing2advertising.com') {
      url.hostname = 'marketing2advertising.com';
    } else if ((source === 'naka' || source === 'serie') && (url.hostname === 'naka.marketing2advertising.com' || url.hostname === 'serie.marketing2advertising.com')) {
      if (!url.pathname.startsWith('/firimu/')) url.pathname = `/firimu${url.pathname.startsWith('/') ? '' : '/'}${url.pathname}`;
      url.hostname = 'marketing2advertising.com';
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}
function entryUrl(entry: FeedEntry): string {
  // Blogger feeds normally mark post links as rel="alternate" and
  // type="text/html", but custom-domain feeds can omit the type attribute.
  // Accept the alternate href even when Blogger leaves that optional field out.
  const links = entry.link || [];
  return links.find((link) => link.rel === 'alternate' && Boolean(link.href))?.href
    || links.find((link) => link.type === 'text/html' && Boolean(link.href))?.href
    || '';
}

function loadJsonp(url: string, startIndex: number): Promise<FeedPayload> {
  return new Promise((resolve, reject) => {
    const callbackName = `__m2aCatalogueJsonp_${Date.now()}_${++jsonpSequence}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => finish(new Error('The feed took too long to respond.')), 10000);
    const finish = (error?: Error, payload?: FeedPayload) => {
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
      if (error) reject(error);
      else resolve(payload || {});
    };
    (window as unknown as Record<string, unknown>)[callbackName] = (payload: FeedPayload) => finish(undefined, payload);
    const endpoint = new URL('/feeds/posts/default', url);
    endpoint.searchParams.set('alt', 'json-in-script');
    endpoint.searchParams.set('max-results', String(PAGE_SIZE));
    endpoint.searchParams.set('start-index', String(startIndex));
    endpoint.searchParams.set('callback', callbackName);
    script.src = endpoint.toString();
    script.onerror = () => finish(new Error('Could not reach this Blogger feed.'));
    document.head.appendChild(script);
  });
}

function toItems(payload: FeedPayload, feed: typeof FEEDS[number]): CatalogueItem[] {
  return (payload.feed?.entry || []).map((entry, index) => {
    const html = entry.content?.$t || entry.summary?.$t || '';
    const title = cleanText(entry.title?.$t || 'Untitled');
    const labels = (entry.category || []).map((category) => category.term || '').filter(Boolean);
    return {
      id: entry.id?.$t || entryUrl(entry) || `${feed.key}-${index}-${title}`,
      title,
      excerpt: cleanText(html).slice(0, 190),
      image: extractImage(entry),
      url: normalizeCataloguePostUrl(entryUrl(entry), feed.key),
      published: entry.published?.$t || entry.updated?.$t || '',
      labels,
      kind: feed.kind,
      source: feed.label,
    };
  }).filter((item) => item.url);
}

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const MoviesSeriesScreen: React.FC<{ initialKind?: 'all' | CatalogueKind }> = ({ initialKind = 'all' }) => {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | CatalogueKind>(initialKind);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadedPages, setLoadedPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('m2a-catalogue-saved') || '[]');
      if (Array.isArray(stored)) setSaved(stored.filter((value): value is string => typeof value === 'string'));
    } catch { setSaved([]); }
  }, []);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setErrors([]); }
    const results = await Promise.all(FEEDS.map(async (feed) => {
      try {
        const payload = await loadJsonp(feed.url, (page - 1) * PAGE_SIZE + 1);
        return { items: toItems(payload, feed), error: '' };
      } catch (error) {
        return { items: [] as CatalogueItem[], error: `${feed.label}: ${error instanceof Error ? error.message : 'Feed unavailable'}` };
      }
    }));
    const nextItems = results.flatMap((result) => result.items);
    setErrors(results.map((result) => result.error).filter(Boolean));
    setItems((previous) => {
      const combined = append ? [...previous, ...nextItems] : nextItems;
      const unique = new Map<string, CatalogueItem>();
      combined.forEach((item) => unique.set(item.id, item));
      return Array.from(unique.values());
    });
    setLoadedPages(page);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { void fetchPage(1, false); }, [fetchPage]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKind = activeFilter === 'all' || item.kind === activeFilter;
      const searchable = [item.title, item.excerpt, item.source, ...item.labels].join(' ').toLowerCase();
      return matchesKind && (!normalized || searchable.includes(normalized));
    });
  }, [items, query, activeFilter]);

  const toggleSaved = (id: string) => {
    setSaved((previous) => {
      const next = previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id];
      try { localStorage.setItem('m2a-catalogue-saved', JSON.stringify(next)); } catch { /* storage may be disabled */ }
      return next;
    });
  };

  return (
    <section className="min-h-[75vh] bg-[#eee7d5] px-3 pb-28 pt-4 text-[#24231f] sm:px-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 rounded-2xl bg-[#24231f] p-5 text-[#f5edda] shadow-xl sm:p-7">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-[#d9b96c]">
            <Film size={16} /> Marketing2Advertising Entertainment
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{initialKind === 'movie' ? 'Firimu' : 'Movies &amp; Series'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#d4cbb7]">{initialKind === 'movie' ? 'Browse Luganda-translated movies from Naka Marketing2Advertising.' : 'Explore films, TV series and the latest stories from all three Marketing2Advertising Blogger sites.'}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[#e4d7b8]">
            {initialKind === 'movie' ? <span className="rounded-full border border-[#b99b5d]/50 px-3 py-1">Naka Movies · naka.marketing2advertising.com</span> : <><span className="rounded-full border border-[#b99b5d]/50 px-3 py-1">Naka Firimu</span><span className="rounded-full border border-[#b99b5d]/50 px-3 py-1">M2A Series</span><span className="rounded-full border border-[#b99b5d]/50 px-3 py-1">Main M2A Blog</span></>}
          </div>
        </div>

        <div className="sticky top-2 z-20 mb-5 rounded-2xl border border-[#d8cba9] bg-[#f8f3e7]/95 p-3 shadow-lg backdrop-blur">
          <label className="flex items-center gap-2 rounded-xl border border-[#d8cba9] bg-white px-3 py-2.5">
            <Search size={18} className="shrink-0 text-[#8b7545]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies, series, titles or labels..." className="w-full bg-transparent text-sm text-[#24231f] outline-none placeholder:text-[#8b877d]" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {([{ id: 'all', label: 'All' }, { id: 'movie', label: 'Firimu' }, { id: 'series', label: 'Series' }] as const).map((filter) => (
              <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${activeFilter === filter.id ? 'bg-[#b99750] text-[#211f19] shadow' : 'bg-[#e9dfc9] text-[#65583d] hover:bg-[#dfd0b0]'}`}>
                {filter.label}
              </button>
            ))}
            <span className="ml-auto self-center text-xs font-semibold text-[#77705f]">{filteredItems.length} titles</span>
          </div>
        </div>

        {errors.length > 0 && (
          <div role="status" className="mb-4 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">Some content could not be loaded.</p>
            {errors.map((error) => <p key={error} className="mt-1">{error}</p>)}
            <button onClick={() => void fetchPage(1, false)} className="mt-2 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={14} /> Try again</button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-[#76694d]"><Loader2 className="animate-spin" /> Loading movies and series…</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[#d8cba9] bg-[#f8f3e7] p-8 text-center">
            <Film className="mx-auto mb-3 text-[#a68a4d]" size={30} />
            <h2 className="font-bold">No titles found</h2>
            <p className="mt-1 text-sm text-[#77705f]">Try another search or select a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <article className="group overflow-hidden rounded-xl border border-[#d8cba9] bg-[#faf6ec] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <a href={item.url} className="block">
                    <div className="relative aspect-[2/3] overflow-hidden bg-[#d9d0bd]">
                      {item.image ? <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-[#8b8068]">{item.kind === 'movie' ? <Film size={38} /> : <Tv size={38} />}</div>}
                      <span className="absolute left-2 top-2 rounded-full bg-[#24231f]/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#e8cc88]">{item.kind === 'movie' ? 'Firimu' : 'Series'}</span>
                    </div>
                  </a>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 min-h-10 text-sm font-extrabold leading-snug text-[#29271f]">{item.title}</h2>
                      <button onClick={() => toggleSaved(item.id)} aria-label={saved.includes(item.id) ? 'Remove saved title' : 'Save title'} className="shrink-0 rounded-full p-1 text-[#9b7b39] hover:bg-[#eee4ce]">{saved.includes(item.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
                    </div>
                    <p className="mt-1 line-clamp-3 min-h-10 text-[11px] leading-relaxed text-[#716b5d]">{item.excerpt || 'Open this post to read more.'}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="truncate text-[9px] font-semibold text-[#8b7545]">{item.source}</span>
                      <a href={item.url} aria-label={`Open ${item.title}`} className="rounded-full bg-[#282720] p-2 text-[#e7c77f] hover:bg-[#b99750] hover:text-[#24231f]"><ExternalLink size={13} /></a>
                    </div>
                    {formatDate(item.published) && <p className="mt-2 text-[9px] text-[#9a9383]">{formatDate(item.published)}</p>}
                  </div>
                </article>
                {(index + 1) % 12 === 0 && <div className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-5"><AdSenseAd /></div>}
              </React.Fragment>
            ))}
          </div>
        )}

        {!loading && loadedPages < MAX_PAGES && (
          <div className="mt-7 text-center">
            <button disabled={loadingMore} onClick={() => void fetchPage(loadedPages + 1, true)} className="inline-flex items-center gap-2 rounded-full bg-[#282720] px-6 py-3 text-sm font-bold text-[#e7c77f] shadow-lg transition hover:bg-[#b99750] hover:text-[#24231f] disabled:opacity-60">
              {loadingMore ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Load more titles
            </button>
          </div>
        )}
        <p className="mt-8 text-center text-[10px] text-[#8b8068]">Content is loaded from the original M2A Blogger websites. Open a title to visit its source post.</p>
      </div>
    </section>
  );
};
