import {useCallback, useEffect, useRef, useState, type RefObject} from 'react';

export interface StoredVideoProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface UseVideoProgressOptions {
  movieSlug: string;
  partNumber: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  sourceKey?: string;
  throttleMs?: number;
  autoSeekOnMount?: boolean;
  fallbackSavedTime?: number;
  fallbackDuration?: number;
  onSave?: (currentTime: number, duration: number) => void;
}

export interface UseVideoProgressResult {
  savedTime: number;
  savedDuration: number;
  seekToSaved: (overrideTime?: number) => void;
  saveNow: () => void;
  clearProgress: () => void;
}

const PROGRESS_KEY_PREFIX = 'firimu_video_progress';

export function getVideoProgressKey(
  movieSlug: string,
  partNumber: number,
): string {
  const safeSlug = encodeURIComponent((movieSlug || 'unknown').trim());
  const safePart = Number.isFinite(partNumber) && partNumber >= 1 ? partNumber : 1;
  return `${PROGRESS_KEY_PREFIX}:${safeSlug}:part:${safePart}`;
}

export function readVideoProgress(
  movieSlug: string,
  partNumber: number,
): StoredVideoProgress | null {
  if (!movieSlug || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getVideoProgressKey(movieSlug, partNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredVideoProgress>;
    if (
      typeof parsed?.currentTime === 'number' &&
      Number.isFinite(parsed.currentTime) &&
      parsed.currentTime >= 0
    ) {
      return {
        currentTime: parsed.currentTime,
        duration:
          typeof parsed.duration === 'number' && Number.isFinite(parsed.duration)
            ? parsed.duration
            : 0,
        updatedAt:
          typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeVideoProgress(
  movieSlug: string,
  partNumber: number,
  currentTime: number,
  duration: number,
): StoredVideoProgress | null {
  if (!movieSlug || typeof localStorage === 'undefined') return null;
  if (!Number.isFinite(currentTime) || currentTime < 0) return null;

  const safeDuration =
    Number.isFinite(duration) && duration > 0 ? duration : 0;
  const clampedTime =
    safeDuration > 0 ? Math.min(currentTime, safeDuration) : currentTime;

  const record: StoredVideoProgress = {
    currentTime: clampedTime,
    duration: safeDuration,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(
      getVideoProgressKey(movieSlug, partNumber),
      JSON.stringify(record),
    );
  } catch {
    // Ignore storage quota errors
  }

  return record;
}

export function useVideoProgress({
  movieSlug,
  partNumber,
  videoRef,
  enabled = true,
  sourceKey = '',
  throttleMs = 2500,
  autoSeekOnMount = true,
  fallbackSavedTime = 0,
  fallbackDuration = 0,
  onSave,
}: UseVideoProgressOptions): UseVideoProgressResult {
  const [savedState, setSavedState] = useState<{
    time: number;
    duration: number;
  }>(() => {
    const stored = readVideoProgress(movieSlug, partNumber);
    return {
      time: stored?.currentTime ?? fallbackSavedTime,
      duration: stored?.duration ?? fallbackDuration,
    };
  });

  const hasSeekedForMountRef = useRef(false);
  const lastSavedAtRef = useRef(0);
  const lastSavedTimeRef = useRef(0);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const fallbackSavedTimeRef = useRef(fallbackSavedTime);
  fallbackSavedTimeRef.current = fallbackSavedTime;
  const fallbackDurationRef = useRef(fallbackDuration);
  fallbackDurationRef.current = fallbackDuration;

  // Reload stored progress whenever movieSlug or partNumber changes
  useEffect(() => {
    const stored = readVideoProgress(movieSlug, partNumber);
    setSavedState({
      time: stored?.currentTime ?? fallbackSavedTimeRef.current,
      duration: stored?.duration ?? fallbackDurationRef.current,
    });
    hasSeekedForMountRef.current = false;
    lastSavedAtRef.current = 0;
    lastSavedTimeRef.current = 0;
  }, [movieSlug, partNumber]);

  // Keep fallback values synced while idle before playback starts if no localStorage entry exists yet
  useEffect(() => {
    if (enabled) return;
    const stored = readVideoProgress(movieSlug, partNumber);
    if (!stored) {
      setSavedState({
        time: fallbackSavedTime,
        duration: fallbackDuration,
      });
    }
  }, [enabled, movieSlug, partNumber, fallbackSavedTime, fallbackDuration]);

  const persistProgress = useCallback(
    (force = false) => {
      const video = videoRef.current;
      if (!video || !movieSlug) return;
      const current = video.currentTime;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (!Number.isFinite(current) || current < 1) return;

      const now = Date.now();
      if (
        force ||
        (now - lastSavedAtRef.current >= throttleMs &&
          Math.abs(current - lastSavedTimeRef.current) >= 1.5)
      ) {
        lastSavedAtRef.current = now;
        lastSavedTimeRef.current = current;
        const record = writeVideoProgress(
          movieSlug,
          partNumber,
          current,
          duration,
        );
        if (record) {
          setSavedState({
            time: record.currentTime,
            duration: record.duration,
          });
        }
        onSaveRef.current?.(current, duration);
      }
    },
    [movieSlug, partNumber, throttleMs, videoRef],
  );

  const seekToSaved = useCallback(
    (overrideTime?: number) => {
      const video = videoRef.current;
      if (!video) return;
      const stored = readVideoProgress(movieSlug, partNumber);
      const target =
        typeof overrideTime === 'number'
          ? overrideTime
          : stored?.currentTime ?? fallbackSavedTimeRef.current;

      if (!Number.isFinite(target) || target <= 0) return;

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const safeTarget =
        duration > 0 ? Math.min(target, Math.max(0, duration - 3)) : target;

      try {
        video.currentTime = safeTarget;
        hasSeekedForMountRef.current = true;
      } catch {
        // Seek may retry on canplay if metadata wasn't quite ready
      }
    },
    [movieSlug, partNumber, videoRef],
  );

  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(getVideoProgressKey(movieSlug, partNumber));
    } catch {
      // Ignore
    }
    hasSeekedForMountRef.current = false;
    setSavedState({time: 0, duration: 0});
  }, [movieSlug, partNumber]);

  const saveNow = useCallback(() => {
    persistProgress(true);
  }, [persistProgress]);

  // Attach listeners directly to the mounted video element to track & restore currentTime
  useEffect(() => {
    if (!enabled) {
      hasSeekedForMountRef.current = false;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    hasSeekedForMountRef.current = false;

    const tryInitialSeek = () => {
      if (!autoSeekOnMount || hasSeekedForMountRef.current) return;
      const stored = readVideoProgress(movieSlug, partNumber);
      const target = stored?.currentTime ?? fallbackSavedTimeRef.current;
      if (target >= 5) {
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        if (dur <= 0 || target < dur - 5) {
          seekToSaved(target);
        } else {
          hasSeekedForMountRef.current = true;
        }
      } else {
        hasSeekedForMountRef.current = true;
      }
    };

    // If video element already has metadata loaded upon mounting, seek immediately
    if (video.readyState >= 1) {
      tryInitialSeek();
    }

    const onLoadedMetadata = () => tryInitialSeek();
    const onCanPlay = () => tryInitialSeek();
    const onTimeUpdate = () => persistProgress(false);
    const onPause = () => persistProgress(true);
    const onSeeked = () => persistProgress(true);
    const onEnded = () => persistProgress(true);
    const onVisibilityOrHide = () => persistProgress(true);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);
    window.addEventListener('pagehide', onVisibilityOrHide);
    document.addEventListener('visibilitychange', onVisibilityOrHide);

    return () => {
      persistProgress(true);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
      window.removeEventListener('pagehide', onVisibilityOrHide);
      document.removeEventListener('visibilitychange', onVisibilityOrHide);
    };
  }, [
    enabled,
    sourceKey,
    movieSlug,
    partNumber,
    autoSeekOnMount,
    persistProgress,
    seekToSaved,
    videoRef,
  ]);

  return {
    savedTime: savedState.time,
    savedDuration: savedState.duration,
    seekToSaved,
    saveNow,
    clearProgress,
  };
}
