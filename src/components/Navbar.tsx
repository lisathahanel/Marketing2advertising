import React from 'react';
import { Menu, Search, Tv, ChevronDown, Film, Home, Gamepad2, Newspaper, Layers3, Bell } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { TabType } from '../types';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenDrawer: () => void;
  onToggleSearch: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenDrawer, onToggleSearch, onOpenNotifications }) => {
  const links: Array<{ id: TabType; label: string; Icon: React.ElementType }> = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'tv', label: 'TV', Icon: Tv },
    { id: 'games', label: 'Games', Icon: Gamepad2 },
    { id: 'firimu', label: 'Movies', Icon: Film },
    { id: 'catalogue', label: 'Series', Icon: Layers3 },
    { id: 'blogs', label: 'Blogs', Icon: Newspaper },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[.07] bg-[#05070D]/85 px-3 py-3 shadow-[0_8px_35px_rgba(0,0,0,.25)] backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
        <button onClick={() => onSelectTab('home')} className="group flex shrink-0 items-center gap-2.5 text-left">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-lime-300/40 bg-[linear-gradient(145deg,rgba(124,255,0,.2),rgba(8,14,22,.95))] text-[12px] font-black tracking-tight text-[#7CFF00] shadow-[0_0_22px_rgba(124,255,0,.12)] transition group-hover:shadow-[0_0_30px_rgba(124,255,0,.25)]">M2A<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#7CFF00] shadow-[0_0_10px_#7CFF00]" /></span>
          <span className="hidden xs:block"><span className="block text-base font-black tracking-[.12em] text-white">M2A<span className="text-[#7CFF00]">.</span></span><span className="block text-[8px] font-semibold tracking-[.13em] text-slate-500">DIGITAL UNIVERSE</span></span>
        </button>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
          {links.map(({ id, label, Icon }) => <button key={id} onClick={() => onSelectTab(id)} aria-current={currentTab === id ? 'page' : undefined} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition ${currentTab === id ? 'bg-lime-300/10 text-[#7CFF00] shadow-[inset_0_0_0_1px_rgba(124,255,0,.16)]' : 'text-slate-400 hover:bg-white/[.05] hover:text-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          <button onClick={onOpenDrawer} className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-400 transition hover:bg-white/[.05] hover:text-white">More <ChevronDown className="h-3 w-3" /></button>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button onClick={() => onSelectTab('tv')} className="hidden items-center gap-1.5 rounded-xl border border-lime-300/20 bg-lime-300/[.06] px-3 py-2 text-[10px] font-black text-lime-300 transition hover:bg-lime-300/10 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7CFF00]" /> LIVE</button>
          <span className="hidden md:block"><PWAInstallButton compact /></span>
          <button onClick={onOpenNotifications} aria-label="Get M2A notifications" title="Get Notified" className="rounded-xl border border-lime-300/20 bg-lime-300/[.06] p-2.5 text-lime-300 transition hover:bg-lime-300/15"><Bell className="h-4 w-4" /></button>
          <button onClick={onToggleSearch} aria-label="Open movie and content search" title="Search content" className="rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-slate-300 transition hover:border-sky-300/30 hover:text-sky-200"><Search className="h-4 w-4" /></button>
          <button onClick={onOpenDrawer} aria-label="Open menu" className="rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-slate-300 transition hover:border-lime-300/30 hover:text-lime-200"><Menu className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
};
