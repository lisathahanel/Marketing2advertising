import type { VideoItem } from '../types';

const WATCHLIST_KEY = 'm2a_watchlist_v1';
const HISTORY_KEY = 'm2a_watch_history_v1';
const DAILY_STREAK_KEY = 'm2a_daily_watch_v1';

const MAX_WATCHLIST = 60;
const MAX_HISTORY = 30;

export interface DailyWatchStats {
  date: string;
  count: number;
}

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWatchlistKey(video: VideoItem): string {
  return `${video.source}:${video.id}`;
}

export function loadWatchlist(): VideoItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is VideoItem =>
        Boolean(v) && typeof v.id === 'string' && typeof v.source === 'string' && typeof v.title === 'string'
    );
  } catch {
    return [];
  }
}

export function persistWatchlist(items: VideoItem[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items.slice(0, MAX_WATCHLIST)));
  } catch {
    // ignore storage quota errors
  }
}

export function toggleWatchlistItem(current: VideoItem[], video: VideoItem): {
  next: VideoItem[];
  added: boolean;
} {
  const key = getWatchlistKey(video);
  const exists = current.some((v) => getWatchlistKey(v) === key);
  const next = exists
    ? current.filter((v) => getWatchlistKey(v) !== key)
    : [video, ...current].slice(0, MAX_WATCHLIST);
  persistWatchlist(next);
  return { next, added: !exists };
}

export function loadWatchHistory(): VideoItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is VideoItem =>
        Boolean(v) && typeof v.id === 'string' && typeof v.source === 'string' && typeof v.title === 'string'
    );
  } catch {
    return [];
  }
}

export function recordWatchHistoryItem(current: VideoItem[], video: VideoItem): VideoItem[] {
  const key = getWatchlistKey(video);
  const next = [video, ...current.filter((v) => getWatchlistKey(v) !== key)].slice(
    0,
    MAX_HISTORY
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export function clearWatchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function loadDailyWatchStats(): DailyWatchStats {
  const today = todayIsoDate();
  try {
    const raw = localStorage.getItem(DAILY_STREAK_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Partial<DailyWatchStats>;
    if (parsed.date === today && typeof parsed.count === 'number' && parsed.count >= 0) {
      return { date: today, count: parsed.count };
    }
    return { date: today, count: 0 };
  } catch {
    return { date: today, count: 0 };
  }
}

export function incrementDailyWatchStats(current: DailyWatchStats): DailyWatchStats {
  const today = todayIsoDate();
  const base = current.date === today ? current.count : 0;
  const next: DailyWatchStats = { date: today, count: base + 1 };
  try {
    localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
