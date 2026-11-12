import React, { useEffect, useState } from 'react';
import { X, Sparkles, ExternalLink } from 'lucide-react';

interface AdMobInterstitialProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const AdMobInterstitial: React.FC<AdMobInterstitialProps> = ({
  isOpen,
  onClose,
  title = 'M2A App Partner'
}) => {
  const [countdown, setCountdown] = useState(3);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(3);
    setCanSkip(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0b0f] p-6 text-white animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black tracking-widest">
            AdMob Interstitial
          </span>
          <span className="text-xs text-slate-400">{title}</span>
        </div>

        {canSkip ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition"
          >
            <span>Skip</span>
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-slate-400 border border-white/10">
            Skip in {countdown}s
          </div>
        )}
      </div>

      {/* Main Ad Body */}
      <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-6">
          <Sparkles className="w-10 h-10 text-black" />
        </div>

        <h3 className="text-xl font-black text-white tracking-wide">
          Unlock International Jobs & Sponsorships
        </h3>
        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
          Explore job matching, visa sponsorship pathways, and remote opportunities across Ireland, Singapore, Norway, Luxembourg, and UAE on M2A Careers.
        </p>

        <a
          href="https://www.marketing2advertising.com/p/job-matching-across-ireland-singapore_2.html"
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-sm shadow-xl hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
        >
          <span>Visit Opportunity Portal</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Bottom Footer Notice */}
      <div className="text-center text-[10px] text-slate-500">
        Google AdMob Partner Network · Non-intrusive mobile ad experience
      </div>
    </div>
  );
};
