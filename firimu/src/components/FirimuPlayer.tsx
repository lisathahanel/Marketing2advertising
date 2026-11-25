import React, {useEffect, useRef, useState} from 'react';
import {AlertCircle, CheckCircle2, Play, RotateCcw, RotateCw} from 'lucide-react';
import {
  formatPlaybackTime,
  formatRemainingTime,
} from '../context/CatalogueContext.tsx';
import {useVideoProgress} from '../hooks/useVideoProgress.ts';
import type {MoviePart} from '../lib/bloggerParser.ts';
import {
  formatOfflineCountdown,
  getOfflinePartPlayback,
} from '../lib/offlineStorage.ts';
import {PosterImage} from './PosterImage.tsx';

interface FirimuPlayerProps {
  moviePathname: string;
  movieSlug?: string;
  movieTitle: string;
  part: MoviePart | null;
  fallbackPoster: string;
  savedTime?: number;
  savedDuration?: number;
  autoResume?: boolean;
  onUnlock?: (part: MoviePart, resumeFromSeconds?: number) => void;
  onProgress?: (part: MoviePart, currentTime: number, duration: number) => void;
}

export const FirimuPlayer: React.FC<FirimuPlayerProps> = ({
  moviePathname,
  movieSlug,
  movieTitle,
  part,
  fallbackPoster,
  savedTime: propSavedTime = 0,
  savedDuration: propSavedDuration = 0,
  autoResume = false,
  onUnlock,
  onProgress,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [startFromZero, setStartFromZero] = useState(false);
  const [offlineSource, setOfflineSource] = useState<{
    blobUrl: string;
    expiresAt: number;
  } | null>(null);
  const [offlineChecked, setOfflineChecked] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const resolvedSlug =
    movieSlug ||
    moviePathname.split('/').filter(Boolean).pop() ||
    moviePathname;
  const resolvedPartNumber = part?.partNumber ?? 1;

  const activeMediaSrc = offlineSource?.blobUrl || part?.url || '';

  const {
    savedTime: hookSavedTime,
    savedDuration: hookSavedDuration,
    clearProgress,
  } = useVideoProgress({
    movieSlug: resolvedSlug,
    partNumber: resolvedPartNumber,
    videoRef,
    enabled: unlocked && part?.sourceType === 'video' && !videoError,
    sourceKey: activeMediaSrc,
    autoSeekOnMount: !startFromZero,
    fallbackSavedTime: propSavedTime,
    fallbackDuration: propSavedDuration,
    onSave: (time, dur) => {
      if (part) {
        onProgress?.(part, time, dur);
      }
    },
  });

  const effectiveSavedTime = hookSavedTime > 0 ? hookSavedTime : propSavedTime;
  const effectiveDuration =
    hookSavedDuration > 0 ? hookSavedDuration : propSavedDuration;

  // Check if this exact part is saved in the 24-hour Offline Vault
  useEffect(() => {
    let active = true;
    let createdBlobUrl = '';
    setOfflineSource(null);
    setOfflineChecked(false);

    if (!part || part.sourceType !== 'video') {
      setOfflineChecked(true);
      return;
    }

    getOfflinePartPlayback(moviePathname, part.index, part.url)
      .then((res) => {
        if (!active) {
          if (res?.blobUrl) URL.revokeObjectURL(res.blobUrl);
          return;
        }
        if (res?.blobUrl) {
          createdBlobUrl = res.blobUrl;
          setOfflineSource({
            blobUrl: res.blobUrl,
            expiresAt: res.expiresAt,
          });
        }
      })
      .finally(() => {
        if (active) setOfflineChecked(true);
      });

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [moviePathname, part?.index, part?.url, part?.sourceType]);

  const canResumeFromStopped =
    part?.sourceType === 'video' &&
    effectiveSavedTime >= 5 &&
    (effectiveDuration <= 0 || effectiveSavedTime < effectiveDuration - 10);

  const progressPercent =
    canResumeFromStopped && effectiveDuration > 0
      ? Math.min(
          98,
          Math.max(
            2,
            Math.round((effectiveSavedTime / effectiveDuration) * 100),
          ),
        )
      : 0;

  // Reset lock state cleanly whenever movie or part changes
  useEffect(() => {
    setUnlocked(false);
    setVideoError(false);
    setStartFromZero(false);
  }, [moviePathname, part?.index, part?.url]);

  // If user clicked a Resume link with autoResume, immediately unlock once offline check resolves
  useEffect(() => {
    if (autoResume && offlineChecked && part && !unlocked) {
      setStartFromZero(false);
      setVideoError(false);
      setUnlocked(true);
      onUnlock?.(part, canResumeFromStopped ? effectiveSavedTime : 0);
    }
  }, [
    autoResume,
    offlineChecked,
    part,
    unlocked,
    canResumeFromStopped,
    effectiveSavedTime,
    onUnlock,
  ]);

  // Start direct video playback upon unlocking
  useEffect(() => {
    if (unlocked && part?.sourceType === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Browser may still require manual tap on native controls
        });
      }
    }
  }, [unlocked, part?.sourceType, activeMediaSrc]);

  const handleUnlock = (startFromBeginning = false) => {
    if (!part) return;
    if (startFromBeginning) {
      setStartFromZero(true);
      clearProgress();
    } else {
      setStartFromZero(false);
    }
    const seekTarget =
      !startFromBeginning && canResumeFromStopped ? effectiveSavedTime : 0;
    setVideoError(false);
    setUnlocked(true);
    onUnlock?.(part, seekTarget);
  };

  const blockInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const posterSrc = part?.posterUrl || fallbackPoster;

  if (!part) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0E111E] p-6 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-[#A4A9B8]" aria-hidden="true" />
        <p className="font-display text-lg font-semibold text-white">
          Video stream unavailable for this title
        </p>
        <p className="mt-1 text-sm text-[#A4A9B8]">
          No playable media source was found in this entry.
        </p>
      </div>
    );
  }

  return (
    <div
      className="disney-card-frame relative aspect-video w-full select-none overflow-hidden rounded-2xl border border-white/[0.14] bg-black"
      onContextMenu={blockInteraction}
      onDragStart={blockInteraction}
      onCopy={blockInteraction}
    >
      {!unlocked ? (
        <div className="relative h-full w-full">
          <PosterImage
            src={posterSrc}
            alt={`${movieTitle} — ${part.label}`}
            title={movieTitle}
            eager
            className="h-full w-full object-cover opacity-70"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#040714] via-[#040714]/55 to-[#040714]/30"
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {canResumeFromStopped ? (
              <>
                <button
                  type="button"
                  onClick={() => handleUnlock(false)}
                  aria-label={`Resume ${movieTitle} ${part.label} from ${formatPlaybackTime(effectiveSavedTime)}`}
                  className="ready-play-btn inline-flex min-h-[52px] items-center gap-3 rounded-lg bg-[#F9F9F9] px-7 py-3.5 font-display text-sm font-bold tracking-wide text-[#040714] shadow-[0_0_40px_rgba(0,99,229,0.5)] transition-transform duration-150 hover:scale-[1.03] hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0063E5]/60 sm:text-base"
                >
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  <span>Resume from {formatPlaybackTime(effectiveSavedTime)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUnlock(true)}
                  className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-white/25 bg-[#040714]/75 px-4 py-2 text-xs font-semibold text-[#F9F9F9] backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-[#0E111E]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Start from Beginning</span>
                </button>

                <p className="mt-3 font-display text-xs font-medium text-[#CACACA] sm:text-sm tabular-nums">
                  {part.label}
                  {effectiveDuration > 0
                    ? ` · ${formatRemainingTime(effectiveSavedTime, effectiveDuration)}`
                    : ''}
                  {offlineSource
                    ? ` · Saved Offline (${formatOfflineCountdown(offlineSource.expiresAt)})`
                    : ''}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleUnlock(false)}
                  aria-label={`Play ${movieTitle} ${part.label}`}
                  className="ready-play-btn group flex h-20 w-20 items-center justify-center rounded-full bg-[#F9F9F9] text-[#040714] shadow-[0_0_44px_rgba(0,99,229,0.55)] transition-transform duration-150 hover:scale-105 hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0063E5]/60"
                >
                  <Play className="ml-1 h-9 w-9 fill-current" />
                </button>
                <p className="mt-4 font-display text-sm font-semibold tracking-wide text-white sm:text-base">
                  {part.label}
                </p>
                {offlineSource ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] tabular-nums">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Ready Offline · {formatOfflineCountdown(offlineSource.expiresAt)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#CACACA]">
                    Click play to start streaming
                  </p>
                )}
              </>
            )}
          </div>

          {canResumeFromStopped && (
            <div
              className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20"
              aria-hidden="true"
            >
              <div
                className="h-full bg-gradient-to-r from-[#0063E5] to-[#38BDF8] transition-all"
                style={{width: `${progressPercent || 18}%`}}
              />
            </div>
          )}
        </div>
      ) : part.sourceType === 'video' ? (
        videoError ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#0E111E] p-6 text-center">
            <AlertCircle className="mb-3 h-9 w-9 text-[#0483EE]" aria-hidden="true" />
            <p className="font-display text-base font-semibold text-white">
              {typeof navigator !== 'undefined' && !navigator.onLine && !offlineSource
                ? 'You are offline and this video is not saved'
                : 'Unable to load this video stream'}
            </p>
            <p className="mt-1 max-w-md text-xs text-[#A4A9B8]">
              {typeof navigator !== 'undefined' && !navigator.onLine && !offlineSource
                ? 'Connect to the internet or open a movie you saved for 24-hour offline viewing.'
                : 'The media host may be temporarily unreachable or blocked by your network.'}
            </p>
            <button
              type="button"
              onClick={() => setVideoError(false)}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0063E5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0483EE]"
            >
              <RotateCw className="h-4 w-4" />
              Retry Stream
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            key={activeMediaSrc}
            src={activeMediaSrc}
            poster={posterSrc || undefined}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            onContextMenu={blockInteraction}
            onError={() => setVideoError(true)}
            className="h-full w-full bg-black object-contain"
          />
        )
      ) : (
        <iframe
          key={part.url}
          src={part.url}
          title={`${movieTitle} — ${part.label}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0 bg-black"
        />
      )}
    </div>
  );
};
