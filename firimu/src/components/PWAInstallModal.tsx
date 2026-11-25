import React, {useState} from 'react';
import {Download, Monitor, Share, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  className?: string;
  onModalOpen?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  onModalOpen,
}) => {
  const {isNativeInstallable, isInstalled, isIOS, isAndroid, promptNativeInstall} =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isNativeInstallable) {
      const accepted = await promptNativeInstall();
      if (accepted) return;
    }
    setShowGuide(true);
    onModalOpen?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex min-h-[42px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#0063E5] px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-[0_4px_16px_rgba(0,99,229,0.35)] transition-colors hover:bg-[#0483EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#040714]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.14] bg-[#0E111E] p-6 text-[#F9F9F9] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="pwa-install-title"
                  className="font-display text-xl font-bold text-white"
                >
                  Install M2a Movies (Firimu)
                </h2>
                <p className="mt-1 text-sm text-[#A4A9B8]">
                  Add Firimu to your home screen for instant launch and offline browsing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#A4A9B8] hover:bg-white/[0.07] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-[#CACACA]">
              {isIOS ? (
                <div className="rounded-xl border border-white/[0.1] bg-[#040714] p-4">
                  <div className="mb-2 flex items-center gap-2 font-display font-semibold text-white">
                    <Share className="h-4 w-4 text-[#0483EE]" aria-hidden="true" />
                    <span>iPhone &amp; iPad (Safari)</span>
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[#CACACA]">
                    <li>Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top corner to confirm.</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div className="rounded-xl border border-white/[0.1] bg-[#040714] p-4">
                  <div className="mb-2 flex items-center gap-2 font-display font-semibold text-white">
                    <Smartphone className="h-4 w-4 text-[#0483EE]" aria-hidden="true" />
                    <span>Android (Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[#CACACA]">
                    <li>Open your browser menu (three dots in the top corner).</li>
                    <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>Follow the prompt to add Firimu to your app launcher.</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.1] bg-[#040714] p-4">
                  <div className="mb-2 flex items-center gap-2 font-display font-semibold text-white">
                    <Monitor className="h-4 w-4 text-[#0483EE]" aria-hidden="true" />
                    <span>Desktop (Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[#CACACA]">
                    <li>Look for the <strong>Install</strong> icon on the right side of the address bar.</li>
                    <li>Or open the browser menu and select <strong>Install M2a Movies (Firimu)</strong>.</li>
                  </ol>
                </div>
              )}

              {isNativeInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await promptNativeInstall();
                    if (ok) setShowGuide(false);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0063E5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
                >
                  <Download className="h-4 w-4" />
                  Install Now
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/[0.14] bg-white/[0.04] text-sm font-medium text-[#F9F9F9] hover:bg-white/[0.09]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
