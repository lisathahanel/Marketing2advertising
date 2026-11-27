import { useEffect } from 'react';
import { X } from 'lucide-react';

interface InstallAppModalProps {
  open: boolean;
  isIOS: boolean;
  onClose: () => void;
}

export function InstallAppModal({ open, isIOS, onClose }: InstallAppModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install marketing2advertising app"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="marketing2advertising icon"
              className="h-11 w-11 rounded-xl border border-zinc-800 shrink-0"
            />
            <div>
              <h2 className="font-display text-base font-bold text-zinc-50">
                Install marketing2advertising
              </h2>
              <p className="text-xs text-zinc-400">
                Add M2A to your home screen or desktop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close install guide"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <ol className="mt-5 space-y-2.5 text-sm text-zinc-300">
            <li>
              1. Tap the <strong className="text-white">Share</strong> button in
              your Safari toolbar.
            </li>
            <li>
              2. Scroll down and tap{' '}
              <strong className="text-white">Add to Home Screen</strong>.
            </li>
            <li>
              3. Tap <strong className="text-white">Add</strong> to launch M2A
              like a native app.
            </li>
          </ol>
        ) : (
          <div className="mt-5 space-y-2.5 text-sm text-zinc-300">
            <p>
              To install <strong className="text-white">marketing2advertising</strong> as a standalone app:
            </p>
            <ol className="space-y-2 text-zinc-300">
              <li>
                1. Open this app directly in Chrome, Edge, or Android browser (outside embedded preview frames if shown).
              </li>
              <li>
                2. Click the <strong className="text-white">Install</strong> icon in your browser address bar or choose{' '}
                <strong className="text-white">Install App / Add to Home screen</strong> from the browser menu.
              </li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
