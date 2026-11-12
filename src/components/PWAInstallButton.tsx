import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { showToast } from './Toast';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (isInstalled) return null;

  const buttonClass = compact
    ? 'px-2.5 py-1 text-xs'
    : 'px-4 py-2 text-sm';

  const installNow = async () => {
    const accepted = await install();
    if (!accepted && !isInstallable) {
      showToast('The browser has not made the M2A install prompt available yet. Open M2A in Chrome and try again.', 'info');
    }
  };

  // When supported, always use the browser's native install confirmation.
  if (isInstallable) {
    return (
      <button
        onClick={() => { void installNow(); }}
        className={`flex items-center gap-1.5 rounded-xl bg-[#7CFF00] font-black text-[#071000] shadow-lg shadow-lime-500/20 transition hover:bg-lime-300 active:scale-95 ${buttonClass}`}
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Install App</span>
      </button>
    );
  }

  // Safari on iOS does not expose beforeinstallprompt; retain its Add to Home Screen guide.
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowInstallGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-lime-300/30 bg-lime-300/10 font-bold text-lime-200 transition hover:bg-lime-300/20 active:scale-95 ${buttonClass}`}
        >
          <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Install App</span>
        </button>

        {showInstallGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-lime-300/25 bg-[#101722] p-6 text-left shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-300/15 font-black text-lime-300">M2A</div>
                  <h3 className="text-base font-bold text-white">Install M2A on iPhone or iPad</h3>
                </div>
                <button onClick={() => setShowInstallGuide(false)} className="p-1 text-slate-400 hover:text-white" aria-label="Close install guide">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                  <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
                  <p>1. Tap the <strong className="text-white">Share</strong> button in Safari.</p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
                  <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
                  <p>2. Choose <strong className="text-white">Add to Home Screen</strong>, then tap <strong className="text-white">Add</strong>.</p>
                </div>
              </div>
              <button onClick={() => setShowInstallGuide(false)} className="mt-5 w-full rounded-xl bg-[#7CFF00] py-2.5 text-sm font-black text-[#071000] transition hover:bg-lime-300">Got It</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/desktop: do not send users through manual steps. The native prompt
  // appears here automatically as soon as the browser confirms installability.
  return (
    <button
      onClick={() => showToast('M2A is ready to install when your browser enables the install prompt. Try opening this page in Chrome.', 'info')}
      className={`flex items-center gap-1.5 rounded-xl border border-lime-300/30 bg-lime-300/10 font-bold text-lime-200 transition hover:bg-lime-300/20 active:scale-95 ${buttonClass}`}
    >
      <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>Install App</span>
    </button>
  );
};
