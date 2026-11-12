import React from 'react';
import { AdSenseAd } from './AdSenseAd';

interface AdMobBannerProps {
  format?: 'banner' | 'medium' | 'native';
  className?: string;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ format = 'banner', className = '' }) => {
  if (format === 'native') {
    return <AdSenseAd className={className} />;
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
