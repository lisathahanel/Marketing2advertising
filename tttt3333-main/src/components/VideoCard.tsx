import { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  Eye,
  Film,
  Loader2,
  Play,
} from 'lucide-react';
import { formatM2ACount, getTopEmojiSummary } from '../lib/engagement';
import {
  formatTimeLeft,
  getOfflineThumbObjectUrl,
  isOfflineDownloadable,
  type OfflineSavedEntry,
} from '../lib/offlineVault';
import type { VideoEngagement, VideoItem } from '../types';

interface VideoCardProps {
  video: VideoItem;
  offlineEntry?: OfflineSavedEntry;
  engagement?: VideoEngagement;
  isWatchlisted?: boolean;
  isSavingOffline?: boolean;
  isOnline?: boolean;
  onSelect: (video: VideoItem) => void;
  onToggleWatchlist?: (video: VideoItem) => void;
  onToggleOfflineSave?: (video: VideoItem) => void;
}

const SOURCE_LABELS: Record<VideoItem['source'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram Reel',
  facebook: 'Facebook',
  tilvids: 'TILvids',
  nasa: 'NASA',
};

export function VideoCard({
  video,
  offlineEntry,
  engagement,
  isWatchlisted = false,
  isSavingOffline = false,
  isOnline = true,
  onSelect,
  onToggleWatchlist,
  onToggleOfflineSave,
}: VideoCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [offlineThumbUrl, setOfflineThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    if (offlineEntry && (!isOnline || imgFailed || !video.thumbnail)) {
      void getOfflineThumbObjectUrl(video).then((url) => {
        if (!active) {
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setOfflineThumbUrl(url);
      });
    } else {
      setOfflineThumbUrl(null);
    }
    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith('blob:')) URL.revokeObjectURL(createdUrl);
    };
  }, [offlineEntry, isOnline, imgFailed, video]);

  const sourceLabel =
    video.source === 'youtube' && video.isShort
      ? 'YouTube Short'
      : SOURCE_LABELS[video.source];

  const canSaveOffline = isOfflineDownloadable(video) && (isOnline || Boolean(offlineEntry));
  const displayThumb = offlineThumbUrl || (!imgFailed ? video.thumbnail : '');
  const m2aViews = engagement?.views || 0;
  const emojiSummary = getTopEmojiSummary(engagement);

  return (
    <div className="group flex flex-col text-left rounded-xl">
      <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900">
        <button
          type="button"
          onClick={() => onSelect(video)}
          aria-label={`Play ${video.title}`}
          className="block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500 cursor-pointer"
        >
          {displayThumb ? (
            <img
              src={displayThumb}
              alt={video.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 text-center">
              <Film className="h-7 w-7 text-zinc-500" aria-hidden="true" />
              <span className="text-xs font-medium text-zinc-400 line-clamp-2 max-w-[22ch]">
                {video.title}
              </span>
            </div>
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-150"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </span>
          </div>

          <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-medium text-zinc-100 tabular-nums">
            {video.duration}
          </span>
        </button>

        {/* Top-right quick save actions (Watchlist + 24h Offline when supported) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {canSaveOffline && onToggleOfflineSave && (
            <button
              type="button"
              disabled={isSavingOffline}
              onClick={(e) => {
                e.stopPropagation();
                onToggleOfflineSave(video);
              }}
              title={
                offlineEntry
                  ? `Saved for offline (${formatTimeLeft(offlineEntry.expiresAt)}) — click to remove`
                  : 'Save video to watch offline for 24 hours'
              }
              aria-label={
                offlineEntry
                  ? `Remove offline copy of ${video.title}`
                  : `Save ${video.title} offline for 24 hours`
              }
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors cursor-pointer disabled:opacity-70 ${
                offlineEntry
                  ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/90'
                  : 'bg-black/75 border border-white/15 text-zinc-100 hover:bg-black/90'
              }`}
            >
              {isSavingOffline ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : offlineEntry ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>24h Offline</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 text-rose-400" />
                  <span>Save 24h</span>
                </>
              )}
            </button>
          )}

          {onToggleWatchlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(video);
              }}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Save to Watchlist'}
              aria-label={
                isWatchlisted
                  ? `Remove ${video.title} from Watchlist`
                  : `Save ${video.title} to Watchlist`
              }
              aria-pressed={isWatchlisted}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition-all cursor-pointer ${
                isWatchlisted
                  ? 'border-rose-500/60 bg-rose-600 text-white'
                  : 'border-white/15 bg-black/75 text-zinc-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/95 hover:text-white'
              }`}
            >
              {isWatchlisted ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(video)}
        className="pt-3 min-w-0 w-full text-left cursor-pointer"
      >
        <h3 className="text-[15px] font-semibold leading-snug text-zinc-100 line-clamp-2 group-hover:text-white transition-colors">
          {video.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400 truncate">
          <span
            className={
              video.source === 'tiktok' || video.source === 'instagram'
                ? 'font-medium text-rose-400 shrink-0'
                : video.source === 'facebook'
                ? 'font-medium text-sky-400 shrink-0'
                : 'font-medium text-zinc-300 shrink-0'
            }
          >
            {sourceLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{video.author}</span>
          {offlineEntry ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 tabular-nums shrink-0">
                {formatTimeLeft(offlineEntry.expiresAt)}
              </span>
            </>
          ) : m2aViews > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-zinc-300 tabular-nums shrink-0">
                <Eye className="h-3 w-3 text-zinc-400" aria-hidden="true" />
                <span>{formatM2ACount(m2aViews)}</span>
              </span>
            </>
          ) : video.views ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums shrink-0">{video.views}</span>
            </>
          ) : null}
          {emojiSummary.total > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-zinc-200 tabular-nums shrink-0">
                <span>{emojiSummary.glyphs.join('')}</span>
                <span className="text-zinc-400">{formatM2ACount(emojiSummary.total)}</span>
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
