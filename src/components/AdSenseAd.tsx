import React, { useEffect, useRef } from 'react';

const ADS_CLIENT = 'ca-pub-2269884583846743';
const ADS_SLOT = '2906167922';

export const AdSenseAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Load the AdSense library once for the whole single-page app.
    if (!document.querySelector('script[data-m2a-adsense]')) {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.m2aAdsense = 'true';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;
      script.onerror = () => {
        script.dataset.m2aAdsenseFailed = 'true';
        if (navigator.onLine) window.dispatchEvent(new CustomEvent('m2a:adblock-detected'));
      };
      document.head.appendChild(script);
    }

    const node = adRef.current;
    if (!node || node.dataset.m2aPushed === 'true') return;

    try {
      const ads = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []);
      ads.push({});
      node.dataset.m2aPushed = 'true';
    } catch (error) {
      // Ad blockers and network restrictions must never prevent M2A from working.
      console.warn('M2A AdSense unit could not be initialized:', error);
    }
  }, []);

  return (
    <div className={`my-5 w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center ${className}`}>
      <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">Advertisement</span>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={ADS_CLIENT}
        data-ad-slot={ADS_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};
