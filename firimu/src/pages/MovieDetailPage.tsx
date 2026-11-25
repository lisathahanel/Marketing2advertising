import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Copy,
  Film,
  Play,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import {AdSenseUnit} from '../components/AdSenseUnit.tsx';
import {FirimuPlayer} from '../components/FirimuPlayer.tsx';
import {MovieCard} from '../components/MovieCard.tsx';
import {PosterImage} from '../components/PosterImage.tsx';
import {SeoHead} from '../components/SeoHead.tsx';
import {
  formatPlaybackTime,
  makeDownloadKey,
  useCatalogue,
} from '../context/CatalogueContext.tsx';
import type {MovieItem, MoviePart} from '../lib/bloggerParser.ts';
import {CANONICAL_BASE_URL, SITE_NAME} from '../lib/constants.ts';
import {
  formatBytes,
  formatOfflineCountdown,
} from '../lib/offlineStorage.ts';
import {
  getCachedSingleMovieSync,
  getRelatedItems,
  loadSingleMovieFast,
  normalizeMoviePathname,
} from '../services/bloggerFeed.ts';

function formatPublishedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export const MovieDetailPage: React.FC = () => {
  const {year, month, slug, partNumber} = useParams<{
    year: string;
    month: string;
    slug: string;
    partNumber?: string;
  }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    items,
    loading,
    error,
    upsertMovieItem,
    history,
    recordWatch,
    savePlaybackProgress,
    getSavedPartProgress,
    offlineMovies,
    activeDownloads,
    offlineError,
    clearOfflineError,
    savePartForOffline,
    saveAllPartsForOffline,
    cancelOfflineDownload,
    removeOfflinePartItem,
  } = useCatalogue();
  const [copied, setCopied] = useState(false);

  const autoResume = Boolean(
    (location.state as {autoResume?: boolean} | null)?.autoResume ||
      searchParams.get('resume') === '1',
  );

  const targetPathname = `/${year ?? ''}/${month ?? ''}/${slug ?? ''}`;
  const normalizedTarget = normalizeMoviePathname(targetPathname);

  const [directMovie, setDirectMovie] = useState<MovieItem | null>(() =>
    getCachedSingleMovieSync(targetPathname),
  );
  const [fastLookupDone, setFastLookupDone] = useState(false);

  const movieIndex = useMemo(
    () =>
      items.findIndex(
        (item) => normalizeMoviePathname(item.pathname) === normalizedTarget,
      ),
    [items, normalizedTarget],
  );
  const movie =
    (movieIndex >= 0 ? items[movieIndex] : null) ??
    (directMovie &&
    normalizeMoviePathname(directMovie.pathname) === normalizedTarget
      ? directMovie
      : null);
  const newerMovie = movieIndex > 0 ? items[movieIndex - 1] : null;
  const olderMovie =
    movieIndex >= 0 && movieIndex < items.length - 1
      ? items[movieIndex + 1]
      : null;

  // Fast direct-link lookup when user lands on /:year/:month/:slug from outside the app
  useEffect(() => {
    const fromCache = getCachedSingleMovieSync(targetPathname);
    if (fromCache) {
      setDirectMovie(fromCache);
      setFastLookupDone(true);
      return;
    }

    if (movieIndex >= 0) {
      setFastLookupDone(true);
      return;
    }

    let active = true;
    setFastLookupDone(false);

    loadSingleMovieFast(targetPathname)
      .then((found) => {
        if (!active) return;
        if (found) {
          setDirectMovie(found);
          upsertMovieItem(found);
        }
      })
      .finally(() => {
        if (active) setFastLookupDone(true);
      });

    return () => {
      active = false;
    };
  }, [targetPathname, movieIndex, upsertMovieItem]);

  const related = useMemo(
    () => (movie ? getRelatedItems(items, movie, 6) : []),
    [items, movie],
  );

  // Sync active part index with /part/:partNumber route param or ?part= query param (1-indexed)
  const isDedicatedPartPage = Boolean(partNumber);
  const hasExplicitPart = isDedicatedPartPage || searchParams.has('part');
  const totalParts = movie?.parts.length ?? 0;
  const partParamRaw = Number.parseInt(
    partNumber ?? searchParams.get('part') ?? '1',
    10,
  );
  const activePartIndex =
    Number.isFinite(partParamRaw) && partParamRaw >= 1 && partParamRaw <= totalParts
      ? partParamRaw
      : 1;

  const activePart = useMemo(() => {
    if (!movie || movie.parts.length === 0) return null;
    return movie.parts[activePartIndex - 1] ?? movie.parts[0];
  }, [movie, activePartIndex]);

  const savedHistoryEntry = useMemo(
    () => (movie ? history.find((h) => h.pathname === movie.pathname) : undefined),
    [history, movie],
  );

  const savedPartProgress = useMemo(
    () =>
      movie ? getSavedPartProgress(movie.pathname, activePartIndex) : null,
    [movie, activePartIndex, getSavedPartProgress],
  );

  const offlineMovieRecord = useMemo(
    () =>
      movie
        ? offlineMovies.find((m) => m.pathname === movie.pathname)
        : undefined,
    [offlineMovies, movie],
  );

  const activePartOffline =
    activePart && offlineMovieRecord?.parts?.[activePart.index];

  const activeDownload =
    movie && activePart
      ? activeDownloads[makeDownloadKey(movie.pathname, activePart.index)]
      : undefined;

  const videoPartsCount = useMemo(
    () => movie?.parts.filter((p) => p.sourceType === 'video').length ?? 0,
    [movie],
  );

  const allPartsSavedOffline = useMemo(() => {
    if (!movie || videoPartsCount === 0 || !offlineMovieRecord) return false;
    return movie.parts
      .filter((p) => p.sourceType === 'video')
      .every((p) => Boolean(offlineMovieRecord.parts?.[p.index]));
  }, [movie, videoPartsCount, offlineMovieRecord]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [targetPathname, activePartIndex]);

  // Restore saved part progress when opening a multi-part title without an explicit part route/param
  useEffect(() => {
    if (!movie || hasExplicitPart || movie.parts.length <= 1) return;
    if (
      savedHistoryEntry &&
      savedHistoryEntry.partIndex > 1 &&
      savedHistoryEntry.partIndex <= movie.parts.length
    ) {
      navigate(`${movie.pathname}/part/${savedHistoryEntry.partIndex}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [movie, hasExplicitPart, savedHistoryEntry, navigate, location.state]);

  useEffect(() => {
    if (!movie) return;
    const fallbackLabel =
      movie.contentType === 'series' ? 'Episode 01' : 'Full Movie';
    recordWatch(movie, activePartIndex, activePart?.label ?? fallbackLabel, {
      explicitPartSelection: hasExplicitPart,
    });
  }, [movie, activePartIndex, activePart?.label, hasExplicitPart, recordWatch]);

  const handlePlayerUnlock = useCallback(
    (unlockedPart: MoviePart) => {
      if (!movie) return;
      recordWatch(movie, unlockedPart.index, unlockedPart.label, {
        startedPlayback: true,
        explicitPartSelection: true,
      });
    },
    [movie, recordWatch],
  );

  const handlePlayerProgress = useCallback(
    (progPart: MoviePart, currentTime: number, duration: number) => {
      if (!movie) return;
      savePlaybackProgress(
        movie,
        progPart.index,
        progPart.label,
        currentTime,
        duration,
      );
    },
    [movie, savePlaybackProgress],
  );

  const currentCanonicalPath =
    movie && isDedicatedPartPage && movie.parts.length > 1
      ? `${movie.pathname}/part/${activePartIndex}`
      : movie?.pathname ?? targetPathname;
  const canonicalUrl = `${CANONICAL_BASE_URL}${currentCanonicalPath}`;
  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : canonicalUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored
    }
  };

  if (!movie && (loading || !fastLookupDone)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-6 w-48 animate-pulse rounded bg-[#0E111E]" />
        <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-[#0E111E]" />
        <div className="mt-6 aspect-video w-full animate-pulse rounded-2xl bg-[#0E111E]" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <SeoHead
          title={`Title Not Found — ${SITE_NAME}`}
          description="The requested movie or series could not be found."
          canonicalPath={targetPathname}
        />
        <Film className="mx-auto mb-4 h-12 w-12 text-[#A4A9B8]" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-white">
          {error ? 'Unable to load title' : 'Movie or series not found'}
        </h1>
        <p className="mt-2 text-sm text-[#A4A9B8]">
          {error || 'This entry may have been moved or is no longer available.'}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-[#0063E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const primaryGenre =
    movie.genres[0] || (movie.contentType === 'series' ? 'Series' : 'Movies');
  const descriptionText =
    movie.synopsis[0]?.slice(0, 158) ||
    `Watch ${movie.displayTitle}, presented by ${movie.vjName}, on ${SITE_NAME}.`;

  const movieJsonLd = {
    '@context': 'https://schema.org',
    '@type': movie.contentType === 'series' ? 'TVSeries' : 'Movie',
    name: movie.displayTitle,
    url: canonicalUrl,
    image: movie.posterUrl || undefined,
    datePublished: movie.publishedAt,
    genre: movie.genres,
    description: descriptionText,
    director: {
      '@type': 'Person',
      name: movie.vjName,
    },
  };

  const pageHeadingTitle =
    isDedicatedPartPage && movie.parts.length > 1 && activePart
      ? `${movie.displayTitle} — ${activePart.label}`
      : movie.displayTitle;

  const seoTitle =
    isDedicatedPartPage && movie.parts.length > 1 && activePart
      ? `${movie.displayTitle} (${activePart.label} · ${movie.vjName}) — ${SITE_NAME}`
      : `${movie.displayTitle} (${movie.vjName}) — ${SITE_NAME}`;

  return (
    <div className="relative overflow-hidden">
      {/* Subtle Disney+ Atmospheric Backdrop Tint */}
      {(movie.backdropUrl || movie.posterUrl) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={movie.backdropUrl || movie.posterUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full scale-110 object-cover opacity-20 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040714]/45 via-[#040714]/85 to-[#040714]" />
        </div>
      )}

      <article className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SeoHead
          title={seoTitle}
          description={descriptionText}
          canonicalPath={currentCanonicalPath}
          image={activePart?.posterUrl || movie.posterUrl}
          ogType={movie.contentType === 'series' ? 'video.tv_show' : 'video.movie'}
          jsonLd={movieJsonLd}
        />

        {/* Breadcrumb: Home / Genre / VJ (without repeating the movie title) */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-[#A4A9B8]"
        >
          <Link to="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/search/label/${encodeURIComponent(primaryGenre)}`}
            className="transition-colors hover:text-white"
          >
            {primaryGenre}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/search/label/${encodeURIComponent(movie.vjName)}`}
            className="transition-colors hover:text-white"
          >
            {movie.vjName}
          </Link>
        </nav>

        {/* Movie Title & Clean Unboxed Metadata Header */}
        <header className="mt-3">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-4xl">
            {pageHeadingTitle}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-[#A4A9B8] tabular-nums">
            <Link
              to={`/search/label/${encodeURIComponent(movie.vjName)}`}
              className="font-semibold text-[#F9F9F9] hover:text-[#38BDF8]"
            >
              {movie.vjName}
            </Link>
            {movie.genres.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{movie.genres.slice(0, 3).join(', ')}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {movie.parts.length > 1
                ? `${movie.parts.length} ${movie.contentType === 'series' ? 'Episodes' : 'Parts'}`
                : movie.contentType === 'series'
                  ? '1 Episode'
                  : 'Full Movie'}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={movie.publishedAt}>
              {formatPublishedDate(movie.publishedAt)}
            </time>
            {savedPartProgress && savedPartProgress.currentTime >= 5 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#38BDF8]">
                  Stopped at {formatPlaybackTime(savedPartProgress.currentTime)}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Top Responsive AdSense Unit (directly below title and before video player) */}
        <AdSenseUnit unitKey={`top-${currentCanonicalPath}`} className="my-5" />

        {/* FIRIMU Video Player */}
        <section aria-label="Video player">
          <FirimuPlayer
            moviePathname={movie.pathname}
            movieSlug={movie.slug}
            movieTitle={movie.displayTitle}
            part={activePart}
            fallbackPoster={movie.backdropUrl || movie.posterUrl}
            savedTime={savedPartProgress?.currentTime ?? 0}
            savedDuration={savedPartProgress?.duration ?? 0}
            autoResume={autoResume}
            onUnlock={handlePlayerUnlock}
            onProgress={handlePlayerProgress}
          />
        </section>

        {/* Save for 24-Hour In-App Offline Viewing Bar */}
        {activePart && (
          <section
            aria-label="Save for offline viewing"
            className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-white/[0.1] bg-[#0E111E]/90 px-4 py-3.5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              {activeDownload ? (
                <div>
                  <p className="text-xs font-semibold text-[#38BDF8] tabular-nums">
                    Saving {activePart.label} inside app for 24h offline...{' '}
                    {activeDownload.totalBytes > 0
                      ? `${activeDownload.percent}% (${formatBytes(activeDownload.loadedBytes)} / ${formatBytes(activeDownload.totalBytes)})`
                      : formatBytes(activeDownload.loadedBytes)}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-[#0483EE] transition-all"
                      style={{
                        width: `${
                          activeDownload.totalBytes > 0
                            ? activeDownload.percent
                            : 35
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : activePartOffline ? (
                <div className="flex items-center gap-2 text-xs text-[#F9F9F9] tabular-nums">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#38BDF8]"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{activePart.label}</strong> saved in app for offline
                    watching ({formatOfflineCountdown(activePartOffline.expiresAt)} ·{' '}
                    {formatBytes(activePartOffline.sizeBytes)})
                  </span>
                </div>
              ) : activePart.sourceType === 'video' ? (
                <p className="text-xs text-[#A4A9B8]">
                  Save <strong className="text-[#F9F9F9]">{activePart.label}</strong>{' '}
                  inside this app to watch later for 24 hours without internet.
                </p>
              ) : (
                <p className="text-xs text-[#A4A9B8]">
                  Offline save is available for direct video streams only.
                </p>
              )}
              {offlineError && (
                <div className="mt-1 flex items-center gap-2 text-xs text-rose-300">
                  <span>{offlineError}</span>
                  <button
                    type="button"
                    onClick={clearOfflineError}
                    className="underline hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {activeDownload ? (
                <button
                  type="button"
                  onClick={() =>
                    cancelOfflineDownload(movie.pathname, activePart.index)
                  }
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/[0.14] bg-[#040714] px-3.5 text-xs font-semibold text-[#CACACA] hover:border-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cancel</span>
                </button>
              ) : activePartOffline ? (
                <>
                  <Link
                    to="/offline"
                    className="inline-flex min-h-[40px] items-center rounded-lg border border-white/[0.14] bg-[#040714] px-3.5 text-xs font-semibold text-[#38BDF8] hover:border-white/40 hover:text-white"
                  >
                    Offline Library
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      void removeOfflinePartItem(movie.pathname, activePart.index)
                    }
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/[0.14] bg-[#040714] px-3.5 text-xs font-semibold text-[#CACACA] hover:border-white/40 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Remove Offline</span>
                  </button>
                </>
              ) : activePart.sourceType === 'video' ? (
                <button
                  type="button"
                  onClick={() => void savePartForOffline(movie, activePart)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0063E5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0483EE]"
                >
                  <CloudDownload className="h-4 w-4" aria-hidden="true" />
                  <span>Save Offline (24h)</span>
                </button>
              ) : null}

              {videoPartsCount > 1 && !allPartsSavedOffline && (
                <button
                  type="button"
                  onClick={() => void saveAllPartsForOffline(movie)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/[0.14] bg-[#040714] px-3.5 text-xs font-semibold text-[#F9F9F9] transition-colors hover:border-white/45 hover:text-white"
                >
                  <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Save All {videoPartsCount}{' '}
                    {movie.contentType === 'series' ? 'Eps' : 'Parts'}
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Interactive Parts / Episodes Selector (each part opens on its own page) */}
        {movie.parts.length > 1 && (
          <section
            aria-label="Parts and episodes"
            className="mt-6 rounded-2xl border border-white/[0.12] bg-[#0E111E]/90 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-white sm:text-lg">
                  {movie.contentType === 'series'
                    ? `All Episodes (${movie.parts.length})`
                    : `All Parts (${movie.parts.length})`}
                </h2>
                <p className="text-xs text-[#A4A9B8] tabular-nums">
                  Viewing {activePart?.label} ({activePartIndex} of {movie.parts.length})
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activePartIndex > 1 ? (
                  <Link
                    to={`${movie.pathname}/part/${activePartIndex - 1}`}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/[0.14] bg-[#040714] px-3 text-xs font-semibold text-[#F9F9F9] transition-colors hover:border-white/50 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Prev</span>
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1 rounded-lg border border-white/[0.06] bg-[#040714]/60 px-3 text-xs font-semibold text-[#6E768A]">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Prev</span>
                  </span>
                )}

                {activePartIndex < movie.parts.length ? (
                  <Link
                    to={`${movie.pathname}/part/${activePartIndex + 1}`}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/[0.14] bg-[#040714] px-3 text-xs font-semibold text-[#F9F9F9] transition-colors hover:border-white/50 hover:text-white"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-[40px] cursor-not-allowed items-center gap-1 rounded-lg border border-white/[0.06] bg-[#040714]/60 px-3 text-xs font-semibold text-[#6E768A]">
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {movie.parts.map((part) => {
                const isSelected = part.partNumber === activePartIndex;
                const partUrl = `${movie.pathname}/part/${part.partNumber}`;
                const partSaved = savedHistoryEntry?.partProgress?.[part.partNumber];
                const partSavedSec = partSaved?.currentTime ?? 0;
                const partSavedDur = partSaved?.duration ?? 0;
                const partPct =
                  partSavedSec >= 5 && partSavedDur > 0
                    ? Math.min(
                        98,
                        Math.max(4, Math.round((partSavedSec / partSavedDur) * 100)),
                      )
                    : partSavedSec >= 5
                      ? 20
                      : 0;
                const isPartOffline = Boolean(
                  offlineMovieRecord?.parts?.[part.index],
                );

                return (
                  <Link
                    key={part.partNumber}
                    to={partUrl}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`disney-card-frame group flex flex-col overflow-hidden rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-[#0483EE] bg-[#0063E5]/20 ring-1 ring-[#0483EE]/60'
                        : 'border-white/[0.1] bg-[#040714] hover:scale-[1.03] hover:border-white/75'
                    }`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0E111E]">
                      <PosterImage
                        src={part.posterUrl || movie.posterUrl}
                        alt={`${movie.displayTitle} — ${part.label}`}
                        title={part.label}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-[#040714]/35 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F9F9F9] text-[#040714] shadow-lg">
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </div>
                      {partPct > 0 && (
                        <div
                          className="absolute inset-x-0 bottom-0 h-1 bg-white/25"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full bg-gradient-to-r from-[#0063E5] to-[#38BDF8]"
                            style={{width: `${partPct}%`}}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <span className="block truncate font-display text-xs font-semibold text-white tabular-nums">
                          {part.label}
                        </span>
                        {part.title &&
                        part.title.toLowerCase() !== part.label.toLowerCase() ? (
                          <span className="block truncate text-[11px] text-[#A4A9B8]">
                            {part.title}
                          </span>
                        ) : partSavedSec >= 5 ? (
                          <span className="block truncate text-[11px] text-[#38BDF8] tabular-nums">
                            Stopped {formatPlaybackTime(partSavedSec)}
                          </span>
                        ) : isPartOffline ? (
                          <span className="block truncate text-[11px] text-[#38BDF8]">
                            Saved Offline
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                          isSelected
                            ? 'text-[#38BDF8]'
                            : isPartOffline
                              ? 'text-[#38BDF8]'
                              : 'text-[#A4A9B8]'
                        }`}
                      >
                        {isSelected
                          ? 'Playing'
                          : isPartOffline
                            ? 'Offline'
                            : `#${part.partNumber}`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Second Responsive AdSense Unit (directly before Synopsis section) */}
        <AdSenseUnit unitKey={`mid-${currentCanonicalPath}`} className="my-6" />

        {/* Synopsis */}
        <section aria-labelledby="synopsis-heading" className="mt-6">
          <h2
            id="synopsis-heading"
            className="font-display text-lg font-bold text-[#F9F9F9]"
          >
            Synopsis
          </h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#CACACA]">
            {movie.synopsis.length > 0 ? (
              movie.synopsis.map((para, i) => <p key={i}>{para}</p>)
            ) : (
              <p>
                Stream {movie.displayTitle}, presented by {movie.vjName}.
                {movie.parts.length > 1
                  ? ` Includes ${movie.parts.length} ${movie.contentType === 'series' ? 'episodes' : 'parts'} ready to watch.`
                  : ''}
              </p>
            )}
          </div>

          {/* Unboxed Label Links */}
          {movie.labels.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.08] pt-4 text-xs text-[#A4A9B8]">
              <span className="font-semibold text-[#CACACA]">Labels:</span>
              {movie.labels.map((label, idx) => (
                <React.Fragment key={label}>
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    to={`/search/label/${encodeURIComponent(label)}`}
                    className="text-[#CACACA] underline-offset-4 hover:text-white hover:underline"
                  >
                    {label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Share Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/[0.08] pt-5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A4A9B8]">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share:
            </span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${movie.displayTitle} (${movie.vjName}) — ${canonicalUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-3.5 text-xs font-medium text-[#F9F9F9] transition-colors hover:border-white/40 hover:text-white"
            >
              WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center rounded-lg border border-white/[0.12] bg-[#0E111E] px-3.5 text-xs font-medium text-[#F9F9F9] transition-colors hover:border-white/40 hover:text-white"
            >
              Facebook
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#0E111E] px-3.5 text-xs font-medium text-[#F9F9F9] transition-colors hover:border-white/40 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Newer / Older Navigation */}
        {(newerMovie || olderMovie) && (
          <nav
            aria-label="Newer and older releases"
            className="mt-8 grid gap-3 border-t border-white/[0.08] pt-6 sm:grid-cols-2"
          >
            <div>
              {newerMovie && (
                <Link
                  to={newerMovie.pathname}
                  className="flex h-full flex-col justify-center rounded-xl border border-white/[0.1] bg-[#0E111E] p-4 transition-colors hover:border-white/45"
                >
                  <span className="text-xs font-medium text-[#A4A9B8]">
                    &larr; Newer Release
                  </span>
                  <span className="mt-1 truncate font-display text-sm font-semibold text-white">
                    {newerMovie.displayTitle}
                  </span>
                </Link>
              )}
            </div>
            <div>
              {olderMovie && (
                <Link
                  to={olderMovie.pathname}
                  className="flex h-full flex-col justify-center rounded-xl border border-white/[0.1] bg-[#0E111E] p-4 text-right transition-colors hover:border-white/45"
                >
                  <span className="text-xs font-medium text-[#A4A9B8]">
                    Older Release &rarr;
                  </span>
                  <span className="mt-1 truncate font-display text-sm font-semibold text-white">
                    {olderMovie.displayTitle}
                  </span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* Related Movies Grid */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12">
            <h2
              id="related-heading"
              className="mb-5 font-display text-xl font-bold text-[#F9F9F9]"
            >
              More Like This
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {related.map((item) => (
                <MovieCard key={item.pathname} item={item} compact />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};
