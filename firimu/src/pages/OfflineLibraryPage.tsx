import React, {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  CloudDownload,
  HardDrive,
  Play,
  RefreshCw,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import {PosterImage} from '../components/PosterImage.tsx';
import {SeoHead} from '../components/SeoHead.tsx';
import {
  formatPlaybackTime,
  useCatalogue,
} from '../context/CatalogueContext.tsx';
import {useOnlineStatus} from '../hooks/useOnlineStatus.ts';
import {SITE_NAME} from '../lib/constants.ts';
import {
  formatBytes,
  formatOfflineCountdown,
} from '../lib/offlineStorage.ts';

export const OfflineLibraryPage: React.FC = () => {
  const {
    items,
    offlineMovies,
    activeDownloads,
    offlineError,
    clearOfflineError,
    appOfflineStatus,
    appOfflineSyncing,
    getSavedPartProgress,
    cancelOfflineDownload,
    removeOfflinePartItem,
    removeOfflineMovieItem,
    clearOfflineVault,
    activateAppOffline24h,
    deactivateAppOffline24h,
  } = useCatalogue();
  const isOnline = useOnlineStatus();

  const totalBytesUsed = useMemo(() => {
    let bytes = 0;
    for (const m of offlineMovies) {
      for (const p of Object.values(m.parts)) {
        bytes += p.sizeBytes;
      }
    }
    return bytes;
  }, [offlineMovies]);

  const activeDownloadList = Object.values(activeDownloads);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title={`Offline Library (24h) — ${SITE_NAME}`}
        description="Watch movies and series saved in-app for 24 hours without an internet connection."
        canonicalPath="/offline"
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex items-center gap-2 text-xs text-[#A4A9B8]"
      >
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#F9F9F9]">Offline Library (24h)</span>
      </nav>

      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-4xl">
            Watch Offline (24 Hours)
          </h1>
          <p className="mt-1.5 text-sm text-[#A4A9B8]">
            Movies saved here stay inside the app on this device for 24 hours so you can watch without internet, then expire automatically.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#A4A9B8] tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
            <span>{formatBytes(totalBytesUsed)} stored</span>
          </span>
          {offlineMovies.length > 0 && (
            <button
              type="button"
              onClick={() => void clearOfflineVault()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#0E111E] px-3 font-semibold text-[#CACACA] transition-colors hover:border-white/40 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
          <WifiOff className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          <span>
            You are currently offline. Every saved title below plays directly from this device without using mobile data.
          </span>
        </div>
      )}

      {offlineError && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">
          <span>{offlineError}</span>
          <button
            type="button"
            onClick={clearOfflineError}
            aria-label="Dismiss error"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 24-Hour Full App Offline Mode Card */}
      <section
        aria-labelledby="app-offline-heading"
        className="mt-8 rounded-2xl border border-white/[0.14] bg-gradient-to-r from-[#131A2E] via-[#0E111E] to-[#0B0E18] p-5 sm:p-6"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#38BDF8] uppercase">
              <CloudDownload className="h-4 w-4" aria-hidden="true" />
              <span>24-Hour Full App Offline Mode</span>
            </div>
            <h2
              id="app-offline-heading"
              className="mt-1.5 font-display text-lg font-bold text-white sm:text-xl"
            >
              {appOfflineStatus
                ? `App ready offline (${formatOfflineCountdown(appOfflineStatus.expiresAt)})`
                : 'Cache the whole app catalogue & artwork for 24 hours'}
            </h2>
            <p className="mt-1 text-sm text-[#A4A9B8] tabular-nums">
              {appOfflineStatus
                ? `${appOfflineStatus.totalTitles} titles and ${appOfflineStatus.cachedPosters} posters are stored on this device for instant browsing without internet.`
                : `Stores all ${items.length || ''} movie listings, VJ filters, search index, and poster artwork inside the app for 24 hours. Pair with "Save Offline" on any movie or episode to watch the video offline too.`}
            </p>
            {appOfflineSyncing && (
              <div className="mt-3 max-w-md">
                <div className="mb-1 flex justify-between text-xs text-[#38BDF8] tabular-nums">
                  <span>Caching app artwork &amp; catalogue...</span>
                  <span>
                    {Math.round(
                      (appOfflineSyncing.done / Math.max(1, appOfflineSyncing.total)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full bg-[#0483EE] transition-all"
                    style={{
                      width: `${Math.round(
                        (appOfflineSyncing.done /
                          Math.max(1, appOfflineSyncing.total)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {appOfflineStatus ? (
              <>
                <button
                  type="button"
                  disabled={Boolean(appOfflineSyncing) || !isOnline}
                  onClick={() => void activateAppOffline24h()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0063E5] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#0483EE] disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Refresh 24h</span>
                </button>
                <button
                  type="button"
                  onClick={deactivateAppOffline24h}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.14] bg-[#040714] px-4 py-2.5 text-xs font-semibold text-[#CACACA] hover:border-white/40 hover:text-white"
                >
                  Turn Off
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={Boolean(appOfflineSyncing) || items.length === 0 || !isOnline}
                onClick={() => void activateAppOffline24h()}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-[#F9F9F9] px-5 py-2.5 text-sm font-bold text-[#040714] shadow-lg transition-transform hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CloudDownload className="h-4 w-4" aria-hidden="true" />
                <span>
                  {appOfflineSyncing
                    ? 'Preparing Offline...'
                    : 'Save App for 24h Offline'}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Active In-Progress Downloads */}
      {activeDownloadList.length > 0 && (
        <section aria-label="Saving for offline" className="mt-8 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            Saving to Device...
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeDownloadList.map((dl) => (
              <div
                key={dl.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#0483EE]/40 bg-[#0E111E] p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-white">
                    {dl.displayTitle} · {dl.partLabel}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-[#38BDF8] tabular-nums">
                    <span>
                      {dl.totalBytes > 0
                        ? `${formatBytes(dl.loadedBytes)} / ${formatBytes(dl.totalBytes)}`
                        : `${formatBytes(dl.loadedBytes)} saved`}
                    </span>
                    <span>{dl.totalBytes > 0 ? `${dl.percent}%` : 'Saving...'}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-[#0483EE] transition-all"
                      style={{
                        width: `${dl.totalBytes > 0 ? dl.percent : 35}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancelOfflineDownload(dl.pathname, dl.partIndex)}
                  aria-label={`Cancel saving ${dl.displayTitle}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-[#040714] text-[#CACACA] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Saved Offline Movies & Episodes */}
      <section aria-labelledby="saved-vault-heading" className="mt-10">
        <h2
          id="saved-vault-heading"
          className="mb-5 font-display text-xl font-bold text-[#F9F9F9]"
        >
          Saved Movies &amp; Episodes ({offlineMovies.length})
        </h2>

        {offlineMovies.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.1] bg-[#0E111E] px-6 py-16 text-center">
            <CloudDownload
              className="mx-auto mb-3 h-10 w-10 text-[#0483EE]/70"
              aria-hidden="true"
            />
            <p className="font-display text-lg font-semibold text-white">
              No movies saved for offline viewing yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#A4A9B8]">
              Open any movie or series and tap &ldquo;Save Offline (24h)&rdquo; to watch inside the app later with no internet.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-[#0063E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
            >
              Browse Movies &amp; Series
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {offlineMovies.map((movie) => {
              const savedParts = Object.values(movie.parts).sort(
                (a, b) => a.partNumber - b.partNumber,
              );
              const totalSize = savedParts.reduce((sum, p) => sum + p.sizeBytes, 0);
              const firstPart = savedParts[0];
              const watchUrl =
                movie.totalParts > 1 && firstPart
                  ? `${movie.pathname}/part/${firstPart.partNumber}`
                  : movie.pathname;

              return (
                <div
                  key={movie.pathname}
                  className="rounded-2xl border border-white/[0.12] bg-[#0E111E] p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-4">
                      <Link
                        to={watchUrl}
                        state={{autoResume: true}}
                        className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-[#040714] sm:w-36"
                      >
                        <PosterImage
                          src={movie.posterUrl}
                          alt={movie.displayTitle}
                          title={movie.displayTitle}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8] tabular-nums">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{formatOfflineCountdown(movie.expiresAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatBytes(totalSize)}</span>
                        </div>
                        <h3 className="mt-1 truncate font-display text-lg font-bold text-white">
                          {movie.displayTitle}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#A4A9B8] tabular-nums">
                          {movie.vjName} · {savedParts.length}{' '}
                          {movie.contentType === 'series' ? 'episode' : 'part'}
                          {savedParts.length === 1 ? '' : 's'} saved
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <Link
                        to={watchUrl}
                        state={{autoResume: true}}
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#F9F9F9] px-5 py-2 text-xs font-bold text-[#040714] hover:bg-white"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        <span>Watch Offline</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeOfflineMovieItem(movie.pathname)}
                        aria-label={`Remove ${movie.displayTitle} from offline storage`}
                        className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#040714] px-3 text-xs font-medium text-[#CACACA] hover:border-white/40 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Per-part rows */}
                  <div className="mt-4 grid gap-2 border-t border-white/[0.08] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {savedParts.map((part) => {
                      const partUrl =
                        movie.totalParts > 1
                          ? `${movie.pathname}/part/${part.partNumber}`
                          : movie.pathname;
                      const savedProg = getSavedPartProgress(
                        movie.pathname,
                        part.partIndex,
                      );
                      return (
                        <div
                          key={part.partIndex}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#040714] px-3 py-2.5"
                        >
                          <Link
                            to={partUrl}
                            state={{autoResume: true}}
                            className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-white"
                          >
                            <Play
                              className="h-3.5 w-3.5 shrink-0 fill-current text-[#38BDF8]"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#F9F9F9]">
                                {part.label}
                              </p>
                              <p className="flex items-center gap-1.5 text-[11px] text-[#A4A9B8] tabular-nums">
                                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>{formatOfflineCountdown(part.expiresAt)}</span>
                                <span>· {formatBytes(part.sizeBytes)}</span>
                                {savedProg && savedProg.currentTime >= 5 && (
                                  <span className="text-[#38BDF8]">
                                    · {formatPlaybackTime(savedProg.currentTime)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              void removeOfflinePartItem(movie.pathname, part.partIndex)
                            }
                            aria-label={`Remove ${part.label} from offline storage`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#A4A9B8] hover:bg-white/[0.06] hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
