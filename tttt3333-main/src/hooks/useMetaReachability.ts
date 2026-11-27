import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoSource } from '../types';

export type MetaStatus = 'checking' | 'reachable' | 'blocked';

export interface MetaReachabilityState {
  instagram: MetaStatus;
  facebook: MetaStatus;
}

const PROBE_TIMEOUT_MS = 3000;

async function probeMetaHost(url: string): Promise<'reachable' | 'blocked'> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'blocked';
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(url, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return 'reachable';
  } catch {
    return 'blocked';
  } finally {
    clearTimeout(timer);
  }
}

export function useMetaReachability(isOnline: boolean) {
  const [metaStatus, setMetaStatus] = useState<MetaReachabilityState>({
    instagram: isOnline ? 'checking' : 'blocked',
    facebook: isOnline ? 'checking' : 'blocked',
  });
  const manualBlockRef = useRef<{ instagram: boolean; facebook: boolean }>({
    instagram: false,
    facebook: false,
  });

  const runCheck = useCallback(
    async (resetManual = false) => {
      if (resetManual) {
        manualBlockRef.current = { instagram: false, facebook: false };
      }
      if (!isOnline) {
        setMetaStatus({ instagram: 'blocked', facebook: 'blocked' });
        return;
      }

      setMetaStatus({
        instagram: manualBlockRef.current.instagram ? 'blocked' : 'checking',
        facebook: manualBlockRef.current.facebook ? 'blocked' : 'checking',
      });

      const [igResult, fbResult] = await Promise.all([
        manualBlockRef.current.instagram
          ? Promise.resolve('blocked' as const)
          : probeMetaHost('https://www.instagram.com/favicon.ico'),
        manualBlockRef.current.facebook
          ? Promise.resolve('blocked' as const)
          : probeMetaHost('https://www.facebook.com/favicon.ico'),
      ]);

      setMetaStatus({
        instagram: igResult,
        facebook: fbResult,
      });
    },
    [isOnline]
  );

  useEffect(() => {
    void runCheck(false);
  }, [runCheck]);

  const recheckMeta = useCallback(() => {
    void runCheck(true);
  }, [runCheck]);

  const markMetaBlocked = useCallback((source: 'instagram' | 'facebook') => {
    manualBlockRef.current[source] = true;
    setMetaStatus((prev) => {
      if (prev[source] === 'blocked') return prev;
      return { ...prev, [source]: 'blocked' };
    });
  }, []);

  const isMetaBlocked = useCallback(
    (source: VideoSource): boolean => {
      if (source === 'instagram') return metaStatus.instagram === 'blocked';
      if (source === 'facebook') return metaStatus.facebook === 'blocked';
      return false;
    },
    [metaStatus]
  );

  const anyMetaBlocked =
    metaStatus.instagram === 'blocked' || metaStatus.facebook === 'blocked';

  return {
    metaStatus,
    anyMetaBlocked,
    recheckMeta,
    markMetaBlocked,
    isMetaBlocked,
  };
}
