import { useEffect } from 'react';
import {
  Bot,
  Briefcase,
  Check,
  Download,
  ExternalLink,
  Film,
  Gamepad2,
  Grid,
  HardDriveDownload,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Shuffle,
  Tv,
  X,
} from 'lucide-react';
import { formatBytes } from '../lib/offlineVault';
import type { CategoryId, ViewMode } from '../types';

export interface M2ALinkItem {
  label: string;
  href: string;
}

export const M2A_MENU_LINKS: M2ALinkItem[] = [
  { label: 'TV', href: 'https://marketing2advertising.com/tv/' },
  { label: 'Firimu', href: 'https://marketing2advertising.com/firimu/' },
  { label: 'Apps', href: 'https://marketing2advertising.com/apps/' },
  { label: 'Contact Us', href: 'https://marketing2advertising.com/p/contact-us.html' },
  { label: 'About Us', href: 'https://marketing2advertising.com/p/about-us.html' },
  { label: 'M2A Bot', href: 'https://marketing2advertising.com/m2abot-main/' },
  { label: 'Email Extraction', href: 'https://marketing2advertising.com/m2a-emailextractor/' },
  { label: 'Games', href: 'https://marketing2advertising.com/game/' },
  { label: 'Jobs & Sponsorships', href: 'https://marketing2advertising.com/jobs/' },
];

const LINK_ICONS: Record<string, typeof Tv> = {
  TV: Tv,
  Firimu: Film,
  Apps: Grid,
  'Contact Us': MessageSquare,
  'About Us': Info,
  'M2A Bot': Bot,
  'Email Extraction': Mail,
  Games: Gamepad2,
  'Jobs & Sponsorships': Briefcase,
};

interface MenuDrawerProps {
  open: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasVideos: boolean;
  offlineCount: number;
  offlineTotalBytes: number;
  packProgress: string | null;
  onClose: () => void;
  onInstallClick: () => void;
  onDownloadOfflinePack: () => void;
  onOpenOfflineVault: () => void;
  onRandomPlay: () => void;
  onSelectViewMode: (mode: ViewMode) => void;
  onSelectCategory: (cat: CategoryId) => void;
}

export function MenuDrawer({
  open,
  isInstalled,
  isOnline,
  hasVideos,
  offlineCount,
  offlineTotalBytes,
  packProgress,
  onClose,
  onInstallClick,
  onDownloadOfflinePack,
  onOpenOfflineVault,
  onRandomPlay,
  onSelectViewMode,
  onSelectCategory,
}: MenuDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="marketing2advertising menu"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-sm flex-col border-l border-zinc-800 bg-[#121215] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold text-zinc-50">
            <img src="/icon.svg" alt="M2A logo" className="h-7 w-7 rounded-lg shrink-0" />
            <span>marketing2advertising</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Primary Menu Actions */}
          <div className="space-y-2.5">
            {isInstalled ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm font-medium text-zinc-300">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>App Installed (Offline Ready)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInstallClick();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Install App</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isOnline || Boolean(packProgress)}
              onClick={onDownloadOfflinePack}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/60 px-4 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {packProgress ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{packProgress}</span>
                </>
              ) : (
                <>
                  <HardDriveDownload className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Save 24h Offline Pack</span>
                </>
              )}
            </button>

            {offlineCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOfflineVault();
                }}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span>24h Offline Videos</span>
                <span className="text-emerald-400 tabular-nums">
                  {offlineCount} ({formatBytes(offlineTotalBytes)})
                </span>
              </button>
            )}

            <button
              type="button"
              disabled={!hasVideos}
              onClick={() => {
                onClose();
                onRandomPlay();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5 text-rose-400" />
              <span>Random Fun Video</span>
            </button>
          </div>

          {/* Mobile quick app sections */}
          <div className="md:hidden space-y-1.5 border-t border-zinc-800/80 pt-5">
            <p className="px-2 pb-1 text-xs font-semibold text-zinc-400">
              Watchroom
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectViewMode('grid');
                onSelectCategory('trending');
                onClose();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800/70 cursor-pointer"
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectViewMode('shorts');
                onClose();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800/70 cursor-pointer"
            >
              Shorts Scroll
            </button>
          </div>

          {/* M2A External Links */}
          <nav aria-label="M2A services" className="space-y-1.5 border-t border-zinc-800/80 pt-5">
            <p className="px-2 pb-1 text-xs font-semibold text-zinc-400">
              M2A Network
            </p>
            {M2A_MENU_LINKS.map((item) => {
              const Icon = LINK_ICONS[item.label] || ExternalLink;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
