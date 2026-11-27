import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdSenseSlotProps {
  isOnline?: boolean;
  clientId?: string;
  slotId?: string;
  slotKey?: string | number;
  format?: 'auto' | 'vertical' | 'rectangle' | 'horizontal';
  minHeightClass?: string;
  className?: string;
}

const ADSENSE_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2269884583846743';

function ensureAdSenseScriptLoaded() {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(
    'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
  );
  if (existing) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = ADSENSE_SCRIPT_SRC;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function AdSenseSlot({
  isOnline = true,
  clientId = 'ca-pub-2269884583846743',
  slotId = '2906167922',
  slotKey = 'default',
  format = 'auto',
  minHeightClass = 'min-h-[100px]',
  className = '',
}: AdSenseSlotProps) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!isOnline) return;
    ensureAdSenseScriptLoaded();

    const el = insRef.current;
    if (!el) return;

    let cancelled = false;
    let rafId = 0;
    let observer: ResizeObserver | null = null;

    const tryPush = () => {
      if (cancelled) return false;
      if (el.getAttribute('data-adsbygoogle-status')) return true;
      // Wait until container has real positive width so AdSense never fails with availableWidth=0
      if (el.offsetWidth < 120) return false;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        return true;
      } catch {
        return false;
      }
    };

    rafId = requestAnimationFrame(() => {
      if (tryPush()) return;
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          if (tryPush() && observer) {
            observer.disconnect();
            observer = null;
          }
        });
        observer.observe(el);
      }
    });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, [isOnline, slotId, slotKey]);

  if (!isOnline) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`rounded-xl border border-zinc-800/80 bg-[#121215] px-3 py-2.5 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        <span>Advertisement</span>
      </div>
      <div className={`w-full min-w-[250px] rounded-lg bg-[#09090B]/50 ${minHeightClass}`}>
        <ins
          key={`${slotId}-${slotKey}`}
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
