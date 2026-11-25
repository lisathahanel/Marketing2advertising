import React from 'react';
import {RefreshCw, WifiOff, X} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus.ts';
import {useServiceWorkerUpdate} from '../hooks/useServiceWorkerUpdate.ts';

export const PWABanners: React.FC = () => {
  const isOnline = useOnlineStatus();
  const {needRefresh, updateServiceWorker, dismissUpdate} =
    useServiceWorkerUpdate();

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-[#0E111E]/95 px-4 py-2.5 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span>Offline mode — showing cached catalogue</span>
        </div>
      )}

      {needRefresh && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-white/[0.14] bg-[#0E111E]/95 p-3.5 text-sm text-[#F9F9F9] shadow-2xl backdrop-blur-md"
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-white">
              Update available
            </p>
            <p className="mt-0.5 text-xs text-[#A4A9B8]">
              Reload to get the latest movies and app improvements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void updateServiceWorker()}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-[#0063E5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0483EE]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reload
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Dismiss update notification"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#A4A9B8] hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
};
