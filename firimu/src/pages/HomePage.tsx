import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudDownload,
  Film,
  Play,
  RotateCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {MovieCard} from '../components/MovieCard.tsx';
import {PosterImage} from '../components/PosterImage.tsx';
import {SeoHead} from '../components/SeoHead.tsx';
import {
  formatPlaybackTime,
  formatRemainingTime,
  useCatalogue,
} from '../context/CatalogueContext.tsx';
import {
  FOOTER_TAGLINE,
  MOVIE_FEED_LABEL,
  SERIES_FEED_LABEL,
  SITE_NAME,
} from '../lib/constants.ts';
import {formatOfflineCountdown} from '../lib/offlineStorage.ts';

const PAGE_SIZE = 24;

const COLLECTION_HUBS = [
  {
    title: 'Movies',
    subtitle: 'Full Firimu',
    to: `/search/label/${MOVIE_FEED_LABEL}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(0,99,229,0.5)]',
  },
  {
    title: 'Series',
    subtitle: 'Full Episodes',
    to: `/search/label/${SERIES_FEED_LABEL}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(56,189,248,0.45)]',
  },
  {
    title: 'Vj Junior',
    subtitle: 'Action & Classics',
    to: `/search/label/${encodeURIComponent('Vj Junior')}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(0,99,229,0.45)]',
  },
  {
    title: 'Vj Emmy',
    subtitle: 'Latest Drops',
    to: `/search/label/${encodeURIComponent('Vj Emmy')}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(56,189,248,0.4)]',
  },
  {
    title: 'Vj KeVo',
    subtitle: 'Thrillers & Drama',
    to: `/search/label/${encodeURIComponent('Vj KeVo')}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(0,99,229,0.45)]',
  },
  {
    title: 'Action',
    subtitle: 'Top Rated',
    to: `/search/label/${encodeURIComponent('Action')}`,
    glow: 'hover:shadow-[0_24px_40px_-14px_rgba(56,189,248,0.4)]',
  },
];

function formatReleaseDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export const HomePage: React.FC = () => {
  const {
    items,
    genres,
    vjs,
    loading,
    error,
    refreshCatalogue,
    history,
    removeHistoryItem,
    clearHistory,
    offlineMovies,
    appOfflineStatus,
  } = useCatalogue();

  const [heroIndex, setHeroIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [vjFilter, setVjFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const recentStripRef = useRef<HTMLDivElement | null>(null);
  const seriesStripRef = useRef<HTMLDivElement | null>(null);
  const catalogueRef = useRef<HTMLElement | null>(null);

  const heroSlides = useMemo(() => {
    const withArt = items.filter((item) => item.posterUrl && item.parts.length > 0);
    return (withArt.length > 0 ? withArt : items).slice(0, 5);
  }, [items]);

  const activeHeroIdx =
    heroSlides.length > 0 ? heroIndex % heroSlides.length : 0;
  const spotlight = heroSlides[activeHeroIdx] ?? null;

  // Auto-advance hero showcase softly every 9 seconds
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const recentItems = useMemo(() => items.slice(0, 14), [items]);
  const seriesRailItems = useMemo(
    () => items.filter((i) => i.contentType === 'series').slice(0, 14),
    [items],
  );

  // Map pathname -> progress percentage for showing subtle resume bars on poster cards
  const progressMap = useMemo(() => {
    const map = new Map<string, {pct: number; resumeUrl: string}>();
    for (const h of history) {
      const targetUrl =
        h.totalParts > 1 ? `${h.pathname}/part/${h.partIndex}` : h.pathname;
      const pct =
        h.duration && h.duration > 0 && h.currentTime
          ? Math.min(98, Math.max(5, Math.round((h.currentTime / h.duration) * 100)))
          : h.startedPlayback || h.partIndex > 1
            ? Math.min(95, Math.max(12, Math.round((h.partIndex / Math.max(1, h.totalParts)) * 100)))
            : 0;
      if (pct > 0) {
        map.set(h.pathname, {pct, resumeUrl: targetUrl});
      }
    }
    return map;
  }, [history]);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.contentType !== typeFilter) return false;
      if (
        genreFilter !== 'all' &&
        !item.genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase()) &&
        !item.labels.some((l) => l.toLowerCase() === genreFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        vjFilter !== 'all' &&
        item.vjName.toLowerCase() !== vjFilter.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        const haystack = [
          item.displayTitle,
          item.title,
          item.vjName,
          ...item.genres,
          ...item.synopsis,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, typeFilter, genreFilter, vjFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const scrollStrip = (
    ref: React.RefObject<HTMLDivElement | null>,
    dir: -1 | 1,
  ) => {
    ref.current?.scrollBy({left: dir * 560, behavior: 'smooth'});
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    catalogueRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const resetFilters = () => {
    setTypeFilter('all');
    setGenreFilter('all');
    setVjFilter('all');
    setKeyword('');
    setPage(1);
  };

  const hasActiveFilters =
    typeFilter !== 'all' ||
    genreFilter !== 'all' ||
    vjFilter !== 'all' ||
    keyword.trim().length > 0;

  return (
    <div>
      <SeoHead
        title={`${SITE_NAME} — Free Luganda Translated Movies & Series`}
        description={`${FOOTER_TAGLINE}. Stream multi-part Luganda translated movies and full series episodes online.`}
        canonicalPath="/"
        image={spotlight?.posterUrl}
      />

      {/* Disney+ Full-Bleed Cinematic Hero Showcase */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#040714]">
        {loading && items.length === 0 ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="h-[380px] w-full animate-pulse rounded-2xl bg-[#0E111E]" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <Film className="mx-auto mb-4 h-12 w-12 text-[#0483EE]" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Could not reach the movie catalogue
            </h1>
            <p className="mt-2 text-sm text-[#A4A9B8]">{error}</p>
            <button
              type="button"
              onClick={() => void refreshCatalogue()}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0063E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
            >
              <RotateCw className="h-4 w-4" />
              Retry Sync
            </button>
          </div>
        ) : spotlight ? (
          <div className="relative min-h-[430px] sm:min-h-[480px] lg:min-h-[520px]">
            {/* Expansive Backdrop Visual Layer */}
            <div className="absolute inset-0">
              <div className="absolute inset-y-0 right-0 w-full lg:w-[74%]">
                <PosterImage
                  src={spotlight.backdropUrl || spotlight.posterUrl}
                  alt={spotlight.displayTitle}
                  title={spotlight.displayTitle}
                  eager
                  className="h-full w-full object-cover object-center opacity-75 transition-opacity duration-500"
                />
              </div>
              {/* Multi-stop Disney+ Radial & Linear Scrims */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#040714] via-[#040714]/88 to-transparent"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#040714] via-[#040714]/25 to-[#040714]/45"
                aria-hidden="true"
              />
            </div>

            {/* Hero Foreground Content */}
            <div className="relative mx-auto flex min-h-[430px] max-w-7xl flex-col justify-end px-4 pb-12 pt-16 sm:min-h-[480px] sm:px-6 lg:min-h-[520px] lg:justify-center lg:px-8 lg:py-14">
              <div className="max-w-2xl">
                <p className="text-xs font-bold tracking-[0.18em] text-[#38BDF8] uppercase">
                  Featured Premiere
                </p>
                <h1 className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
                  {spotlight.displayTitle}
                </h1>
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-sm text-[#CACACA] tabular-nums">
                  <span className="font-semibold text-white">{spotlight.vjName}</span>
                  {spotlight.genres[0] && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{spotlight.genres[0]}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    {spotlight.parts.length > 1
                      ? `${spotlight.parts.length} ${spotlight.contentType === 'series' ? 'Episodes' : 'Parts'}`
                      : spotlight.contentType === 'series'
                        ? 'Series'
                        : 'Full Movie'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#A4A9B8]">
                    {formatReleaseDate(spotlight.publishedAt)}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-[#CACACA] sm:text-base">
                  {spotlight.synopsis[0] ||
                    `Stream ${spotlight.displayTitle} translated in Luganda by ${spotlight.vjName}.`}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <Link
                    to={spotlight.pathname}
                    className="inline-flex min-h-[48px] items-center gap-2.5 rounded-lg bg-[#F9F9F9] px-7 py-3 text-sm font-bold tracking-wide text-[#040714] uppercase shadow-[0_8px_28px_rgba(0,0,0,0.45)] transition-transform duration-150 hover:scale-[1.02] hover:bg-white"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>Watch Now</span>
                  </Link>
                  <Link
                    to={`/search/label/${encodeURIComponent(spotlight.vjName)}`}
                    className="inline-flex min-h-[48px] items-center rounded-lg border border-white/25 bg-[#040714]/65 px-5 py-3 text-sm font-semibold text-[#F9F9F9] backdrop-blur-md transition-colors hover:border-white/60 hover:bg-[#0E111E]"
                  >
                    More from {spotlight.vjName}
                  </Link>
                </div>
              </div>

              {/* Hero Slide Navigation */}
              {heroSlides.length > 1 && (
                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2" role="tablist" aria-label="Featured releases">
                    {heroSlides.map((slide, idx) => (
                      <button
                        key={slide.pathname}
                        type="button"
                        role="tab"
                        aria-selected={idx === activeHeroIdx}
                        aria-label={`Show ${slide.displayTitle}`}
                        onClick={() => setHeroIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          idx === activeHeroIdx
                            ? 'w-8 bg-[#F9F9F9]'
                            : 'w-3 bg-white/30 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    <button
                      type="button"
                      onClick={() =>
                        setHeroIndex(
                          (prev) =>
                            (prev - 1 + heroSlides.length) % heroSlides.length,
                        )
                      }
                      aria-label="Previous featured movie"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#040714]/65 text-white backdrop-blur-md transition-colors hover:border-white/70 hover:bg-[#0E111E]"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroIndex((prev) => (prev + 1) % heroSlides.length)
                      }
                      aria-label="Next featured movie"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#040714]/65 text-white backdrop-blur-md transition-colors hover:border-white/70 hover:bg-[#0E111E]"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Disney+ Signature Collection & VJ Hub Tiles */}
        <section aria-label="Browse hubs">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {COLLECTION_HUBS.map((hub) => (
              <Link
                key={hub.title}
                to={hub.to}
                className={`disney-card-frame group relative flex min-h-[86px] flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.15] bg-gradient-to-b from-[#1E2336] via-[#131727] to-[#0A0D18] px-3 py-4 text-center hover:scale-[1.04] hover:border-white/80 hover:from-[#262E47] hover:to-[#101528] ${hub.glow}`}
              >
                <span className="font-display text-base font-extrabold tracking-wide text-[#F9F9F9] sm:text-lg">
                  {hub.title}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-[#A4A9B8] transition-colors group-hover:text-[#38BDF8]">
                  {hub.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Continue Watching & Recently Watched */}
        {history.length > 0 &&
          (() => {
            const continueEntry =
              history.find(
                (h) =>
                  (h.currentTime ?? 0) >= 5 ||
                  h.startedPlayback ||
                  h.partIndex > 1,
              ) ?? history[0];
            const resumeUrl =
              continueEntry.totalParts > 1
                ? `${continueEntry.pathname}/part/${continueEntry.partIndex}`
                : continueEntry.pathname;
            const hasSavedTimestamp =
              typeof continueEntry.currentTime === 'number' &&
              continueEntry.currentTime >= 5;
            const continuePct =
              hasSavedTimestamp &&
              continueEntry.duration &&
              continueEntry.duration > 0
                ? Math.min(
                    98,
                    Math.max(
                      4,
                      Math.round(
                        (continueEntry.currentTime! / continueEntry.duration) *
                          100,
                      ),
                    ),
                  )
                : continueEntry.totalParts > 1
                  ? Math.round(
                      (continueEntry.partIndex / continueEntry.totalParts) * 100,
                    )
                  : 0;

            return (
              <div className="space-y-10">
                {/* Continue Watching Quick-Resume Banner */}
                <section aria-labelledby="continue-watching-heading">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2
                      id="continue-watching-heading"
                      className="font-display text-xl font-bold tracking-tight text-[#F9F9F9] sm:text-2xl"
                    >
                      Continue Watching
                    </h2>
                  </div>

                  <div className="disney-card-frame flex flex-col justify-between gap-5 rounded-2xl border border-white/[0.14] bg-gradient-to-r from-[#121728] via-[#0E111E] to-[#0B0E18] p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 items-center gap-4">
                      <Link
                        to={resumeUrl}
                        state={{autoResume: true}}
                        className="relative aspect-[16/10] w-32 shrink-0 overflow-hidden rounded-xl border border-white/[0.12] bg-[#040714] sm:w-44"
                      >
                        <PosterImage
                          src={continueEntry.posterUrl}
                          alt={continueEntry.displayTitle}
                          title={continueEntry.displayTitle}
                          className="h-full w-full object-cover"
                        />
                        {continuePct > 0 && (
                          <div
                            className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25"
                            aria-hidden="true"
                          >
                            <div
                              className="h-full bg-gradient-to-r from-[#0063E5] to-[#38BDF8]"
                              style={{width: `${continuePct}%`}}
                            />
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tracking-wide text-[#38BDF8]">
                          {hasSavedTimestamp
                            ? `Stopped at ${formatPlaybackTime(continueEntry.currentTime!)}`
                            : 'Pick up where you left off'}
                        </p>
                        <h3 className="mt-0.5 truncate font-display text-lg font-bold text-white sm:text-xl">
                          {continueEntry.displayTitle}
                        </h3>
                        <p className="mt-1 truncate text-xs text-[#A4A9B8] sm:text-sm tabular-nums">
                          <span>{continueEntry.vjName}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-[#F9F9F9]">
                            {continueEntry.partLabel}
                          </span>
                          {continueEntry.totalParts > 1 && (
                            <span> of {continueEntry.totalParts}</span>
                          )}
                          {hasSavedTimestamp &&
                            continueEntry.duration &&
                            continueEntry.duration > 0 && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span>
                                  {formatRemainingTime(
                                    continueEntry.currentTime!,
                                    continueEntry.duration,
                                  )}
                                </span>
                              </>
                            )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        to={resumeUrl}
                        state={{autoResume: true}}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#F9F9F9] px-6 py-2.5 text-sm font-bold text-[#040714] shadow-lg transition-transform hover:scale-[1.02] hover:bg-white sm:w-auto"
                      >
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                        <span>
                          {hasSavedTimestamp
                            ? `Resume · ${formatPlaybackTime(continueEntry.currentTime!)}`
                            : continueEntry.totalParts > 1
                              ? `Resume · ${continueEntry.partLabel}`
                              : 'Resume'}
                        </span>
                      </Link>
                    </div>
                  </div>
                </section>

                {/* Recently Watched Widescreen Strip */}
                <section aria-labelledby="recently-watched-heading">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Clock
                        className="h-5 w-5 text-[#0483EE]"
                        aria-hidden="true"
                      />
                      <h2
                        id="recently-watched-heading"
                        className="font-display text-xl font-bold tracking-tight text-[#F9F9F9]"
                      >
                        Recently Watched
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#A4A9B8] transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Clear History</span>
                    </button>
                  </div>

                  <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3 pt-1">
                    {history.map((entry) => {
                      const targetUrl =
                        entry.totalParts > 1
                          ? `${entry.pathname}/part/${entry.partIndex}`
                          : entry.pathname;
                      const savedSec = entry.currentTime ?? 0;
                      const savedDur = entry.duration ?? 0;
                      const cardPct =
                        savedSec >= 5 && savedDur > 0
                          ? Math.min(
                              98,
                              Math.max(4, Math.round((savedSec / savedDur) * 100)),
                            )
                          : savedSec >= 5
                            ? 22
                            : entry.totalParts > 1
                              ? Math.round(
                                  (entry.partIndex / entry.totalParts) * 100,
                                )
                              : 0;

                      return (
                        <div
                          key={entry.pathname}
                          className="disney-card-frame group relative flex w-56 shrink-0 flex-col justify-between rounded-xl border border-white/[0.12] bg-[#0E111E] p-2.5 hover:scale-[1.03] hover:border-white/75 sm:w-64"
                        >
                          <button
                            type="button"
                            onClick={() => removeHistoryItem(entry.pathname)}
                            aria-label={`Remove ${entry.displayTitle} from recently watched`}
                            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#040714]/85 text-[#CACACA] opacity-100 transition-opacity hover:bg-[#0063E5] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>

                          <Link
                            to={targetUrl}
                            state={{autoResume: true}}
                            className="flex flex-col"
                          >
                            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#040714]">
                              <PosterImage
                                src={entry.posterUrl}
                                alt={entry.displayTitle}
                                title={entry.displayTitle}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                              />
                              <div
                                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#040714]/35 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-hidden="true"
                              >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9F9F9] text-[#040714] shadow-lg">
                                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                                </span>
                              </div>
                              {cardPct > 0 && (
                                <div
                                  className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25"
                                  aria-hidden="true"
                                >
                                  <div
                                    className="h-full bg-gradient-to-r from-[#0063E5] to-[#38BDF8]"
                                    style={{width: `${cardPct}%`}}
                                  />
                                </div>
                              )}
                            </div>
                            <p className="mt-2.5 truncate font-display text-sm font-semibold text-[#F9F9F9]">
                              {entry.displayTitle}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#A4A9B8] tabular-nums">
                              {entry.vjName}
                              <span aria-hidden="true"> · </span>
                              {entry.partLabel}
                              {savedSec >= 5
                                ? ` · ${formatPlaybackTime(savedSec)}`
                                : entry.totalParts > 1
                                  ? ` of ${entry.totalParts}`
                                  : ''}
                            </p>
                          </Link>

                          <Link
                            to={targetUrl}
                            state={{autoResume: true}}
                            className="mt-2.5 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#040714] px-3 text-xs font-semibold text-[#F9F9F9] transition-colors hover:border-[#0063E5] hover:bg-[#0063E5] hover:text-white"
                          >
                            <Play
                              className="h-3 w-3 fill-current"
                              aria-hidden="true"
                            />
                            <span>
                              {savedSec >= 5
                                ? `Resume ${formatPlaybackTime(savedSec)}`
                                : 'Resume'}
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            );
          })()}

        {/* Saved for 24h Offline Viewing Strip */}
        {(offlineMovies.length > 0 || appOfflineStatus) && (
          <section aria-labelledby="offline-home-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CloudDownload
                  className="h-5 w-5 text-[#38BDF8]"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="offline-home-heading"
                    className="font-display text-xl font-bold tracking-tight text-[#F9F9F9]"
                  >
                    Saved Offline (24h)
                  </h2>
                  {appOfflineStatus && (
                    <p className="text-xs text-[#38BDF8] tabular-nums">
                      Full App Offline active ·{' '}
                      {formatOfflineCountdown(appOfflineStatus.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/offline"
                className="text-xs font-semibold text-[#38BDF8] hover:underline"
              >
                Manage Offline
              </Link>
            </div>

            {offlineMovies.length > 0 && (
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3 pt-1">
                {offlineMovies.map((saved) => {
                  const firstPart = Object.values(saved.parts).sort(
                    (a, b) => a.partNumber - b.partNumber,
                  )[0];
                  const targetUrl =
                    saved.totalParts > 1 && firstPart
                      ? `${saved.pathname}/part/${firstPart.partNumber}`
                      : saved.pathname;
                  const savedCount = Object.keys(saved.parts).length;
                  return (
                    <Link
                      key={saved.pathname}
                      to={targetUrl}
                      state={{autoResume: true}}
                      className="disney-card-frame group flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-[#0E111E] p-2.5 hover:scale-[1.03] hover:border-white/75 sm:w-56"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#040714]">
                        <PosterImage
                          src={saved.posterUrl}
                          alt={saved.displayTitle}
                          title={saved.displayTitle}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#040714]/35 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9F9F9] text-[#040714] shadow-lg">
                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                          </span>
                        </div>
                      </div>
                      <p className="mt-2.5 truncate font-display text-sm font-semibold text-[#F9F9F9]">
                        {saved.displayTitle}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#38BDF8] tabular-nums">
                        {formatOfflineCountdown(saved.expiresAt)} · {savedCount}{' '}
                        {saved.contentType === 'series' ? 'ep' : 'pt'}
                        {savedCount === 1 ? '' : 's'}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Recently Published Horizontal Strip */}
        {recentItems.length > 0 && (
          <section aria-labelledby="recent-releases-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="recent-releases-heading"
                className="font-display text-xl font-bold tracking-tight text-[#F9F9F9] sm:text-2xl"
              >
                New on M2a Movies
              </h2>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollStrip(recentStripRef, -1)}
                  aria-label="Scroll recently published left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-[#0E111E] text-[#CACACA] transition-colors hover:border-white/50 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollStrip(recentStripRef, 1)}
                  aria-label="Scroll recently published right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-[#0E111E] text-[#CACACA] transition-colors hover:border-white/50 hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={recentStripRef}
              className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pt-1"
            >
              {recentItems.map((item) => {
                const prog = progressMap.get(item.pathname);
                return (
                  <div key={item.pathname} className="w-36 shrink-0 sm:w-44">
                    <MovieCard
                      item={item}
                      compact
                      progressPct={prog?.pct}
                      resumeUrl={prog?.resumeUrl}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Luganda Series Horizontal Strip */}
        {seriesRailItems.length > 0 && (
          <section aria-labelledby="series-rail-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <h2
                  id="series-rail-heading"
                  className="font-display text-xl font-bold tracking-tight text-[#F9F9F9] sm:text-2xl"
                >
                  Luganda Series
                </h2>
                <Link
                  to={`/search/label/${SERIES_FEED_LABEL}`}
                  className="text-xs font-semibold text-[#38BDF8] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollStrip(seriesStripRef, -1)}
                  aria-label="Scroll series left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-[#0E111E] text-[#CACACA] transition-colors hover:border-white/50 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollStrip(seriesStripRef, 1)}
                  aria-label="Scroll series right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-[#0E111E] text-[#CACACA] transition-colors hover:border-white/50 hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={seriesStripRef}
              className="no-scrollbar flex gap-4 overflow-x-auto pb-4 pt-1"
            >
              {seriesRailItems.map((item) => {
                const prog = progressMap.get(item.pathname);
                return (
                  <div key={item.pathname} className="w-36 shrink-0 sm:w-44">
                    <MovieCard
                      item={item}
                      compact
                      progressPct={prog?.pct}
                      resumeUrl={prog?.resumeUrl}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Interactive Catalogue Filters & Grid */}
        <section ref={catalogueRef} aria-labelledby="browse-catalogue-heading">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/[0.08] pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="browse-catalogue-heading"
                  className="font-display text-xl font-bold tracking-tight text-[#F9F9F9] sm:text-2xl"
                >
                  Explore All Firimu &amp; Series
                </h2>
                <p className="mt-1 text-xs text-[#A4A9B8] tabular-nums">
                  Showing {filteredItems.length} title
                  {filteredItems.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* Type Segmented Tabs */}
              <div className="inline-flex items-center gap-1 self-start rounded-xl border border-white/[0.1] bg-[#0E111E] p-1">
                {(['all', 'movie', 'series'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(1);
                    }}
                    className={`min-h-[38px] whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                      typeFilter === t
                        ? 'bg-[#0063E5] text-white shadow-sm'
                        : 'text-[#A4A9B8] hover:text-white'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'Series'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A4A9B8]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by title or keyword..."
                  aria-label="Filter catalogue by keyword"
                  className="h-11 w-full rounded-lg border border-white/[0.12] bg-[#0E111E] pl-10 pr-3 text-sm text-[#F9F9F9] placeholder-[#6E768A] focus:border-[#0063E5] focus:outline-none"
                />
              </div>

              <select
                value={genreFilter}
                onChange={(e) => {
                  setGenreFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by genre"
                className="h-11 w-full rounded-lg border border-white/[0.12] bg-[#0E111E] px-3 text-sm text-[#F9F9F9] focus:border-[#0063E5] focus:outline-none"
              >
                <option value="all">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <select
                value={vjFilter}
                onChange={(e) => {
                  setVjFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by VJ"
                className="h-11 w-full rounded-lg border border-white/[0.12] bg-[#0E111E] px-3 text-sm text-[#F9F9F9] focus:border-[#0063E5] focus:outline-none"
              >
                <option value="all">All VJs</option>
                {vjs.map((vj) => (
                  <option key={vj} value={vj}>
                    {vj}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="h-11 rounded-lg border border-white/[0.12] bg-[#0E111E] px-4 text-sm font-medium text-[#CACACA] transition-colors hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({length: 12}).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] animate-pulse rounded-xl bg-[#0E111E]"
                />
              ))}
            </div>
          ) : pagedItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.1] bg-[#0E111E] px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-white">
                No titles match those filters
              </p>
              <p className="mt-1 text-sm text-[#A4A9B8]">
                Try clearing your keyword or selecting a different genre or VJ.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-[#0063E5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
                >
                  Show All Titles
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {pagedItems.map((item) => {
                  const prog = progressMap.get(item.pathname);
                  return (
                    <MovieCard
                      key={item.pathname}
                      item={item}
                      progressPct={prog?.pct}
                      resumeUrl={prog?.resumeUrl}
                    />
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Catalogue pagination"
                  className="mt-10 flex flex-wrap items-center justify-center gap-2 tabular-nums"
                >
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-4 text-sm font-medium text-[#F9F9F9] hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-sm text-[#A4A9B8]">
                    Page <strong className="text-white">{currentPage}</strong> of{' '}
                    <strong className="text-white">{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-4 text-sm font-medium text-[#F9F9F9] hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
