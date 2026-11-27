import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Download,
  Eye,
  Film,
  HeartHandshake,
  Loader2,
  Maximize2,
  Play,
  RefreshCw,
  Shuffle,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { EMOJI_OPTIONS, formatM2ACount } from '../lib/engagement';
import {
  formatTimeLeft,
  getOfflinePlaybackAssets,
  isOfflineDownloadable,
  type OfflineSavedEntry,
} from '../lib/offlineVault';
import { AdSenseSlot } from './AdSenseSlot';
import type { EmojiKey, VideoEngagement, VideoItem } from '../types';

interface PlayerModalProps {
  video: VideoItem | null;
  playlist: VideoItem[];
  skipNotice: string | null;
  isOnline: boolean;
  metaBlocked: { instagram: boolean; facebook: boolean };
  offlineMap: Record<string, OfflineSavedEntry>;
  engagementMap?: Record<string, VideoEngagement>;
  watchlistKeys?: Set<string>;
  savingKey: string | null;
  onToggleWatchlist?: (video: VideoItem) => void;
  onToggleOfflineSave: (video: VideoItem) => void;
  onJumpToOfflineVault: () => void;
  onMarkMetaBlocked: (source: 'instagram' | 'facebook') => void;
  onRecheckMeta: () => void;
  onRecordView?: (video: VideoItem) => void;
  onReactEmoji?: (video: VideoItem, emoji: EmojiKey) => void;
  onSupportCreator?: (video: VideoItem) => void;
  onRefreshFeed?: () => void;
  refreshingFeed?: boolean;
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
  onSelectCreator: (handle: string) => void;
  onAutoSkip: (video: VideoItem) => void;
}

type QueueFilter = 'all' | 'shorts' | 'same_app' | 'offline';
type StageLayout = 'split' | 'cinema';

const AUTO_NEXT_STORAGE_KEY = 'm2a_autonext_v1';

function loadAutoNextPref(): boolean {
  try {
    const val = localStorage.getItem(AUTO_NEXT_STORAGE_KEY);
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

function getSafeEmbedUrl(video: VideoItem): string {
  const origin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  if (video.source === 'youtube') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(video.id)) return '';
    return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${
      origin ? `&origin=${origin}` : ''
    }`;
  }
  if (video.source === 'tiktok') {
    if (!/^\d{15,22}$/.test(video.id)) return '';
    return `https://www.tiktok.com/player/v1/${video.id}?music_info=1&description=1&autoplay=1`;
  }
  if (video.source === 'instagram') {
    if (!/^[a-zA-Z0-9_-]{5,30}$/.test(video.id)) return '';
    const isPost = video.canonicalUrl?.includes('/p/');
    return `https://www.instagram.com/${isPost ? 'p' : 'reel'}/${video.id}/embed/`;
  }
  if (video.source === 'facebook') {
    const rawHref =
      video.canonicalUrl ||
      (/^\d{5,25}$/.test(video.id)
        ? `https://www.facebook.com/watch/?v=${video.id}`
        : '');
    if (!rawHref) return '';
    try {
      const parsed = new URL(rawHref);
      const host = parsed.hostname.toLowerCase();
      if (
        parsed.protocol !== 'https:' ||
        (host !== 'facebook.com' &&
          host !== 'www.facebook.com' &&
          host !== 'm.facebook.com' &&
          host !== 'web.facebook.com' &&
          host !== 'fb.watch')
      ) {
        return '';
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        parsed.toString()
      )}&show_text=false&autoplay=1`;
    } catch {
      return '';
    }
  }
  if (video.source === 'tilvids') {
    if (!/^[0-9a-f-]{36}$/i.test(video.id)) return '';
    return `https://tilvids.com/videos/embed/${video.id}?autoplay=1`;
  }
  return '';
}

const SOURCE_LABELS: Record<VideoItem['source'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram Reel',
  facebook: 'Facebook',
  tilvids: 'TILvids',
  nasa: 'NASA',
};

export function PlayerModal({
  video,
  playlist,
  skipNotice,
  isOnline,
  metaBlocked,
  offlineMap,
  engagementMap = {},
  watchlistKeys,
  savingKey,
  onToggleWatchlist,
  onToggleOfflineSave,
  onJumpToOfflineVault,
  onMarkMetaBlocked,
  onRecheckMeta,
  onRecordView,
  onReactEmoji,
  onSupportCreator,
  onRefreshFeed,
  refreshingFeed = false,
  onClose,
  onSelectVideo,
  onSelectCreator,
  onAutoSkip,
}: PlayerModalProps) {
  const [nasaMp4, setNasaMp4] = useState<string>('');
  const [offlinePlayback, setOfflinePlayback] = useState<{
    videoUrl: string;
    thumbUrl?: string;
    entry: OfflineSavedEntry;
  } | null>(null);
  const [checkingOffline, setCheckingOffline] = useState(false);

  const [stageLayout, setStageLayout] = useState<StageLayout>('split');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const [autoNext, setAutoNext] = useState<boolean>(loadAutoNextPref);
  const [countdown, setCountdown] = useState<{ target: VideoItem; seconds: number } | null>(
    null
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tiktokReadyRef = useRef(false);
  const metaLoadedRef = useRef(false);
  const skippedRef = useRef<string>('');

  const videoKey = video ? `${video.source}:${video.id}` : '';
  const offlineEntry = videoKey ? offlineMap[videoKey] : undefined;
  const activeEngagement = videoKey ? engagementMap[videoKey] : undefined;
  const hasSavedOfflineCount = Object.keys(offlineMap).length > 0;

  const currentIndex = useMemo(() => {
    if (!video) return -1;
    return playlist.findIndex((item) => item.id === video.id && item.source === video.source);
  }, [playlist, video]);

  // Circular upcoming queue starting right after the active clip
  const circularQueue = useMemo(() => {
    if (!video || playlist.length === 0) return [];
    const startIdx = currentIndex >= 0 ? currentIndex : -1;
    const ordered: VideoItem[] = [];
    for (let offset = 1; offset <= playlist.length; offset++) {
      const idx = (startIdx + offset) % playlist.length;
      const item = playlist[idx];
      if (!item) continue;
      const k = `${item.source}:${item.id}`;
      if (k === videoKey || dismissedKeys.includes(k)) continue;
      ordered.push(item);
    }
    return ordered;
  }, [playlist, currentIndex, video, videoKey, dismissedKeys]);

  const filteredQueue = useMemo(() => {
    if (!video) return [];
    return circularQueue.filter((item) => {
      if (queueFilter === 'shorts') return item.isShort || item.source === 'tiktok' || item.source === 'instagram';
      if (queueFilter === 'same_app') return item.source === video.source;
      if (queueFilter === 'offline') return Boolean(offlineMap[`${item.source}:${item.id}`]);
      return true;
    });
  }, [circularQueue, queueFilter, video, offlineMap]);

  const effectiveQueue = filteredQueue.length > 0 ? filteredQueue : circularQueue;
  const heroNextVideo = effectiveQueue[0] ?? null;
  const remainingQueue = effectiveQueue.slice(1, stageLayout === 'cinema' ? 13 : 16);
  const prevVideo = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextVideo = heroNextVideo;

  const toggleAutoNext = useCallback(() => {
    setAutoNext((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_NEXT_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage failures
      }
      if (!next) setCountdown(null);
      return next;
    });
  }, []);

  const startAutoNextCountdown = useCallback(() => {
    if (!autoNext || !heroNextVideo) return;
    setCountdown((prev) => (prev ? prev : { target: heroNextVideo, seconds: 4 }));
  }, [autoNext, heroNextVideo]);

  useEffect(() => {
    if (!countdown) return;
    if (countdown.seconds <= 0) {
      const target = countdown.target;
      setCountdown(null);
      onSelectVideo(target);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev ? { ...prev, seconds: prev.seconds - 1 } : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onSelectVideo]);

  useEffect(() => {
    if (!video) return;
    onRecordView?.(video);
  }, [video?.id, video?.source, onRecordView]);

  useEffect(() => {
    if (!video) return;
    skippedRef.current = '';
    tiktokReadyRef.current = false;
    metaLoadedRef.current = false;
    setCountdown(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (isTyping) return;
      if ((e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') && nextVideo) {
        e.preventDefault();
        onSelectVideo(nextVideo);
      } else if ((e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') && prevVideo) {
        e.preventDefault();
        onSelectVideo(prevVideo);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [video, nextVideo, prevVideo, onClose, onSelectVideo]);

  // Load locally cached 24h offline MP4 if available
  useEffect(() => {
    if (!video) {
      setOfflinePlayback(null);
      return;
    }
    let active = true;
    let videoUrlToRevoke: string | null = null;
    let thumbUrlToRevoke: string | null = null;
    setCheckingOffline(true);

    void getOfflinePlaybackAssets(video).then((assets) => {
      if (!active) {
        if (assets?.videoUrl.startsWith('blob:')) URL.revokeObjectURL(assets.videoUrl);
        if (assets?.thumbUrl?.startsWith('blob:')) URL.revokeObjectURL(assets.thumbUrl);
        return;
      }
      if (assets) {
        videoUrlToRevoke = assets.videoUrl.startsWith('blob:') ? assets.videoUrl : null;
        thumbUrlToRevoke = assets.thumbUrl?.startsWith('blob:') ? assets.thumbUrl : null;
      }
      setOfflinePlayback(assets);
      setCheckingOffline(false);
    });

    return () => {
      active = false;
      if (videoUrlToRevoke) URL.revokeObjectURL(videoUrlToRevoke);
      if (thumbUrlToRevoke) URL.revokeObjectURL(thumbUrlToRevoke);
    };
  }, [video, offlineEntry?.savedAt]);

  // Real-time auto-skip & playback-ended listener for YouTube & TikTok (online only)
  useEffect(() => {
    if (!video || !isOnline || offlinePlayback) return;
    const currentKey = `${video.source}:${video.id}`;

    const triggerSkip = () => {
      if (skippedRef.current === currentKey) return;
      skippedRef.current = currentKey;
      onAutoSkip(video);
    };

    const onMessage = (e: MessageEvent) => {
      if (
        video.source === 'youtube' &&
        (e.origin === 'https://www.youtube-nocookie.com' ||
          e.origin === 'https://www.youtube.com')
      ) {
        try {
          const msg =
            typeof e.data === 'string'
              ? (JSON.parse(e.data) as Record<string, unknown>)
              : (e.data as Record<string, unknown>);
          if (!msg || typeof msg !== 'object') return;
          if (msg.event === 'onError') {
            triggerSkip();
          } else if (msg.event === 'onStateChange' && msg.info === 0) {
            startAutoNextCountdown();
          } else if (msg.event === 'infoDelivery' && msg.info && typeof msg.info === 'object') {
            const info = msg.info as Record<string, unknown>;
            const videoData = info.videoData as Record<string, unknown> | undefined;
            if (videoData?.errorCode) {
              triggerSkip();
            } else if (info.playerState === 0) {
              startAutoNextCountdown();
            }
          }
        } catch {
          // ignore non-JSON messages
        }
      }

      if (video.source === 'tiktok' && e.origin === 'https://www.tiktok.com') {
        const data = e.data as Record<string, unknown> | null;
        if (data && typeof data === 'object') {
          if (data.type === 'onPlayerReady' || data.type === 'onStateChange') {
            tiktokReadyRef.current = true;
          }
          if (data.type === 'onStateChange' && (data.value === 0 || data.value === 'ended')) {
            startAutoNextCountdown();
          }
          if (data.type === 'onError') {
            triggerSkip();
          }
        }
      }
    };

    window.addEventListener('message', onMessage);

    let ttWatchdog: ReturnType<typeof setTimeout> | undefined;
    if (video.source === 'tiktok') {
      ttWatchdog = setTimeout(() => {
        if (!tiktokReadyRef.current) {
          triggerSkip();
        }
      }, 5500);
    }

    let metaWatchdog: ReturnType<typeof setTimeout> | undefined;
    if (
      (video.source === 'instagram' || video.source === 'facebook') &&
      !metaBlocked[video.source]
    ) {
      const metaSrc = video.source;
      metaWatchdog = setTimeout(() => {
        if (!metaLoadedRef.current) {
          onMarkMetaBlocked(metaSrc);
          triggerSkip();
        }
      }, 4500);
    }

    return () => {
      window.removeEventListener('message', onMessage);
      if (ttWatchdog) clearTimeout(ttWatchdog);
      if (metaWatchdog) clearTimeout(metaWatchdog);
    };
  }, [
    video,
    isOnline,
    offlinePlayback,
    metaBlocked,
    onMarkMetaBlocked,
    onAutoSkip,
    startAutoNextCountdown,
  ]);

  useEffect(() => {
    if (!video || video.source !== 'nasa' || offlinePlayback || !isOnline) {
      setNasaMp4('');
      return;
    }
    let active = true;
    setNasaMp4('');
    fetch(`/api/nasa-video/${encodeURIComponent(video.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Not found'))))
      .then((d: { mp4Url?: string }) => {
        if (active && d.mp4Url) setNasaMp4(d.mp4Url);
        else if (active && isOnline) onAutoSkip(video);
      })
      .catch(() => {
        if (active && isOnline) onAutoSkip(video);
      });
    return () => {
      active = false;
    };
  }, [video, offlinePlayback, isOnline, onAutoSkip]);

  if (!video) return null;

  const embedUrl = getSafeEmbedUrl(video);
  const isBlockedMeta =
    (video.source === 'instagram' && metaBlocked.instagram) ||
    (video.source === 'facebook' && metaBlocked.facebook);
  const isVertical =
    video.isShort || video.source === 'tiktok' || video.source === 'instagram';
  const sourceLabel =
    video.source === 'youtube' && video.isShort
      ? 'YouTube Short'
      : SOURCE_LABELS[video.source];
  const canSaveOffline = isOfflineDownloadable(video) && (isOnline || Boolean(offlineEntry));
  const isSavingThis = savingKey === videoKey;

  const handleIframeLoad = () => {
    if (video.source === 'instagram' || video.source === 'facebook') {
      metaLoadedRef.current = true;
    }
    if (video.source === 'youtube' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: video.id }),
        'https://www.youtube-nocookie.com'
      );
    }
  };

  const handleShuffleQueue = () => {
    if (effectiveQueue.length === 0) return;
    const pick = effectiveQueue[Math.floor(Math.random() * effectiveQueue.length)];
    onSelectVideo(pick);
  };

  const handleDismissFromQueue = (item: VideoItem) => {
    const key = `${item.source}:${item.id}`;
    setDismissedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const isCinema = stageLayout === 'cinema';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${video.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[95vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl">
        {/* Top Watchroom Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-semibold text-zinc-100">
              {video.title}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
              <span
                className={
                  video.source === 'tiktok'
                    ? 'font-medium text-rose-400'
                    : 'font-medium text-zinc-200'
                }
              >
                {sourceLabel}
              </span>
              <span aria-hidden="true">·</span>
              {video.authorHandle ? (
                <button
                  type="button"
                  onClick={() => {
                    const handle = video.authorHandle!;
                    onClose();
                    onSelectCreator(handle);
                  }}
                  className="inline-flex items-center gap-1 text-zinc-200 hover:text-white hover:underline cursor-pointer truncate"
                >
                  <User className="h-3 w-3 shrink-0" />
                  <span>{video.author}</span>
                </button>
              ) : (
                <span className="truncate">{video.author}</span>
              )}
              <span aria-hidden="true">·</span>
              {offlinePlayback ? (
                <span className="text-emerald-400 font-medium tabular-nums">
                  Offline Vault · {formatTimeLeft(offlinePlayback.entry.expiresAt)}
                </span>
              ) : (
                <span>{skipNotice || 'M2A Cinema Watchroom'}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canSaveOffline && (
              <button
                type="button"
                disabled={isSavingThis}
                onClick={() => onToggleOfflineSave(video)}
                className={`hidden md:inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                  offlineEntry
                    ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-200 hover:bg-emerald-900/70'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {isSavingThis ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving 24h...</span>
                  </>
                ) : offlineEntry ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Saved 24h</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-rose-400" />
                    <span>Save 24h</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setStageLayout((m) => (m === 'split' ? 'cinema' : 'split'))}
              title={isCinema ? 'Switch to Split Deck view' : 'Switch to Wide Cinema view'}
              className={`hidden lg:inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isCinema
                  ? 'border-rose-600/60 bg-rose-600/15 text-rose-200'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              {isCinema ? (
                <>
                  <Columns2 className="h-3.5 w-3.5" />
                  <span>Split Deck</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Cinema Stage</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => prevVideo && onSelectVideo(prevVideo)}
              disabled={!prevVideo}
              aria-label="Previous video (P or Left Arrow)"
              title="Previous (P)"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => nextVideo && onSelectVideo(nextVideo)}
              disabled={!nextVideo}
              aria-label="Next video (N or Right Arrow)"
              title="Next (N)"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Stage + M2A Up Next Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          <div
            className={`${
              isCinema ? 'lg:col-span-12' : 'lg:col-span-8'
            } relative flex flex-col items-center justify-center bg-[#09090B] p-4 sm:p-6`}
          >
            {offlinePlayback ? (
              <div className="w-full max-w-4xl aspect-video overflow-hidden rounded-xl border border-emerald-500/30 bg-black flex items-center justify-center">
                <video
                  key={offlinePlayback.videoUrl}
                  src={offlinePlayback.videoUrl}
                  poster={offlinePlayback.thumbUrl || video.thumbnail || undefined}
                  controls
                  autoPlay
                  playsInline
                  onEnded={startAutoNextCountdown}
                  className="h-full w-full object-contain bg-black"
                />
              </div>
            ) : !isOnline && !checkingOffline ? (
              <div className="flex aspect-video w-full max-w-4xl flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 text-center">
                <WifiOff className="h-8 w-8 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  No internet connection
                </h3>
                <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
                  {isOfflineDownloadable(video)
                    ? 'This video was not saved offline before you lost connection.'
                    : `${sourceLabel} streams require an active internet connection. Watch your saved 24-hour NASA & TILvids clips offline instead.`}
                </p>
                {hasSavedOfflineCount && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpToOfflineVault();
                    }}
                    className="mt-1 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                  >
                    Open 24h Offline Videos
                  </button>
                )}
              </div>
            ) : video.source === 'nasa' ? (
              <div className="w-full max-w-4xl aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black flex items-center justify-center">
                {nasaMp4 ? (
                  <video
                    key={nasaMp4}
                    src={nasaMp4}
                    poster={video.thumbnail || undefined}
                    controls
                    autoPlay
                    playsInline
                    onEnded={startAutoNextCountdown}
                    onError={() => onAutoSkip(video)}
                    className="h-full w-full object-contain bg-black"
                  />
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500" />
                )}
              </div>
            ) : isBlockedMeta ? (
              <div className="flex aspect-video w-full max-w-4xl flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 text-center">
                <WifiOff className="h-8 w-8 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  {sourceLabel} unavailable on this network
                </h3>
                <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
                  {sourceLabel} appears blocked in your region or network. YouTube, TikTok, TILvids, and NASA remain ready to watch.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {nextVideo && (
                    <button
                      type="button"
                      onClick={() => onSelectVideo(nextVideo)}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                    >
                      Play Next Available Video
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onRecheckMeta}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Recheck Access
                  </button>
                </div>
              </div>
            ) : embedUrl ? (
              isVertical ? (
                <div className="w-full max-w-[360px] aspect-[9/16] max-h-[68vh] overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <iframe
                    ref={iframeRef}
                    key={`${video.source}-${video.id}`}
                    src={embedUrl}
                    title={video.title}
                    onLoad={handleIframeLoad}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div className="w-full max-w-4xl aspect-video overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <iframe
                    ref={iframeRef}
                    key={`${video.source}-${video.id}`}
                    src={embedUrl}
                    title={video.title}
                    onLoad={handleIframeLoad}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )
            ) : (
              <div className="flex aspect-video w-full max-w-4xl flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Film className="h-8 w-8" />
                <p className="text-sm">Skipping unavailable video...</p>
              </div>
            )}

            {/* Watchroom Per-Device Views, Emoji Reactions & Support Creator Bar */}
            <div className="mt-3.5 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#121215] px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-200 tabular-nums"
                  title="Unique in-app views recorded per device"
                >
                  <Eye className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span>
                    {formatM2ACount(activeEngagement?.views || 0)}{' '}
                    {(activeEngagement?.views || 0) === 1 ? 'view' : 'views'}
                  </span>
                </div>

                <span className="h-3.5 w-px bg-zinc-800" aria-hidden="true" />

                <div
                  role="group"
                  aria-label="Emoji reactions"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {EMOJI_OPTIONS.map((opt) => {
                    const count = activeEngagement?.reactions?.[opt.key] || 0;
                    const isPicked = activeEngagement?.userEmoji === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => onReactEmoji?.(video, opt.key)}
                        aria-pressed={isPicked}
                        aria-label={`${opt.label} reaction (${count})`}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isPicked
                            ? 'border-rose-500/60 bg-rose-600/20 text-white'
                            : 'border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                        }`}
                      >
                        <span aria-hidden="true">{opt.glyph}</span>
                        {count > 0 && (
                          <span className="text-[11px] font-medium tabular-nums">
                            {formatM2ACount(count)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onToggleWatchlist && (
                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(video)}
                    aria-pressed={watchlistKeys?.has(videoKey)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      watchlistKeys?.has(videoKey)
                        ? 'border-zinc-500 bg-zinc-800 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {watchlistKeys?.has(videoKey) ? (
                      <BookmarkCheck className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{watchlistKeys?.has(videoKey) ? 'Watchlisted' : 'Watchlist'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onSupportCreator) {
                      onSupportCreator(video);
                    } else if (video.authorHandle) {
                      const handle = video.authorHandle;
                      onClose();
                      onSelectCreator(handle);
                    }
                  }}
                  title={
                    video.authorHandle
                      ? `Follow & watch videos from @${video.authorHandle}`
                      : `Watch more videos from ${video.author}`
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-600/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <HeartHandshake className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span>
                    {video.authorHandle ? `Support @${video.authorHandle}` : 'Support Creator'}
                  </span>
                </button>
              </div>
            </div>

            {/* Auto-Next Countdown Bar when video completes */}
            {countdown && (
              <div className="mt-3 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-[#121215] px-4 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-200 truncate">
                    <span className="text-rose-400 tabular-nums">
                      Up Next in {countdown.seconds}s
                    </span>
                    <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                      ·
                    </span>
                    <span>{countdown.target.title}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = countdown.target;
                      setCountdown(null);
                      onSelectVideo(target);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Play Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upgraded M2A Up Next Cinema Queue */}
          <aside
            aria-label="M2A Up Next queue"
            className={`${
              isCinema
                ? 'lg:col-span-12 border-t border-zinc-800/80'
                : 'lg:col-span-4 border-t lg:border-t-0 lg:border-l border-zinc-800/80'
            } p-4 sm:p-5 flex flex-col gap-3.5 bg-[#121215]`}
          >
            {/* Queue Header + Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-display text-sm font-semibold text-zinc-100">Up Next</h3>
                <span className="text-[11px] text-zinc-500 tabular-nums">
                  {effectiveQueue.length} queued
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleAutoNext}
                  aria-pressed={autoNext}
                  title="Automatically advance to the next video when playback finishes"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    autoNext
                      ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <span>Auto-Next {autoNext ? 'On' : 'Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShuffleQueue}
                  disabled={effectiveQueue.length === 0}
                  title="Jump to a random queued video"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Shuffle className="h-3 w-3" />
                  <span>Shuffle</span>
                </button>
                {onRefreshFeed && isOnline && (
                  <button
                    type="button"
                    onClick={onRefreshFeed}
                    disabled={refreshingFeed}
                    title="Load fresh unseen videos into Up Next"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshingFeed ? 'animate-spin' : ''}`} />
                    <span>Fresh</span>
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Queue Filter Bar */}
            <div
              role="group"
              aria-label="Filter Up Next queue"
              className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-zinc-800 bg-[#09090B] p-1"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'shorts', label: 'Shorts' },
                  { id: 'same_app', label: SOURCE_LABELS[video.source] },
                  ...(hasSavedOfflineCount ? [{ id: 'offline', label: '24h Offline' }] : []),
                ] as { id: QueueFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQueueFilter(tab.id)}
                  className={`flex-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    queueFilter === tab.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredQueue.length === 0 && queueFilter !== 'all' && (
              <p className="text-[11px] text-zinc-500">
                No {queueFilter === 'shorts' ? 'Shorts' : queueFilter === 'same_app' ? SOURCE_LABELS[video.source] : '24h Offline'} clips in this batch — showing all queued clips.
              </p>
            )}

            {/* Featured "01 · Playing Next" Hero Card */}
            {heroNextVideo ? (
              <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/75 p-2.5 transition-colors hover:border-zinc-600">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <span className="text-rose-400 tabular-nums">01 · Playing Next</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectVideo(heroNextVideo)}
                      className="text-zinc-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Play Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissFromQueue(heroNextVideo)}
                      aria-label={`Remove ${heroNextVideo.title} from Up Next`}
                      className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectVideo(heroNextVideo)}
                  className="group flex w-full items-start gap-3 text-left cursor-pointer"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    {heroNextVideo.thumbnail ? (
                      <img
                        src={heroNextVideo.thumbnail}
                        alt={heroNextVideo.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                        <Film className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100 tabular-nums">
                      {heroNextVideo.duration}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-snug text-zinc-100 line-clamp-2 group-hover:text-white">
                      {heroNextVideo.title}
                    </p>
                    <p className="mt-1.5 text-[11px] text-zinc-400 truncate">
                      {SOURCE_LABELS[heroNextVideo.source]} · {heroNextVideo.author}
                      {offlineMap[`${heroNextVideo.source}:${heroNextVideo.id}`]
                        ? ' · 24h Offline'
                        : ''}
                    </p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center text-xs text-zinc-400">
                No queued clips left. Tap Fresh to load new videos.
              </div>
            )}

            {/* Watchroom Companion Ad Placement */}
            {isOnline && !offlinePlayback && (
              <AdSenseSlot
                isOnline={isOnline}
                format="auto"
                minHeightClass={isCinema ? 'min-h-[96px]' : 'min-h-[140px]'}
              />
            )}

            {/* Editorial Numbered Queue Rows (02, 03, ...) */}
            <div
              className={
                isCinema
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[34vh] overflow-y-auto pr-1'
                  : 'flex flex-col gap-1.5 overflow-y-auto max-h-[42vh] pr-1'
              }
            >
              {remainingQueue.map((item, idx) => {
                const rowKey = `${item.source}:${item.id}`;
                const itemSaved = offlineMap[rowKey];
                const isItemSaving = savingKey === rowKey;
                const itemCanSave = isOfflineDownloadable(item) && (isOnline || Boolean(itemSaved));
                const numLabel = String(idx + 2).padStart(2, '0');

                return (
                  <div
                    key={rowKey}
                    className="group flex items-start gap-2 rounded-lg p-2 hover:bg-zinc-800/55 transition-colors"
                  >
                    <span className="mt-1 w-5 shrink-0 text-[11px] font-medium text-zinc-500 tabular-nums">
                      {numLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectVideo(item)}
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left cursor-pointer"
                    >
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                            <Film className="h-4 w-4 text-zinc-500" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-zinc-100 tabular-nums">
                          {item.duration}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug text-zinc-100 line-clamp-2 group-hover:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-400 truncate">
                          {SOURCE_LABELS[item.source]} · {item.author}
                          {itemSaved ? ' · 24h Offline' : ''}
                        </p>
                      </div>
                    </button>

                    <div className="flex flex-col items-center gap-1 shrink-0 opacity-75 group-hover:opacity-100 transition-opacity">
                      {itemCanSave && (
                        <button
                          type="button"
                          disabled={isItemSaving}
                          onClick={() => onToggleOfflineSave(item)}
                          aria-label={
                            itemSaved
                              ? `Remove ${item.title} from 24h offline`
                              : `Save ${item.title} for 24h offline`
                          }
                          title={itemSaved ? 'Saved 24h offline' : 'Save 24h offline'}
                          className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                            itemSaved
                              ? 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {isItemSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : itemSaved ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDismissFromQueue(item)}
                        aria-label={`Remove ${item.title} from queue`}
                        title="Remove from queue"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
