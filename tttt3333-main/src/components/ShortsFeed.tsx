import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Film,
  HeartHandshake,
  Loader2,
  Play,
  User,
  WifiOff,
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

interface ShortsFeedProps {
  videos: VideoItem[];
  loadingMore: boolean;
  hasMore: boolean;
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
  onLoadMore: () => void;
  onMarkSeen: (video: VideoItem) => void;
  onSkipUnavailable: (video: VideoItem) => void;
  onSelectCreator: (handle: string) => void;
  onExitShorts: () => void;
}

function getSafeReelEmbedUrl(video: VideoItem): string {
  const origin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  if (video.source === 'youtube') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(video.id)) return '';
    return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&loop=1&playlist=${video.id}&enablejsapi=1${
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
    return `https://tilvids.com/videos/embed/${video.id}?autoplay=1&loop=1`;
  }
  return '';
}

function NasaShortPlayer({
  video,
  onError,
}: {
  video: VideoItem;
  onError: () => void;
}) {
  const [mp4Url, setMp4Url] = useState<string>('');

  useEffect(() => {
    let active = true;
    fetch(`/api/nasa-video/${encodeURIComponent(video.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unavailable'))))
      .then((d: { mp4Url?: string }) => {
        if (active && d.mp4Url) setMp4Url(d.mp4Url);
        else if (active) onError();
      })
      .catch(() => {
        if (active) onError();
      });
    return () => {
      active = false;
    };
  }, [video.id, onError]);

  if (!mp4Url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500" />
      </div>
    );
  }

  return (
    <video
      key={mp4Url}
      src={mp4Url}
      poster={video.thumbnail || undefined}
      controls
      autoPlay
      loop
      playsInline
      onError={onError}
      className="h-full w-full object-contain bg-black"
    />
  );
}

const SOURCE_LABELS: Record<VideoItem['source'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram Reel',
  facebook: 'Facebook',
  tilvids: 'TILvids',
  nasa: 'NASA',
};

type ShortsFeedSlide =
  | { kind: 'video'; video: VideoItem; videoIndex: number }
  | { kind: 'ad'; adCycle: number; afterShortCount: number };

// Balanced, policy-safe ad cadence: after 5 shorts, 10 shorts later (#15), then every 20 shorts (#35, #55, ...)
function getAdCycleAfterShort(oneBasedShortCount: number): number | null {
  if (oneBasedShortCount === 5) return 1;
  if (oneBasedShortCount === 15) return 2;
  if (oneBasedShortCount > 15 && (oneBasedShortCount - 15) % 20 === 0) {
    return 2 + (oneBasedShortCount - 15) / 20;
  }
  return null;
}

function getSideAdCycleForShort(oneBasedShortCount: number): number {
  if (oneBasedShortCount <= 5) return 0;
  if (oneBasedShortCount <= 15) return 1;
  return 2 + Math.floor((oneBasedShortCount - 16) / 20);
}

export function ShortsFeed({
  videos,
  loadingMore,
  hasMore,
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
  onLoadMore,
  onMarkSeen,
  onSkipUnavailable,
  onSelectCreator,
  onExitShorts,
}: ShortsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIframeRef = useRef<HTMLIFrameElement>(null);
  const tiktokReadyRef = useRef(false);
  const metaLoadedRef = useRef(false);
  const skippedKeyRef = useRef('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [skippingMsg, setSkippingMsg] = useState(false);
  const [activeOfflineAssets, setActiveOfflineAssets] = useState<{
    videoKey: string;
    videoUrl: string;
    thumbUrl?: string;
    entry: OfflineSavedEntry;
  } | null>(null);

  const feedSlides = useMemo<ShortsFeedSlide[]>(() => {
    const slides: ShortsFeedSlide[] = [];
    videos.forEach((video, idx) => {
      const shortCount = idx + 1;
      slides.push({ kind: 'video', video, videoIndex: idx });
      if (isOnline) {
        const cycle = getAdCycleAfterShort(shortCount);
        if (cycle !== null) {
          slides.push({
            kind: 'ad',
            adCycle: cycle,
            afterShortCount: shortCount,
          });
        }
      }
    });
    return slides;
  }, [videos, isOnline]);

  const clampedIndex = Math.max(0, Math.min(activeIndex, Math.max(0, feedSlides.length - 1)));
  const activeSlide = feedSlides[clampedIndex] ?? null;
  const activeVideo = activeSlide?.kind === 'video' ? activeSlide.video : null;
  const activeKey = activeVideo ? `${activeVideo.source}:${activeVideo.id}` : '';
  const activeOfflineEntry = activeKey ? offlineMap[activeKey] : undefined;
  const hasSavedOfflineCount = Object.keys(offlineMap).length > 0;
  const currentVideoNum =
    activeSlide?.kind === 'video'
      ? activeSlide.videoIndex + 1
      : activeSlide
      ? activeSlide.afterShortCount
      : 0;
  const sideAdCycle = getSideAdCycleForShort(currentVideoNum);

  useEffect(() => {
    if (!activeVideo) return;
    const timer = setTimeout(() => {
      onMarkSeen(activeVideo);
      onRecordView?.(activeVideo);
    }, 900);
    return () => clearTimeout(timer);
  }, [activeVideo, onMarkSeen, onRecordView]);

  // Resolve cached 24h offline MP4 for the currently active short
  useEffect(() => {
    if (!activeVideo) {
      setActiveOfflineAssets(null);
      return;
    }
    const targetKey = `${activeVideo.source}:${activeVideo.id}`;
    let active = true;
    let videoUrlToRevoke: string | null = null;
    let thumbUrlToRevoke: string | null = null;

    void getOfflinePlaybackAssets(activeVideo).then((assets) => {
      if (!active) {
        if (assets?.videoUrl.startsWith('blob:')) URL.revokeObjectURL(assets.videoUrl);
        if (assets?.thumbUrl?.startsWith('blob:')) URL.revokeObjectURL(assets.thumbUrl);
        return;
      }
      if (assets) {
        videoUrlToRevoke = assets.videoUrl.startsWith('blob:') ? assets.videoUrl : null;
        thumbUrlToRevoke = assets.thumbUrl?.startsWith('blob:') ? assets.thumbUrl : null;
        setActiveOfflineAssets({
          videoKey: targetKey,
          videoUrl: assets.videoUrl,
          thumbUrl: assets.thumbUrl,
          entry: assets.entry,
        });
      } else {
        setActiveOfflineAssets(null);
      }
    });

    return () => {
      active = false;
      if (videoUrlToRevoke) URL.revokeObjectURL(videoUrlToRevoke);
      if (thumbUrlToRevoke) URL.revokeObjectURL(thumbUrlToRevoke);
    };
  }, [activeVideo, activeOfflineEntry?.savedAt]);

  useEffect(() => {
    if (
      isOnline &&
      hasMore &&
      !loadingMore &&
      feedSlides.length > 0 &&
      clampedIndex >= feedSlides.length - 3
    ) {
      onLoadMore();
    }
  }, [isOnline, clampedIndex, feedSlides.length, hasMore, loadingMore, onLoadMore]);

  const scrollToIndex = useCallback(
    (nextIdx: number) => {
      const container = containerRef.current;
      if (!container) return;
      const clamped = Math.max(0, Math.min(feedSlides.length - 1, nextIdx));
      const slide = container.children[clamped] as HTMLElement | undefined;
      if (slide) {
        slide.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveIndex(clamped);
      }
    },
    [feedSlides.length]
  );

  // Auto-skip unavailable YouTube / TikTok / NASA shorts in real time (online only)
  const handleCurrentUnavailable = useCallback(() => {
    if (!activeVideo || !isOnline) return;
    const key = `${activeVideo.source}:${activeVideo.id}`;
    if (skippedKeyRef.current === key) return;
    skippedKeyRef.current = key;
    setSkippingMsg(true);
    setTimeout(() => setSkippingMsg(false), 1400);
    onSkipUnavailable(activeVideo);
  }, [activeVideo, isOnline, onSkipUnavailable]);

  useEffect(() => {
    if (!activeVideo || !isOnline) return;
    if (activeOfflineAssets?.videoKey === `${activeVideo.source}:${activeVideo.id}`) {
      return;
    }
    skippedKeyRef.current = '';
    tiktokReadyRef.current = false;
    metaLoadedRef.current = false;

    const onMessage = (e: MessageEvent) => {
      if (
        activeVideo.source === 'youtube' &&
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
            handleCurrentUnavailable();
          } else if (msg.event === 'infoDelivery' && msg.info && typeof msg.info === 'object') {
            const info = msg.info as Record<string, unknown>;
            const videoData = info.videoData as Record<string, unknown> | undefined;
            if (videoData?.errorCode) {
              handleCurrentUnavailable();
            }
          }
        } catch {
          // ignore
        }
      }

      if (activeVideo.source === 'tiktok' && e.origin === 'https://www.tiktok.com') {
        const data = e.data as Record<string, unknown> | null;
        if (data && typeof data === 'object') {
          if (data.type === 'onPlayerReady' || data.type === 'onStateChange') {
            tiktokReadyRef.current = true;
          }
          if (data.type === 'onError') {
            handleCurrentUnavailable();
          }
        }
      }
    };

    window.addEventListener('message', onMessage);

    let ttWatchdog: ReturnType<typeof setTimeout> | undefined;
    if (activeVideo.source === 'tiktok') {
      ttWatchdog = setTimeout(() => {
        if (!tiktokReadyRef.current) {
          handleCurrentUnavailable();
        }
      }, 5500);
    }

    let metaWatchdog: ReturnType<typeof setTimeout> | undefined;
    if (
      (activeVideo.source === 'instagram' || activeVideo.source === 'facebook') &&
      !metaBlocked[activeVideo.source]
    ) {
      const metaSrc = activeVideo.source;
      metaWatchdog = setTimeout(() => {
        if (!metaLoadedRef.current) {
          onMarkMetaBlocked(metaSrc);
          handleCurrentUnavailable();
        }
      }, 4500);
    }

    return () => {
      window.removeEventListener('message', onMessage);
      if (ttWatchdog) clearTimeout(ttWatchdog);
      if (metaWatchdog) clearTimeout(metaWatchdog);
    };
  }, [activeVideo, isOnline, activeOfflineAssets, metaBlocked, onMarkMetaBlocked, handleCurrentUnavailable]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(clampedIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(clampedIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clampedIndex, scrollToIndex]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex && idx >= 0 && idx < feedSlides.length) {
      setActiveIndex(idx);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-12 text-center">
        <Film className="mx-auto h-8 w-8 text-zinc-500" />
        <h3 className="mt-3 text-base font-semibold text-zinc-100">
          No reels loaded for this filter
        </h3>
        <button
          type="button"
          onClick={onExitShorts}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
        >
          Back to Explore Grid
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center gap-6">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-220px)] min-h-[520px] max-h-[820px] w-full max-w-[440px] snap-y snap-mandatory overflow-y-scroll no-scrollbar rounded-2xl border border-zinc-800 bg-black shadow-2xl"
      >
        {feedSlides.map((slide, idx) => {
          const isActive = idx === clampedIndex;
          const isNearActive = Math.abs(idx - clampedIndex) <= 1;

          if (slide.kind === 'ad') {
            return (
              <div
                key={`shorts-ad-slide-${slide.adCycle}`}
                className="relative flex h-full w-full snap-start snap-always flex-col justify-between bg-[#0b0b0f] p-5"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium uppercase tracking-wider text-zinc-400">
                    Advertisement
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    After {slide.afterShortCount} shorts
                  </span>
                </div>

                <div className="my-auto py-4">
                  {isNearActive ? (
                    <AdSenseSlot
                      isOnline={isOnline}
                      slotKey={`shorts-slide-${slide.adCycle}`}
                      format="auto"
                      minHeightClass="min-h-[300px]"
                    />
                  ) : (
                    <div className="h-[300px] rounded-xl border border-zinc-800/70 bg-[#121215]" />
                  )}
                </div>

                <div className="pt-4 flex flex-col items-center gap-2 border-t border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => scrollToIndex(idx + 1)}
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                  >
                    Continue Watching Shorts
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    Scroll down or tap above for next video
                  </span>
                </div>
              </div>
            );
          }

          const video = slide.video;
          const vKey = `${video.source}:${video.id}`;
          const savedEntry = offlineMap[vKey];
          const offlineReadyForThis =
            isActive && activeOfflineAssets?.videoKey === vKey
              ? activeOfflineAssets
              : null;
          const embedUrl = isActive && !offlineReadyForThis ? getSafeReelEmbedUrl(video) : '';
          const canSave = isOfflineDownloadable(video) && (isOnline || Boolean(savedEntry));
          const isSavingThis = savingKey === vKey;

          return (
            <div
              key={`${video.source}-${video.id}`}
              className="relative flex h-full w-full snap-start snap-always flex-col justify-between overflow-hidden bg-black"
            >
              <div className="relative flex-1 w-full h-full bg-black">
                {skippingMsg && isActive && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-lg bg-black/85 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100">
                    Skipping unavailable video...
                  </div>
                )}

                {isActive ? (
                  offlineReadyForThis ? (
                    <video
                      key={offlineReadyForThis.videoUrl}
                      src={offlineReadyForThis.videoUrl}
                      poster={offlineReadyForThis.thumbUrl || video.thumbnail || undefined}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="h-full w-full object-contain bg-black"
                    />
                  ) : !isOnline ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
                      <WifiOff className="h-8 w-8 text-amber-400" />
                      <p className="text-sm font-semibold text-zinc-100">
                        Offline Mode
                      </p>
                      <p className="max-w-xs text-xs text-zinc-400 leading-relaxed">
                        {isOfflineDownloadable(video)
                          ? 'This video was not saved locally for offline playback.'
                          : `${SOURCE_LABELS[video.source]} clips require internet. Swipe or open your 24h Offline Vault clips.`}
                      </p>
                      {hasSavedOfflineCount && (
                        <button
                          type="button"
                          onClick={onJumpToOfflineVault}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                        >
                          Watch 24h Offline Videos
                        </button>
                      )}
                    </div>
                  ) : video.source === 'nasa' ? (
                    <NasaShortPlayer
                      video={video}
                      onError={handleCurrentUnavailable}
                    />
                  ) : (video.source === 'instagram' && metaBlocked.instagram) ||
                    (video.source === 'facebook' && metaBlocked.facebook) ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
                      <WifiOff className="h-8 w-8 text-amber-400" />
                      <p className="text-sm font-semibold text-zinc-100">
                        {SOURCE_LABELS[video.source]} unavailable on this network
                      </p>
                      <p className="max-w-xs text-xs text-zinc-400 leading-relaxed">
                        Blocked in this region — swipe to YouTube, TikTok, TILvids, or NASA reels.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {idx < videos.length - 1 && (
                          <button
                            type="button"
                            onClick={() => scrollToIndex(idx + 1)}
                            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                          >
                            Next Video
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onRecheckMeta}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 cursor-pointer"
                        >
                          Recheck Access
                        </button>
                      </div>
                    </div>
                  ) : embedUrl ? (
                    <iframe
                      ref={activeIframeRef}
                      key={`${video.source}-${video.id}`}
                      src={embedUrl}
                      title={video.title}
                      onLoad={() => {
                        if (video.source === 'instagram' || video.source === 'facebook') {
                          metaLoadedRef.current = true;
                        }
                        if (
                          video.source === 'youtube' &&
                          activeIframeRef.current?.contentWindow
                        ) {
                          activeIframeRef.current.contentWindow.postMessage(
                            JSON.stringify({ event: 'listening', id: video.id }),
                            'https://www.youtube-nocookie.com'
                          );
                        }
                      }}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : null
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToIndex(idx)}
                    className="relative h-full w-full cursor-pointer"
                  >
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                        <Film className="h-10 w-10 text-zinc-600" />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-lg">
                        <Play className="h-6 w-6 fill-current ml-0.5" />
                      </span>
                    </span>
                  </button>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-12">
                  {isActive && (
                    <div className="pointer-events-auto mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-200 tabular-nums"
                          title="Unique in-app views recorded per device"
                        >
                          <Eye className="h-3 w-3 text-zinc-300" />
                          <span>{formatM2ACount(engagementMap[vKey]?.views || 0)}</span>
                        </span>
                        {EMOJI_OPTIONS.map((opt) => {
                          const count = engagementMap[vKey]?.reactions?.[opt.key] || 0;
                          const isPicked = engagementMap[vKey]?.userEmoji === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => onReactEmoji?.(video, opt.key)}
                              aria-pressed={isPicked}
                              aria-label={`${opt.label} reaction (${count})`}
                              className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                isPicked
                                  ? 'border-rose-500/70 bg-rose-600/35 text-white'
                                  : 'border-white/15 bg-black/65 text-zinc-200 hover:bg-black/90'
                              }`}
                            >
                              <span aria-hidden="true">{opt.glyph}</span>
                              {count > 0 && (
                                <span className="text-[10px] tabular-nums">
                                  {formatM2ACount(count)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSupportCreator) {
                            onSupportCreator(video);
                          } else if (video.authorHandle) {
                            onSelectCreator(video.authorHandle);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-600/85 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <HeartHandshake className="h-3 w-3 shrink-0" />
                        <span>Support Creator</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1 pointer-events-auto">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <span className="font-semibold text-rose-400">
                          {SOURCE_LABELS[video.source]}
                        </span>
                        <span aria-hidden="true">·</span>
                        {video.authorHandle ? (
                          <button
                            type="button"
                            onClick={() => onSelectCreator(video.authorHandle!)}
                            className="inline-flex items-center gap-1 font-medium text-white hover:underline cursor-pointer truncate"
                          >
                            <User className="h-3 w-3 shrink-0" />
                            <span>@{video.authorHandle}</span>
                          </button>
                        ) : (
                          <span className="truncate font-medium text-zinc-100">
                            {video.author}
                          </span>
                        )}
                        {savedEntry && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-400 font-medium shrink-0">
                              {formatTimeLeft(savedEntry.expiresAt)}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white line-clamp-2">
                        {video.title}
                      </p>
                    </div>

                    <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
                      {onToggleWatchlist && (
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(video)}
                          aria-label={
                            watchlistKeys?.has(vKey)
                              ? 'Remove from Watchlist'
                              : 'Save to Watchlist'
                          }
                          aria-pressed={watchlistKeys?.has(vKey)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                            watchlistKeys?.has(vKey)
                              ? 'border-rose-500/60 bg-rose-600 text-white'
                              : 'border-white/20 bg-black/75 text-zinc-100 hover:bg-black/95'
                          }`}
                        >
                          {watchlistKeys?.has(vKey) ? (
                            <BookmarkCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Bookmark className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {canSave && (
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => onToggleOfflineSave(video)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shrink-0 cursor-pointer transition-colors disabled:opacity-60 ${
                            savedEntry
                              ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
                              : 'border-white/20 bg-black/75 text-zinc-100 hover:bg-black/95'
                          }`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : savedEntry ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-rose-400" />
                          )}
                          <span>{savedEntry ? '24h Saved' : 'Save 24h'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => scrollToIndex(clampedIndex - 1)}
          disabled={clampedIndex === 0}
          aria-label="Previous short"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-[#121215] text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronUp className="h-5 w-5" />
        </button>

        <span className="text-xs font-medium text-zinc-400 tabular-nums whitespace-nowrap">
          {activeSlide?.kind === 'ad'
            ? 'Ad Break'
            : `${currentVideoNum} / ${videos.length}`}
        </span>

        <button
          type="button"
          onClick={() => scrollToIndex(clampedIndex + 1)}
          disabled={clampedIndex >= feedSlides.length - 1 && !hasMore}
          aria-label="Next short"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-[#121215] text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronDown className="h-5 w-5" />
        </button>

        {loadingMore && (
          <div
            aria-label="Loading more reels"
            className="mt-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
          />
        )}
      </div>

      {/* Desktop Companion Shorts Ad (rotates cleanly every 20 shorts scrolled, hidden on Ad slides) */}
      {isOnline && activeSlide?.kind !== 'ad' && (
        <div className="hidden lg:block w-[300px] shrink-0">
          <AdSenseSlot
            isOnline={isOnline}
            slotKey={`shorts-side-${sideAdCycle}`}
            format="auto"
            minHeightClass="min-h-[300px]"
          />
        </div>
      )}
    </div>
  );
}
