import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseUnit() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script may be blocked by ad blockers or offline environments
    }
  }, []);

  return (
    <aside
      aria-label="Advertisement"
      className="rounded-xl border border-slate-200/90 bg-white p-4"
    >
      <div className="mb-2 text-center text-xs font-medium tracking-wide text-slate-500">
        Advertisement
      </div>
      <div className="min-h-[120px] lg:min-h-[250px] w-full overflow-hidden rounded-lg bg-slate-50 flex items-center justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-2269884583846743"
          data-ad-slot="2906167922"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
