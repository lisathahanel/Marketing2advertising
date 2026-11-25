import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {MovieItem, MoviePart} from '../lib/bloggerParser.ts';
import {MOVIE_GENRES, VJ_LIST} from '../lib/constants.ts';
import {
  clearAllOfflineVideos,
  clearAppOfflineStatus,
  enableFullAppOffline24h,
  getAppOfflineStatus,
  listOfflineMoviesSync,
  purgeExpiredOfflineItems,
  removeOfflineMovie,
  removeOfflinePart,
  saveVideoPartOffline,
  type AppOfflineStatus,
  type OfflineSavedMovie,
} from '../lib/offlineStorage.ts';
import {
  CLIENT_CACHE_TTL_MS,
  getStoredSnapshotSync,
  loadCatalogue,
  loadStaticPages,
  normalizeMoviePathname,
} from '../services/bloggerFeed.ts';

export interface PartPlaybackProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface WatchHistoryEntry {
  pathname: string;
  displayTitle: string;
  posterUrl: string;
  vjName: string;
  contentType: 'movie' | 'series';
  partIndex: number;
  partLabel: string;
  totalParts: number;
  watchedAt: number;
  startedPlayback?: boolean;
  currentTime?: number;
  duration?: number;
  partProgress?: Record<number, PartPlaybackProgress>;
}

export interface RecordWatchOptions {
  startedPlayback?: boolean;
  explicitPartSelection?: boolean;
}

export interface ActiveOfflineDownload {
  key: string;
  pathname: string;
  displayTitle: string;
  partIndex: number;
  partLabel: string;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
}

interface CatalogueContextValue {
  items: MovieItem[];
  genres: string[];
  vjs: string[];
  loading: boolean;
  error: string | null;
  refreshCatalogue: () => Promise<void>;
  upsertMovieItem: (movie: MovieItem) => void;
  history: WatchHistoryEntry[];
  recordWatch: (
    movie: MovieItem,
    partIndex: number,
    partLabel: string,
    options?: RecordWatchOptions,
  ) => void;
  savePlaybackProgress: (
    movie: MovieItem,
    partIndex: number,
    partLabel: string,
    currentTime: number,
    duration: number,
  ) => void;
  getSavedPartProgress: (
    pathname: string,
    partIndex: number,
  ) => PartPlaybackProgress | null;
  removeHistoryItem: (pathname: string) => void;
  clearHistory: () => void;
  // 24-Hour Offline Vault & App Offline Mode
  offlineMovies: OfflineSavedMovie[];
  activeDownloads: Record<string, ActiveOfflineDownload>;
  offlineError: string | null;
  clearOfflineError: () => void;
  appOfflineStatus: AppOfflineStatus | null;
  appOfflineSyncing: {done: number; total: number} | null;
  savePartForOffline: (movie: MovieItem, part: MoviePart) => Promise<void>;
  saveAllPartsForOffline: (movie: MovieItem) => Promise<void>;
  cancelOfflineDownload: (pathname: string, partIndex: number) => void;
  removeOfflinePartItem: (pathname: string, partIndex: number) => Promise<void>;
  removeOfflineMovieItem: (pathname: string) => Promise<void>;
  clearOfflineVault: () => Promise<void>;
  activateAppOffline24h: () => Promise<void>;
  deactivateAppOffline24h: () => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const HISTORY_STORAGE_KEY = 'firimu_watch_history_v1';
const MAX_HISTORY_ITEMS = 16;

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

function readStoredHistory(): WatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: WatchHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatRemainingTime(currentTime: number, duration: number): string {
  if (!Number.isFinite(duration) || duration <= 0) return '';
  const remaining = Math.max(0, Math.floor(duration - currentTime));
  if (remaining < 60) return `${remaining}s left`;
  const mins = Math.floor(remaining / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m left` : `${hrs}h left`;
  }
  return `${mins}m left`;
}

export function makeDownloadKey(pathname: string, partIndex: number): string {
  return `${pathname}#${partIndex}`;
}

export const CatalogueProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const initialSnapshotRef = useRef(getStoredSnapshotSync());
  const [items, setItems] = useState<MovieItem[]>(
    () => initialSnapshotRef.current?.items ?? [],
  );
  const [genres, setGenres] = useState<string[]>(
    () => initialSnapshotRef.current?.genres ?? [...MOVIE_GENRES],
  );
  const [vjs, setVjs] = useState<string[]>(
    () => initialSnapshotRef.current?.vjs ?? [...VJ_LIST],
  );
  const [loading, setLoading] = useState(
    () => !initialSnapshotRef.current?.items?.length,
  );
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WatchHistoryEntry[]>(() =>
    readStoredHistory(),
  );
  const [offlineMovies, setOfflineMovies] = useState<OfflineSavedMovie[]>(() =>
    listOfflineMoviesSync(),
  );
  const [activeDownloads, setActiveDownloads] = useState<
    Record<string, ActiveOfflineDownload>
  >({});
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [appOfflineStatus, setAppOfflineStatus] =
    useState<AppOfflineStatus | null>(() => getAppOfflineStatus());
  const [appOfflineSyncing, setAppOfflineSyncing] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const downloadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const hasAnyItemsRef = useRef(items.length > 0);
  hasAnyItemsRef.current = items.length > 0;

  const upsertMovieItem = useCallback((movie: MovieItem) => {
    const targetNorm = normalizeMoviePathname(movie.pathname);
    setItems((prev) => {
      if (
        prev.some(
          (existing) => normalizeMoviePathname(existing.pathname) === targetNorm,
        )
      ) {
        return prev;
      }
      return [movie, ...prev];
    });
  }, []);

  const fetchCatalogue = useCallback(async (force = false) => {
    const showLoadingSpinner = !hasAnyItemsRef.current;
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError(null);
    try {
      const snapshot = await loadCatalogue(force);
      setItems(snapshot.items);
      setGenres(snapshot.genres);
      setVjs(snapshot.vjs);
    } catch (err) {
      if (!hasAnyItemsRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load movies and series right now.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = initialSnapshotRef.current;
    const isFresh =
      initial && Date.now() - initial.fetchedAt < CLIENT_CACHE_TTL_MS;
    if (isFresh) {
      return;
    }
    void fetchCatalogue(false);
  }, [fetchCatalogue]);

  // Purge any expired 24-hour offline entries on mount and every 60 seconds
  useEffect(() => {
    const syncExpiry = async () => {
      const cleaned = await purgeExpiredOfflineItems();
      setOfflineMovies(cleaned);
      setAppOfflineStatus(getAppOfflineStatus());
    };
    void syncExpiry();
    const timer = window.setInterval(() => {
      void syncExpiry();
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Global Cmd/Ctrl+K search overlay shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const recordWatch = useCallback(
    (
      movie: MovieItem,
      partIndex: number,
      partLabel: string,
      options?: RecordWatchOptions,
    ) => {
      setHistory((prev) => {
        const existing = prev.find((h) => h.pathname === movie.pathname);
        const shouldPreserveSavedPart =
          existing &&
          !options?.explicitPartSelection &&
          !options?.startedPlayback &&
          (existing.partIndex > 1 ||
            existing.startedPlayback ||
            (existing.currentTime ?? 0) > 5);

        const resolvedPartIndex = shouldPreserveSavedPart
          ? existing.partIndex
          : partIndex;
        const resolvedPartLabel = shouldPreserveSavedPart
          ? existing.partLabel
          : partLabel;

        const savedForPart = existing?.partProgress?.[resolvedPartIndex];
        const resolvedTime =
          savedForPart?.currentTime ??
          (existing && existing.partIndex === resolvedPartIndex
            ? existing.currentTime
            : undefined);
        const resolvedDuration =
          savedForPart?.duration ??
          (existing && existing.partIndex === resolvedPartIndex
            ? existing.duration
            : undefined);

        const nextEntry: WatchHistoryEntry = {
          pathname: movie.pathname,
          displayTitle: movie.displayTitle,
          posterUrl: movie.posterUrl,
          vjName: movie.vjName,
          contentType: movie.contentType,
          partIndex: resolvedPartIndex,
          partLabel: resolvedPartLabel,
          totalParts: movie.parts.length,
          watchedAt: Date.now(),
          startedPlayback:
            options?.startedPlayback ?? existing?.startedPlayback ?? false,
          currentTime: resolvedTime,
          duration: resolvedDuration,
          partProgress: existing?.partProgress,
        };
        const filtered = prev.filter((h) => h.pathname !== movie.pathname);
        const updated = [nextEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        persistHistory(updated);
        return updated;
      });
    },
    [],
  );

  const savePlaybackProgress = useCallback(
    (
      movie: MovieItem,
      partIndex: number,
      partLabel: string,
      currentTime: number,
      duration: number,
    ) => {
      if (!Number.isFinite(currentTime) || currentTime < 0) return;
      const safeDuration =
        Number.isFinite(duration) && duration > 0 ? duration : 0;
      const clampedTime =
        safeDuration > 0 ? Math.min(currentTime, safeDuration) : currentTime;

      setHistory((prev) => {
        const existing = prev.find((h) => h.pathname === movie.pathname);
        const nextPartProgress: Record<number, PartPlaybackProgress> = {
          ...(existing?.partProgress ?? {}),
          [partIndex]: {
            currentTime: clampedTime,
            duration: safeDuration,
            updatedAt: Date.now(),
          },
        };

        const nextEntry: WatchHistoryEntry = {
          pathname: movie.pathname,
          displayTitle: movie.displayTitle,
          posterUrl: movie.posterUrl,
          vjName: movie.vjName,
          contentType: movie.contentType,
          partIndex,
          partLabel,
          totalParts: movie.parts.length,
          watchedAt: Date.now(),
          startedPlayback: true,
          currentTime: clampedTime,
          duration: safeDuration,
          partProgress: nextPartProgress,
        };

        const filtered = prev.filter((h) => h.pathname !== movie.pathname);
        const updated = [nextEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        persistHistory(updated);
        return updated;
      });
    },
    [],
  );

  const getSavedPartProgress = useCallback(
    (pathname: string, partIndex: number): PartPlaybackProgress | null => {
      const entry = history.find((h) => h.pathname === pathname);
      if (!entry) return null;
      const partSaved = entry.partProgress?.[partIndex];
      if (partSaved && partSaved.currentTime > 0) {
        return partSaved;
      }
      if (
        entry.partIndex === partIndex &&
        typeof entry.currentTime === 'number' &&
        entry.currentTime > 0
      ) {
        return {
          currentTime: entry.currentTime,
          duration: entry.duration ?? 0,
          updatedAt: entry.watchedAt,
        };
      }
      return null;
    },
    [history],
  );

  const removeHistoryItem = useCallback((pathname: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.pathname !== pathname);
      persistHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const savePartForOffline = useCallback(
    async (movie: MovieItem, part: MoviePart) => {
      const key = makeDownloadKey(movie.pathname, part.index);
      if (downloadControllersRef.current.has(key)) return;

      setOfflineError(null);
      const controller = new AbortController();
      downloadControllersRef.current.set(key, controller);

      setActiveDownloads((prev) => ({
        ...prev,
        [key]: {
          key,
          pathname: movie.pathname,
          displayTitle: movie.displayTitle,
          partIndex: part.index,
          partLabel: part.label,
          percent: 0,
          loadedBytes: 0,
          totalBytes: 0,
        },
      }));

      try {
        await saveVideoPartOffline(
          movie,
          part,
          (prog) => {
            setActiveDownloads((prev) => {
              const current = prev[key];
              if (!current) return prev;
              return {
                ...prev,
                [key]: {
                  ...current,
                  percent: prog.percent,
                  loadedBytes: prog.loadedBytes,
                  totalBytes: prog.totalBytes,
                },
              };
            });
          },
          controller.signal,
        );
        setOfflineMovies(listOfflineMoviesSync());
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setOfflineError(
            err instanceof Error
              ? err.message
              : 'Could not save video for offline viewing.',
          );
        }
      } finally {
        downloadControllersRef.current.delete(key);
        setActiveDownloads((prev) => {
          const next = {...prev};
          delete next[key];
          return next;
        });
      }
    },
    [],
  );

  const saveAllPartsForOffline = useCallback(
    async (movie: MovieItem) => {
      const videoParts = movie.parts.filter((p) => p.sourceType === 'video');
      for (const part of videoParts) {
        const existing = listOfflineMoviesSync()
          .find((m) => m.pathname === movie.pathname)
          ?.parts?.[part.index];
        if (existing && existing.expiresAt > Date.now()) continue;
        await savePartForOffline(movie, part);
      }
    },
    [savePartForOffline],
  );

  const cancelOfflineDownload = useCallback(
    (pathname: string, partIndex: number) => {
      const key = makeDownloadKey(pathname, partIndex);
      const controller = downloadControllersRef.current.get(key);
      if (controller) {
        controller.abort();
        downloadControllersRef.current.delete(key);
      }
      setActiveDownloads((prev) => {
        const next = {...prev};
        delete next[key];
        return next;
      });
    },
    [],
  );

  const removeOfflinePartItem = useCallback(
    async (pathname: string, partIndex: number) => {
      const updated = await removeOfflinePart(pathname, partIndex);
      setOfflineMovies(updated);
    },
    [],
  );

  const removeOfflineMovieItem = useCallback(async (pathname: string) => {
    const updated = await removeOfflineMovie(pathname);
    setOfflineMovies(updated);
  }, []);

  const clearOfflineVault = useCallback(async () => {
    await clearAllOfflineVideos();
    setOfflineMovies([]);
  }, []);

  const activateAppOffline24h = useCallback(async () => {
    setOfflineError(null);
    setAppOfflineSyncing({done: 0, total: 1});
    try {
      const pages = await loadStaticPages(false).catch(() => []);
      const status = await enableFullAppOffline24h(
        items,
        pages,
        (done, total) => {
          setAppOfflineSyncing({done, total});
        },
      );
      setAppOfflineStatus(status);
    } catch (err) {
      setOfflineError(
        err instanceof Error
          ? err.message
          : 'Failed to prepare app for offline use.',
      );
    } finally {
      setAppOfflineSyncing(null);
    }
  }, [items]);

  const deactivateAppOffline24h = useCallback(() => {
    clearAppOfflineStatus();
    setAppOfflineStatus(null);
  }, []);

  const clearOfflineError = useCallback(() => setOfflineError(null), []);

  const refreshCatalogue = useCallback(async () => {
    await fetchCatalogue(true);
  }, [fetchCatalogue]);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <CatalogueContext.Provider
      value={{
        items,
        genres,
        vjs,
        loading,
        error,
        refreshCatalogue,
        upsertMovieItem,
        history,
        recordWatch,
        savePlaybackProgress,
        getSavedPartProgress,
        removeHistoryItem,
        clearHistory,
        offlineMovies,
        activeDownloads,
        offlineError,
        clearOfflineError,
        appOfflineStatus,
        appOfflineSyncing,
        savePartForOffline,
        saveAllPartsForOffline,
        cancelOfflineDownload,
        removeOfflinePartItem,
        removeOfflineMovieItem,
        clearOfflineVault,
        activateAppOffline24h,
        deactivateAppOffline24h,
        isSearchOpen,
        openSearch,
        closeSearch,
      }}
    >
      {children}
    </CatalogueContext.Provider>
  );
};

export function useCatalogue(): CatalogueContextValue {
  const ctx = useContext(CatalogueContext);
  if (!ctx) {
    throw new Error('useCatalogue must be used inside CatalogueProvider');
  }
  return ctx;
}
