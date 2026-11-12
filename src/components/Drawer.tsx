import React from 'react';
import {
  X,
  Home,
  Tv,
  Film,
  Grid,
  Gamepad2,
  Briefcase,
  Info,
  Mail,
  Shield,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { TabType } from '../types';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  onOpenPage: (path: string, title: string) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenPage,
}) => {
  if (!isOpen) return null;

  const handleTab = (tab: TabType) => {
    onSelectTab(tab);
    onClose();
  };

  const handlePage = (path: string, title: string) => {
    onOpenPage(path, title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-xs bg-[#101018] h-full border-l border-white/10 shadow-2xl flex flex-col justify-between overflow-y-auto p-5 z-10 animate-in slide-in-from-right duration-250">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-[1.5px]">
                <div className="w-full h-full rounded-[10px] bg-[#0b0b0f] flex items-center justify-center font-black text-amber-400 text-sm">
                  M2A
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Navigation Menu</h3>
                <p className="text-[10px] text-slate-400">marketing2advertising</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main App Navigation */}
          <div className="space-y-1 mb-6">
            <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest px-2">
              App Sections
            </span>
            <button
              onClick={() => handleTab('home')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Home</span>
            </button>
            <button
              onClick={() => handleTab('tv')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Tv className="w-4 h-4 text-rose-500" />
              <div className="flex-1 flex items-center justify-between">
                <span>TV Live Channels</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black">
                  19 CH
                </span>
              </div>
            </button>
            <button
              onClick={() => handleTab('firimu')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Film className="w-4 h-4 text-amber-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>Firimu (naka movies)</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">
                  144+ Movies
                </span>
              </div>
            </button>
            <button
              onClick={() => handleTab('catalogue')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Film className="w-4 h-4 text-amber-300" />
              <div className="flex-1 flex items-center justify-between">
                <span>Movies &amp; Series Catalogue</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">NEW</span>
              </div>
            </button>
            <button
              onClick={() => handleTab('blogs')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>M2A Blogs (Main Site)</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black">
                  Articles
                </span>
              </div>
            </button>
            <button
              onClick={() => handleTab('apps')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Grid className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>Multi Apps</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black">
                  19 Tools
                </span>
              </div>
            </button>
            <button
              onClick={() => handleTab('games')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>Free Games</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[9px] font-black">
                  15 Games
                </span>
              </div>
            </button>
            <button
              onClick={() => handleTab('jobs')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Briefcase className="w-4 h-4 text-blue-400" />
              <div className="flex-1 flex items-center justify-between">
                <span>Jobs & Sponsorships</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black">
                  Global
                </span>
              </div>
            </button>
          </div>

          {/* Website Pages */}
          <div className="space-y-1 mb-6">
            <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest px-2">
              Website Information
            </span>
            <button
              onClick={() => handlePage('/p/about-us.html', 'About Us')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Info className="w-4 h-4 text-slate-400" />
              <span>About Us</span>
            </button>
            <button
              onClick={() => handlePage('/p/contact-us.html', 'Contact Us')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Contact Us</span>
            </button>
            <button
              onClick={() => handlePage('/p/privacy-policy.html', 'Privacy Policy')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => handlePage('/p/terms-and-conditions.html', 'Terms and Conditions')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Terms & Conditions</span>
            </button>
            <button
              onClick={() => handlePage('/p/affiliate-marketing-and-adsense.html', 'Affiliate & AdSense Disclosure')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-200 hover:bg-white/5 hover:text-amber-400 text-sm font-semibold transition"
            >
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <span>Affiliate Disclosure</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center space-y-1">
          <div>
            <a
              href="https://www.marketing2advertising.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-amber-400 transition"
            >
              marketing2advertising.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[9px] text-slate-600 mt-1">Version 2.0 · Mobile PWA & App</p>
        </div>
      </div>
    </div>
  );
};
