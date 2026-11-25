import React, {useEffect, useRef} from 'react';
import {ADSENSE_CLIENT, ADSENSE_SLOT} from '../lib/constants.ts';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseUnitProps {
  unitKey: string;
  className?: string;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  unitKey,
  className = '',
}) => {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;
    if (el.getAttribute('data-adsbygoogle-status')) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script blocked or unavailable in offline/dev mode
    }
  }, [unitKey]);

  return (
    <div
      key={unitKey}
      className={`w-full overflow-hidden rounded-xl bg-[#0E111E]/60 ${className}`}
    >
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{display: 'block'}}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};
