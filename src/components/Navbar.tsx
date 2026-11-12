import React from 'react';
import { Menu, Search, Tv } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { TabType } from '../types';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenDrawer: () => void;
  onToggleSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onOpenDrawer,
  onToggleSearch,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0b0f]/95 backdrop-blur-md border-b border-white/10 px-3.5 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-[1.5px] shadow-sm">
              <div className="w-full h-full rounded-[10px] bg-[#0b0b0f] flex items-center justify-center font-black text-amber-400 text-sm tracking-wider">
                M2A
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-base tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  M2A
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black tracking-wide border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium">marketing2advertising</span>
            </div>
          </button>
        </div>

        {/* Right Actions: Live Shortcut, Install PWA, Search, Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick TV button */}
          <button
            onClick={() => onSelectTab('tv')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
            title="Watch Live Channels"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV</span>
          </button>

          {/* Quick Firimu button */}
          <button
            onClick={() => onSelectTab('firimu')}
            className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition"
            title="Watch Naka Movies"
          >
            <span className="text-xs">🎬</span>
            <span>Firimu</span>
          </button>

          {/* In-App PWA Install */}
          <PWAInstallButton compact />

          {/* Search Trigger */}
          <button
            onClick={onToggleSearch}
            aria-label="Search"
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Menu Drawer Toggle */}
          <button
            onClick={onOpenDrawer}
            aria-label="Open menu"
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
