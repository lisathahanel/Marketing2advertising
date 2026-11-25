import {MOVIE_FEED_LABEL, SERIES_FEED_LABEL, VJ_LIST} from './constants.ts';

export type MediaSourceType = 'video' | 'youtube' | 'iframe';

export interface MoviePart {
  index: number;
  partNumber: number;
  title: string;
  label: string;
  heading?: string;
  url: string;
  sourceType: MediaSourceType;
  posterUrl?: string;
}

export interface MovieItem {
  id: string;
  title: string;
  displayTitle: string;
  pathname: string;
  year: string;
  month: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  posterUrl: string;
  backdropUrl: string;
  vjName: string;
  genres: string[];
  labels: string[];
  contentType: 'movie' | 'series';
  isLiveTv: boolean;
  synopsis: string[];
  parts: MoviePart[];
}

export interface StaticPageBlock {
  type: 'heading' | 'paragraph' | 'list';
  text?: string;
  items?: string[];
}

export interface StaticPageItem {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
  blocks: StaticPageBlock[];
}

export interface BloggerRawEntry {
  id?: {$t?: string};
  published?: {$t?: string};
  updated?: {$t?: string};
  title?: {$t?: string};
  content?: {$t?: string};
  summary?: {$t?: string};
  category?: Array<{term?: string}>;
  link?: Array<{rel?: string; href?: string; type?: string}>;
  media$thumbnail?: {url?: string};
}

export interface BloggerRawFeed {
  feed?: {
    openSearch$totalResults?: {$t?: string};
    openSearch$startIndex?: {$t?: string};
    openSearch$itemsPerPage?: {$t?: string};
    entry?: BloggerRawEntry[];
  };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
};

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    });
}

export function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSafeHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function upgradeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = decodeHtmlEntities(rawUrl.trim());
  if (url.startsWith('//')) {
    url = `https:${url}`;
  } else if (url.startsWith('http://')) {
    url = `https://${url.slice(7)}`;
  }
  if (!isSafeHttpUrl(url)) return '';

  // Upgrade only small Blogger thumbnail presets (s72-c, s320, w72-h72, etc.) without downgrading s1200/s1600/s0
  if (/(?:blogspot\.com|googleusercontent\.com|bp\.blogspot\.com)/i.test(url)) {
    url = url
      .replace(/\/s([1-9]\d{1,2})(?:-[a-zA-Z0-9_-]+)?\//g, (m, sizeStr: string) => {
        const size = Number.parseInt(sizeStr, 10);
        return size > 0 && size < 800 ? '/s1200/' : m;
      })
      .replace(/\/w\d+-h\d+(?:-[a-zA-Z0-9_-]+)?\//g, '/s1200/')
      .replace(/=s([1-9]\d{1,2})(?:-[a-zA-Z0-9_-]+)?$/g, (m, sizeStr: string) => {
        const size = Number.parseInt(sizeStr, 10);
        return size > 0 && size < 800 ? '=s1200' : m;
      })
      .replace(/=w\d+-h\d+(?:-[a-zA-Z0-9_-]+)?$/g, '=s1200');
  }
  return url;
}

export function normalizeVjName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const matchedKnown = VJ_LIST.find(
    (vj) => vj.toLowerCase() === cleaned.toLowerCase(),
  );
  if (matchedKnown) return matchedKnown;

  return cleaned
    .split(' ')
    .map((word, idx) => {
      if (idx === 0 && word.toLowerCase() === 'vj') return 'Vj';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function cleanDisplayTitle(rawTitle: string): string {
  let title = decodeHtmlEntities(rawTitle || '').trim();
  title = title
    .replace(/\[(?:luganda(?:\s+translated)?|full\s+movie|hd|firimu)\]/gi, ' ')
    .replace(/\((?:luganda(?:\s+translated)?|full\s+movie|firimu)\)/gi, ' ')
    .replace(/\b(?:luganda\s+translated|translated\s+in\s+luganda)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—|:\s]+|[-–—|:\s]+$/g, '')
    .trim();
  return title || decodeHtmlEntities(rawTitle || 'Untitled');
}

export function extractYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = u.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/')[2] ?? '';
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/')[2] ?? '';
      } else {
        videoId = u.searchParams.get('v') ?? '';
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
  } catch {
    return null;
  }
  return null;
}

export function classifyMediaUrl(rawContent: string): {
  url: string;
  sourceType: MediaSourceType;
} | null {
  const decoded = decodeHtmlEntities(rawContent).trim();
  if (!decoded) return null;

  let candidate = decoded;

  const srcMatch = decoded.match(/src\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    candidate = srcMatch[1].trim();
  } else {
    const textOnly = decoded.replace(/<[^>]+>/g, ' ').trim();
    const urlMatch = textOnly.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch?.[0]) {
      candidate = urlMatch[0].trim();
    }
  }

  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  }
  if (!isSafeHttpUrl(candidate)) return null;

  const ytEmbed = extractYouTubeEmbedUrl(candidate);
  if (ytEmbed) {
    return {url: ytEmbed, sourceType: 'youtube'};
  }

  try {
    const parsed = new URL(candidate);
    const pathLower = parsed.pathname.toLowerCase();
    if (/\.(mp4|webm|ogg|mkv|mov|m4v)$/.test(pathLower)) {
      return {url: candidate, sourceType: 'video'};
    }
  } catch {
    return null;
  }

  return {url: candidate, sourceType: 'iframe'};
}

function stripBoilerplateFromHeading(rawHeading: string): string {
  return rawHeading
    .replace(/kali\s*mu\s*:?\s*vj\s+[a-z0-9]+/gi, ' ')
    .replace(/vj\s+[a-z0-9]+/gi, ' ')
    .replace(/[^\p{L}\p{N}\s:&'\u2019\-–—.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
    .trim();
}

function derivePartLabel(
  index: number,
  totalParts: number,
  contentType: 'movie' | 'series',
  headingText: string,
  url: string,
  movieTitle: string,
): string {
  const cleanHeading = stripBoilerplateFromHeading(headingText);
  const normalizedMovie = movieTitle.toLowerCase();

  // 1. Explicit Part / Episode / Season / Disc wording inside heading
  if (
    cleanHeading &&
    cleanHeading.toLowerCase() !== normalizedMovie &&
    cleanHeading.length <= 64
  ) {
    if (
      /\b(part|pt|episode|ep|season|s\d+|disc|cd|chapter|trailer|live)\b/i.test(
        cleanHeading,
      )
    ) {
      return cleanHeading;
    }
  }

  // 2. Inspect URL filename for S01E02 / Episode / Part indicators
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const filename = pathname.split('/').pop() ?? '';

    const sxeMatch = filename.match(/s(\d{1,2})[\s._-]*e(\d{1,3})/i);
    if (sxeMatch) {
      const s = sxeMatch[1].padStart(2, '0');
      const e = sxeMatch[2].padStart(2, '0');
      return `S${s} E${e}`;
    }

    const epMatch = filename.match(/(?:episode|ep)[\s._-]*(\d{1,3})/i);
    if (epMatch) {
      return `Episode ${epMatch[1].padStart(2, '0')}`;
    }

    const partMatch = filename.match(/(?:part|pt)[\s._-]*(\d{1,2})/i);
    if (partMatch) {
      return `Part ${partMatch[1]}`;
    }
  } catch {
    // Ignore URL parsing errors
  }

  // 3. Standard sequential numbering when multiple parts exist
  if (totalParts === 1) {
    return contentType === 'series' ? 'Episode 01' : 'Full Movie';
  }

  return contentType === 'series'
    ? `Episode ${String(index + 1).padStart(2, '0')}`
    : `Part ${index + 1}`;
}

export function extractPartsAndImages(
  rawHtml: string,
  fallbackPoster: string,
  contentType: 'movie' | 'series',
  displayTitle: string,
): {parts: MoviePart[]; allImages: string[]; imageAlts: string[]} {
  // Normalize HTML-encoded brackets around ddr45 delimiters before scanning
  const html = (rawHtml || '')
    .replace(/&#91;(\/?ddr45\/?)&#93;/gi, '[$1]')
    .replace(/&lsqb;(\/?ddr45\/?)&rsqb;/gi, '[$1]');
  const allImages: string[] = [];
  const imageAlts: string[] = [];

  const ddrBlockPattern = '\\[\\/?ddr45\\/?\\][\\s\\S]*?\\[\\/ddr45\\/?\\]';

  interface RawFoundPart {
    url: string;
    sourceType: MediaSourceType;
    rawHeading: string;
    poster: string;
  }

  const foundParts: RawFoundPart[] = [];
  const seenUrls = new Set<string>();
  let latestImg = fallbackPoster;

  // Step 1: Split post content by <h2>–<h4> heading boundaries
  const headingSplitRegex = /(<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>)/gi;
  const segments = html.split(headingSplitRegex);

  const sections: Array<{heading: string; body: string}> = [];
  let activeHeading = '';
  for (const segment of segments) {
    if (!segment) continue;
    if (/^<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>$/i.test(segment)) {
      activeHeading = stripHtmlTags(segment);
    } else {
      sections.push({heading: activeHeading, body: segment});
      activeHeading = '';
    }
  }
  if (sections.length === 0) {
    sections.push({heading: '', body: html});
  }

  // Step 2: Within each heading section, scan <img>, sub-headings, and [/ddr45/] delimiters in order
  const innerTokenRegex = new RegExp(
    `(<h(?:1|5|6)[^>]*>[\\s\\S]*?<\\/h(?:1|5|6)>)|(<(?:strong|b)\\b[^>]*>[\\s\\S]*?<\\/(?:strong|b)>)|(<img\\b[^>]*?>)|(${ddrBlockPattern})`,
    'gi',
  );

  for (const section of sections) {
    let sectionHeading = section.heading;
    let headingConsumedInSection = false;

    const pushDdrBlock = (ddrBlock: string, titleHint = '') => {
      const inner = ddrBlock
        .replace(/^\[\/?ddr45\/?\]/i, '')
        .replace(/\[\/ddr45\/?\]$/i, '')
        .trim();

      if (!inner) return;

      const isTag = /<\s*(?:iframe|video|source)\b/i.test(inner);
      const candidates = isTag
        ? [inner]
        : inner.match(/https?:\/\/[^\s"'<>]+/gi) ?? [inner];

      for (const candidate of candidates) {
        const classified = classifyMediaUrl(candidate);
        if (classified && !seenUrls.has(classified.url)) {
          seenUrls.add(classified.url);
          const partHeading = !headingConsumedInSection
            ? sectionHeading || titleHint
            : titleHint;
          foundParts.push({
            url: classified.url,
            sourceType: classified.sourceType,
            rawHeading: partHeading,
            poster: latestImg || fallbackPoster,
          });
          headingConsumedInSection = true;
        }
      }
    };

    let match: RegExpExecArray | null;
    innerTokenRegex.lastIndex = 0;
    while ((match = innerTokenRegex.exec(section.body)) !== null) {
      const [, subHeadingBlock, strongBlock, imgBlock, ddrBlock] = match;

      if (subHeadingBlock) {
        const text = stripHtmlTags(subHeadingBlock);
        if (text) {
          sectionHeading = text;
          headingConsumedInSection = false;
        }
      } else if (strongBlock) {
        const text = stripHtmlTags(strongBlock);
        if (
          text &&
          text.length <= 64 &&
          /\b(part|pt|episode|ep|season|s\d+)\b/i.test(text)
        ) {
          sectionHeading = text;
          headingConsumedInSection = false;
        }
      } else if (imgBlock) {
        const srcMatch =
          imgBlock.match(/\bsrc\s*=\s*"([^"]+)"/i) ||
          imgBlock.match(/\bsrc\s*=\s*'([^']+)'/i) ||
          imgBlock.match(/\bdata-src\s*=\s*"([^"]+)"/i) ||
          imgBlock.match(/\bdata-src\s*=\s*'([^']+)'/i);
        if (srcMatch?.[1]) {
          const upgraded = upgradeImageUrl(srcMatch[1]);
          if (upgraded) {
            latestImg = upgraded;
            if (!allImages.includes(upgraded)) {
              allImages.push(upgraded);
            }
          }
        }

        const altMatch =
          imgBlock.match(/\balt\s*=\s*"([^"]+)"/i) ||
          imgBlock.match(/\balt\s*=\s*'([^']+)'/i);
        if (altMatch?.[1]) {
          const cleanedAlt = decodeHtmlEntities(altMatch[1])
            .replace(/\[\/?ddr45\/?\][\s\S]*?\[\/ddr45\/?\]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanedAlt.length >= 24 && !imageAlts.includes(cleanedAlt)) {
            imageAlts.push(cleanedAlt);
          }
        }

        const titleMatch =
          imgBlock.match(/\btitle\s*=\s*"([^"]+)"/i) ||
          imgBlock.match(/\btitle\s*=\s*'([^']+)'/i);
        const titleHint = titleMatch?.[1]
          ? decodeHtmlEntities(titleMatch[1])
              .replace(/\[\/?ddr45\/?\][\s\S]*?\[\/ddr45\/?\]/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

        const embeddedDdrRegex = new RegExp(ddrBlockPattern, 'gi');
        let embeddedMatch: RegExpExecArray | null;
        while ((embeddedMatch = embeddedDdrRegex.exec(imgBlock)) !== null) {
          pushDdrBlock(embeddedMatch[0], titleHint);
        }
      } else if (ddrBlock) {
        pushDdrBlock(ddrBlock);
      }
    }
  }

  // Fallback: if no [/ddr45/] tags were present, scan sections for <video>/<source> or non-ad <iframe>
  if (foundParts.length === 0) {
    latestImg = fallbackPoster;
    const fallbackTokenRegex =
      /(<img\b[^>]*?>)|(<iframe\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>)|(<source\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>)/gi;

    for (const section of sections) {
      let headingConsumed = false;
      let fbMatch: RegExpExecArray | null;
      fallbackTokenRegex.lastIndex = 0;
      while ((fbMatch = fallbackTokenRegex.exec(section.body)) !== null) {
        if (fbMatch[1]) {
          const srcMatch =
            fbMatch[1].match(/\bsrc\s*=\s*"([^"]+)"/i) ||
            fbMatch[1].match(/\bsrc\s*=\s*'([^']+)'/i);
          if (srcMatch?.[1]) {
            const upgraded = upgradeImageUrl(srcMatch[1]);
            if (upgraded) {
              latestImg = upgraded;
              if (!allImages.includes(upgraded)) allImages.push(upgraded);
            }
          }
        } else {
          const srcUrl = fbMatch[3] || fbMatch[5] || '';
          if (
            srcUrl &&
            !/(?:googlesyndication|doubleclick|facebook\.com\/plugins|blogger\.com\/comment)/i.test(
              srcUrl,
            )
          ) {
            const classified = classifyMediaUrl(srcUrl);
            if (classified && !seenUrls.has(classified.url)) {
              seenUrls.add(classified.url);
              foundParts.push({
                url: classified.url,
                sourceType: classified.sourceType,
                rawHeading: !headingConsumed ? section.heading : '',
                poster: latestImg || fallbackPoster,
              });
              headingConsumed = true;
            }
          }
        }
      }
    }
  }

  const total = foundParts.length;
  const parts: MoviePart[] = foundParts.map((p, idx) => {
    const partNumber = idx + 1;
    const cleanHeading = stripBoilerplateFromHeading(p.rawHeading);
    const label = derivePartLabel(
      idx,
      total,
      contentType,
      p.rawHeading,
      p.url,
      displayTitle,
    );
    const partTitle = cleanHeading || label;
    return {
      index: partNumber,
      partNumber,
      title: partTitle,
      label,
      heading: p.rawHeading || undefined,
      url: p.url,
      sourceType: p.sourceType,
      posterUrl: p.poster || fallbackPoster,
    };
  });

  return {parts, allImages, imageAlts};
}

export function extractSynopsis(
  rawHtml: string,
  displayTitle: string,
  imageAlts: string[] = [],
): string[] {
  if (!rawHtml && imageAlts.length === 0) return [];
  const cleaned = (rawHtml || '')
    .replace(/\[\/?ddr45\/?\][\s\S]*?\[\/ddr45\/\]/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<video[\s\S]*?<\/video>/gi, ' ')
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '\n')
    .replace(/<\/(?:p|div|li|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const lines = cleaned
    .split(/\n+/)
    .map((line) => stripHtmlTags(line))
    .map((line) =>
      line
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/\bwww\.marketing2advertising\.com\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => {
      if (line.length < 18) return false;
      const lower = line.toLowerCase();
      if (lower === displayTitle.toLowerCase()) return false;
      if (/^(?:part|episode|ep)\s*\d+$/i.test(lower)) return false;
      if (/^(?:watch|download|click here|share this)/i.test(lower)) return false;
      return true;
    });

  const unique: string[] = [];
  for (const line of lines) {
    if (!unique.includes(line)) unique.push(line);
  }

  // If post body only stored the synopsis inside <img alt="..."> (common in Blogger templates), include it
  if (unique.length === 0 && imageAlts.length > 0) {
    for (const alt of imageAlts) {
      const sanitized = alt
        .replace(/https?:\/\/[^\s]+/gi, '')
        .replace(/\bwww\.marketing2advertising\.com\b/gi, '')
        .trim();
      if (sanitized.length >= 18 && !unique.includes(sanitized)) {
        unique.push(sanitized);
      }
    }
  }

  return unique.slice(0, 8);
}

export function parseBloggerEntry(
  entry: BloggerRawEntry,
  forcedContentType?: 'movie' | 'series',
): MovieItem | null {
  const id = entry.id?.$t ?? '';
  const rawTitle = entry.title?.$t ?? '';
  if (!rawTitle) return null;

  const altLink = entry.link?.find((l) => l.rel === 'alternate')?.href ?? '';
  let pathname = '';
  if (altLink) {
    try {
      pathname = new URL(altLink).pathname;
    } catch {
      pathname = '';
    }
  }
  if (!pathname || !pathname.startsWith('/')) {
    return null;
  }

  const pathMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/([^/]+)$/);
  const year = pathMatch?.[1] ?? '2026';
  const month = pathMatch?.[2] ?? '01';
  const slug = pathMatch?.[3] ?? pathname.replace(/^\//, '');

  const rawContent = entry.content?.$t ?? entry.summary?.$t ?? '';
  const labels = (entry.category ?? [])
    .map((c) => (c.term ?? '').trim())
    .filter(Boolean);

  const lowerLabels = labels.map((l) => l.toLowerCase());
  const isSeriesExplicit =
    lowerLabels.includes(SERIES_FEED_LABEL) || lowerLabels.includes('series');
  const isMovieExplicit =
    lowerLabels.includes(MOVIE_FEED_LABEL) || lowerLabels.includes('firimu');
  const isLiveTv =
    lowerLabels.includes('live tv') || lowerLabels.includes('livetv');

  let vjName = '';
  for (const label of labels) {
    if (/^vj\s+/i.test(label) || VJ_LIST.some((v) => v.toLowerCase() === label.toLowerCase())) {
      vjName = normalizeVjName(label);
      break;
    }
  }
  if (!vjName) {
    const titleVjMatch = rawTitle.match(/\b(vj\s+[a-zA-Z0-9]+)\b/i);
    if (titleVjMatch?.[1]) {
      vjName = normalizeVjName(titleVjMatch[1]);
    }
  }

  const genres = labels.filter((label) => {
    const low = label.toLowerCase();
    if (
      low === MOVIE_FEED_LABEL ||
      low === SERIES_FEED_LABEL ||
      low === 'firimu' ||
      low === 'series'
    ) {
      return false;
    }
    if (vjName && low === vjName.toLowerCase()) return false;
    if (/^vj\s+/i.test(low)) return false;
    return true;
  });

  const displayTitle = cleanDisplayTitle(rawTitle);
  const thumbPoster = upgradeImageUrl(entry.media$thumbnail?.url ?? '');

  let contentType: 'movie' | 'series' =
    forcedContentType ??
    (isSeriesExplicit ? 'series' : 'movie');

  const {parts, allImages, imageAlts} = extractPartsAndImages(
    rawContent,
    thumbPoster,
    contentType,
    displayTitle,
  );

  if (!forcedContentType && !isMovieExplicit && !isSeriesExplicit && parts.length >= 4) {
    contentType = 'series';
  }

  const posterUrl = allImages[0] || thumbPoster || '';
  const backdropUrl = allImages[1] || posterUrl;
  const synopsis = extractSynopsis(rawContent, displayTitle, imageAlts);

  return {
    id,
    title: decodeHtmlEntities(rawTitle),
    displayTitle,
    pathname,
    year,
    month,
    slug,
    publishedAt: entry.published?.$t ?? new Date().toISOString(),
    updatedAt: entry.updated?.$t ?? entry.published?.$t ?? new Date().toISOString(),
    posterUrl,
    backdropUrl,
    vjName: vjName || 'All VJs',
    genres,
    labels,
    contentType,
    isLiveTv,
    synopsis,
    parts,
  };
}

export function parseBloggerFeed(
  raw: BloggerRawFeed,
  forcedContentType?: 'movie' | 'series',
): {
  items: MovieItem[];
  totalResults: number;
} {
  const entries = raw.feed?.entry ?? [];
  const totalResults = Number.parseInt(
    raw.feed?.openSearch$totalResults?.$t ?? String(entries.length),
    10,
  );
  const items: MovieItem[] = [];
  for (const entry of entries) {
    const parsed = parseBloggerEntry(entry, forcedContentType);
    if (parsed) items.push(parsed);
  }
  return {
    items,
    totalResults: Number.isFinite(totalResults) ? totalResults : items.length,
  };
}

export function parseBloggerPagesFeed(raw: BloggerRawFeed): StaticPageItem[] {
  const entries = raw.feed?.entry ?? [];
  const pages: StaticPageItem[] = [];

  for (const entry of entries) {
    const id = entry.id?.$t ?? '';
    const title = decodeHtmlEntities(entry.title?.$t ?? '').trim();
    const altLink = entry.link?.find((l) => l.rel === 'alternate')?.href ?? '';
    let slug = '';
    if (altLink) {
      try {
        const pathname = new URL(altLink).pathname;
        const m = pathname.match(/\/p\/([^/.]+)(?:\.html)?/i);
        slug = (m?.[1] ?? pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();
      } catch {
        slug = '';
      }
    }
    if (!slug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (!slug || !title) continue;

    const rawHtml = (entry.content?.$t ?? entry.summary?.$t ?? '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    const blocks: StaticPageBlock[] = [];
    const blockRegex =
      /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)|(<ul[^>]*>[\s\S]*?<\/ul>)|(<ol[^>]*>[\s\S]*?<\/ol>)|(<p[^>]*>[\s\S]*?<\/p>)/gi;
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(rawHtml)) !== null) {
      if (m[1]) {
        const text = stripHtmlTags(m[1]).replace(/\bwww\.marketing2advertising\.com\b/gi, '');
        if (text) blocks.push({type: 'heading', text});
      } else if (m[2] || m[3]) {
        const listHtml = m[2] || m[3];
        const items: string[] = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let li: RegExpExecArray | null;
        while ((li = liRegex.exec(listHtml)) !== null) {
          const text = stripHtmlTags(li[1]).replace(/\bwww\.marketing2advertising\.com\b/gi, '');
          if (text) items.push(text);
        }
        if (items.length > 0) blocks.push({type: 'list', items});
      } else if (m[4]) {
        const text = stripHtmlTags(m[4]).replace(/\bwww\.marketing2advertising\.com\b/gi, '');
        if (text) blocks.push({type: 'paragraph', text});
      }
    }

    if (blocks.length === 0) {
      const plain = stripHtmlTags(rawHtml).replace(/\bwww\.marketing2advertising\.com\b/gi, '');
      if (plain) blocks.push({type: 'paragraph', text: plain});
    }

    pages.push({
      id,
      slug,
      title,
      updatedAt: entry.updated?.$t ?? entry.published?.$t ?? new Date().toISOString(),
      blocks,
    });
  }

  return pages;
}
