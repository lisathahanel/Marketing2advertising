import React, { useEffect, useState } from 'react';
import { Tv, Sparkles, ChevronRight } from 'lucide-react';

interface SplashProps {
  onFinish: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Keep the branded introduction brief; it must not hold back the app.
    const hideTimer = window.setTimeout(() => setShow(false), 650);
    const finishTimer = window.setTimeout(onFinish, 950);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const handleSkip = () => {
    setShow(false);
    window.setTimeout(onFinish, 180);
  };

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0b0b0f] p-8 text-center transition-all duration-300 ease-in-out ${show ? 'scale-100 opacity-100' : 'pointer-events-none scale-105 opacity-0'}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#eab30815_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="relative z-10 flex w-full justify-end pt-2">
        <button
          onClick={handleSkip}
          className="flex min-h-10 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
        >
          Skip <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="relative z-10 my-auto flex flex-col items-center">
        <div className="relative mb-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-500/30 bg-gradient-to-tr from-[#1c1c28] via-[#12121a] to-[#242436] p-[2px] shadow-[0_0_50px_rgba(234,179,8,0.25)]">
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[22px] bg-[#0e0e14]">
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-white shadow-sm">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                LIVE
              </div>
              <Tv className="h-10 w-10 text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]" />
              <span className="mt-1 flex items-center gap-1 text-[10px] font-black tracking-wider text-amber-300">
                <Sparkles className="h-2.5 w-2.5 text-amber-400" /> M2A
              </span>
            </div>
          </div>
          <div className="absolute -top-3 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-amber-400/80 blur-[2px]" />
        </div>

        <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-4xl font-black tracking-wider text-transparent drop-shadow-sm">
          M2A
        </h1>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
          Live TV · Multi Apps · Games
        </p>
        <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-slate-300">
          AI Tools | Freelancing | Software | Hosting | Careers
        </p>
      </div>

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center pb-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
        </div>
        <span className="mt-2 font-mono text-[10px] text-slate-400">
          Connecting to marketing2advertising.com...
        </span>
      </div>
    </div>
  );
};
