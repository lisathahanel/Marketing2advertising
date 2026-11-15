import React, { useEffect, useRef } from 'react';

const ADS_CLIENT = 'ca-pub-2269884583846743';
const ADS_SLOT = '2906167922';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __M2A_ADSENSE_READY__?: Promise<void>;
  }
}

function loadAdSense(): Promise<void> {
  if (window.__M2A_ADSENSE_READY__) return window.__M2A_ADSENSE_READY__;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.m2aAdsense = 'true';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;

  window.__M2A_ADSENSE_READY__ = new Promise<void>((resolve, reject) => {
    script.onload = () => {
      script.dataset.m2aLoaded = 'true';
      resolve();
    };
    script.onerror = () => {
      script.dataset.m2aAdsenseFailed = 'true';
      reject(new Error('AdSense script could not be loaded.'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    window.__M2A_ADSENSE_READY__ = undefined;
    if (navigator.onLine) window.dispatchEvent(new CustomEvent('m2a:adblock-detected'));
    throw error;
  });

  return window.__M2A_ADSENSE_READY__;
}

export const AdSenseAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let cancelled = false;
    const node = adRef.current;
    if (!node || node.dataset.m2aPushed === 'true') return;

    loadAdSense()
      .then(() => {
        if (cancelled || !node.isConnected || node.dataset.m2aPushed === 'true') return;
        const ads = (window.adsbygoogle ||= []);
        ads.push({});
        node.dataset.m2aPushed = 'true';
      })
      .catch((error) => {
        console.warn('M2A AdSense unit could not be initialized:', error);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className={`my-5 min-h-[126px] w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center ${className}`}>
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">Advertisement</span>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', width: '100%', minHeight: 100 }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={ADS_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};


const FLUID_AD_SLOT = '6730887197';
const FLUID_LAYOUT_KEY = '-gw-3+1f-3d+2z';

export const AdSenseFluidAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let cancelled = false;
    const node = adRef.current;
    if (!node || node.dataset.m2aPushed === 'true') return;

    loadAdSense()
      .then(() => {
        if (cancelled || !node.isConnected || node.dataset.m2aPushed === 'true') return;
        (window.adsbygoogle ||= []).push({});
        node.dataset.m2aPushed = 'true';
      })
      .catch((error) => {
        console.warn('M2A fluid AdSense unit could not be initialized:', error);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className={`my-5 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] px-2 py-3 text-center ${className}`}>
      <span className="mb-2 block text-[9px] font-black uppercase tracking-[.2em] text-slate-400">AD</span>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={FLUID_AD_SLOT}
        data-ad-format="fluid"
        data-ad-layout-key={FLUID_LAYOUT_KEY}
      />
    </div>
  );
};
