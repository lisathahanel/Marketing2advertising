import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { showToast } from './Toast';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
        }`}
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS and Android manual installation when the browser does not expose a prompt.
  if (isIOS || isAndroid) {
    return (
      <>
        <button
          onClick={() => setShowInstallGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
        </button>

        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#14141d] border border-amber-500/30 p-6 shadow-2xl text-left">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    M2A
                  </div>
                  <h3 className="text-base font-bold text-white">{isIOS ? 'Install M2A on iPhone or iPad' : 'Install M2A on Android'}</h3>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <Share2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    1. {isIOS ? <>Tap the <strong className="text-white">Share</strong> button in Safari.</> : <>Open the browser menu <strong className="text-white">⋮</strong> in Chrome.</>}
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <PlusSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    2. {isIOS ? <>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>, then tap <strong className="text-white">Add</strong>.</> : <>Tap <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>, then confirm.</>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback direct install / web prompt
  return (
    <button
      onClick={() => showToast('Open your browser menu and choose Install app or Add to Home screen.', 'info')}
      className={`flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
};
