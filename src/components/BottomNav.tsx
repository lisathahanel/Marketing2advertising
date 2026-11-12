import React from 'react';
import { Home, Tv, Film, Newspaper, Grid, Gamepad2, ArrowLeft, Share2 } from 'lucide-react';
import { TabType } from '../types';
import { showToast } from './Toast';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onBack,
  canGoBack,
}) => {
  const handleShare = async () => {
    const isCustom = typeof window !== 'undefined' && window.location.hostname.includes('m2a.marketing2advertising.com');
    const shareUrl = isCustom
      ? 'https://m2a.marketing2advertising.com/'
      : (typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://m2a.marketing2advertising.com/');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'M2A - Marketing & Advertising',
          text: 'Watch Live TV channels, Firimu movies on naka, play 15 games, and explore multi-apps on M2A!',
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(`M2A link copied: ${shareUrl}`, 'success');
      } catch {
        showToast('Link ready to share', 'info');
      }
    }
  };

  const navItems: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'tv', label: 'TV', icon: <Tv className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'firimu', label: 'Firimu', icon: <Film className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'blogs', label: 'Blogs', icon: <Newspaper className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'apps', label: 'Apps', icon: <Grid className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      {/* Floating Website-Style Quick Bar: Back / Live / Firimu / Blogs / Share */}
      <div className="pointer-events-auto mb-1.5 flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#161622]/90 border border-amber-500/30 backdrop-blur-md shadow-2xl shadow-black/80">
        <button
          onClick={onBack}
          disabled={!canGoBack && currentTab === 'home'}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
            !canGoBack && currentTab === 'home'
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-200 hover:text-amber-400 bg-white/5 hover:bg-white/10 active:scale-95'
          }`}
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Back</span>
        </button>

        <span className="w-[1px] h-3 bg-white/10" />

        <button
          onClick={() => onSelectTab('tv')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
            currentTab === 'tv'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-200 hover:text-amber-400 bg-white/5 hover:bg-white/10'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          <span>Live</span>
        </button>

        <span className="w-[1px] h-3 bg-white/10" />

        <button
          onClick={() => onSelectTab('firimu')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
            currentTab === 'firimu'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-sm font-black'
              : 'text-slate-200 hover:text-amber-400 bg-white/5 hover:bg-white/10'
          }`}
          title="Movies from naka.marketing2advertising.com"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Firimu</span>
        </button>

        <span className="w-[1px] h-3 bg-white/10" />

        <button
          onClick={() => onSelectTab('blogs')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
            currentTab === 'blogs'
              ? 'bg-amber-500 text-black shadow-sm font-black'
              : 'text-slate-200 hover:text-amber-400 bg-white/5 hover:bg-white/10'
          }`}
          title="Articles from marketing2advertising.com"
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Blogs</span>
        </button>

        <span className="w-[1px] h-3 bg-white/10" />

        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-slate-200 hover:text-amber-400 bg-white/5 hover:bg-white/10 active:scale-95 transition"
          title="Share M2A"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Share</span>
        </button>
      </div>

      {/* Main Bottom Tabs Bar */}
      <nav className="pointer-events-auto w-full max-w-md bg-[#0b0b0f]/95 backdrop-blur-xl border-t border-white/10 px-1.5 py-1 flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 sm:px-2.5 rounded-xl transition duration-150 ${
                isActive
                  ? 'text-amber-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'tv' && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[#0b0b0f]" />
                )}
                {item.id === 'firimu' && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-[#0b0b0f]" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
