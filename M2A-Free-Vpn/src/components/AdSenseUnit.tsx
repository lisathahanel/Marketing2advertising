import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function AdSenseUnit() {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore if AdSense script is blocked or not yet loaded
    }
  }, []);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-[#111827]">
      <div className="mb-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
        Advertisement
      </div>
      {/* Vertical New */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '64px' }}
        data-ad-client="ca-pub-2269884583846743"
        data-ad-slot="2906167922"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
