import React, { useEffect, useState } from 'react';

export const AdBlockGuard: React.FC = () => {
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const showMessage = () => setBlocked(true);
    window.addEventListener('m2a:adblock-detected', showMessage);
    // This probe only detects blocking; it never loads or requests an advert.
    const timer = window.setTimeout(() => {
      const probe = document.getElementById('x_probe_42');
      const adsScript = document.querySelector('script[data-m2a-adsense]') as HTMLScriptElement | null;
      const baitHidden = !!probe && (probe.offsetWidth === 0 || probe.offsetHeight === 0);
      const adsScriptBlocked = adsScript?.dataset.m2aAdsenseFailed === 'true';
      if (navigator.onLine && (baitHidden || adsScriptBlocked)) setBlocked(true);
    }, 1400);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('m2a:adblock-detected', showMessage);
    };
  }, []);

  return (
    <>
      <style>{`
        #x_block_msg { position:fixed!important; left:12px!important; right:12px!important; bottom:calc(12px + env(safe-area-inset-bottom))!important; z-index:9999!important; display:flex; justify-content:center!important; pointer-events:none; }
        #x_block_msg .ab-container { pointer-events:auto; max-width:560px; width:100%; display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:rgba(18,24,35,.96); border:1px solid rgba(255,255,255,.14); box-shadow:0 8px 28px rgba(0,0,0,.24); color:#f8fafc; font-family:system-ui,-apple-system,sans-serif; }
        #x_block_msg .ab-copy { flex:1; min-width:0; }
        #x_block_msg h2 { font-size:13px; font-weight:750; margin:0 0 3px; }
        #x_block_msg p { font-size:12px; line-height:1.45; margin:0; color:#cbd5e1; }
        #x_block_msg button { flex:0 0 auto; padding:8px 10px; border:1px solid rgba(255,255,255,.18); border-radius:9px; background:rgba(255,255,255,.08); color:#fff; font-size:12px; font-weight:650; cursor:pointer; }
        #x_block_msg button:hover { background:rgba(255,255,255,.15); }
        #x_probe_42 { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }
        @media (max-width:420px) { #x_block_msg .ab-container { align-items:flex-start; padding:11px; gap:8px; } #x_block_msg h2 { font-size:12px; } #x_block_msg p { font-size:11px; } #x_block_msg button { padding:7px 8px; } }
      `}</style>
      <div className='adsbox' id='x_probe_42' aria-hidden='true' />
      {blocked && !dismissed && (
        <div id='x_block_msg' role='status' aria-live='polite'>
          <div className='ab-container'>
            <div className='ab-copy'>
              <h2>Ad blocker detected</h2>
              <p>Some ads may not appear. You can continue browsing M2A normally.</p>
            </div>
            <button type='button' aria-label='Dismiss ad blocker notice' onClick={() => setDismissed(true)}>Dismiss</button>
          </div>
        </div>
      )}
    </>
  );
};
