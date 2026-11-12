import React from 'react';
import { Sparkles } from 'lucide-react';

interface AdMobBannerProps {
  format?: 'banner' | 'medium' | 'native';
  className?: string;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ format = 'banner', className = '' }) => {
  if (format === 'native') {
    return (
      <div className={`rounded-2xl border border-white/5 bg-[#12121a] p-3.5 my-3 ${className}`}>
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-2">
          <span className="flex items-center gap-1 text-amber-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> AdMob Native
          </span>
          <span className="bg-white/5 px-1.5 py-0.5 rounded text-slate-400">Sponsored</span>
        </div>
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-amber-600/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">Top Remote Tech & Freelance Tools</h4>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
              Discover verified AI software, high-speed cloud hosting, and global career opportunities on M2A.
            </p>
          </div>
          <a
            href="https://www.marketing2advertising.com/p/job-matching-across-ireland-singapore_2.html"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shrink-0 shadow transition"
          >
            Explore
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col items-center justify-center my-2 ${className}`}>
      <div className="w-full max-w-[320px] h-[50px] rounded-lg bg-[#121218] border border-white/5 flex items-center justify-between px-3 text-xs overflow-hidden relative shadow-inner">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-black tracking-wider">
            Ad
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">M2A Network Ads</span>
            <span className="text-[10px] text-slate-500">Sponsored by AdMob</span>
          </div>
        </div>
        <a
          href="https://www.marketing2advertising.com"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
        >
          Learn More →
        </a>
      </div>
    </div>
  );
};
