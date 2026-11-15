import React, { useEffect, useState } from 'react';

export const AdBlockGuard: React.FC = () => {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const showMessage = () => setBlocked(true);
    window.addEventListener('m2a:adblock-detected', showMessage);
    // The off-screen bait does not load or request an advert.
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

  useEffect(() => {
    if (!blocked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [blocked]);

  return (
    <>
      <style>{`
        #x_block_msg { position:fixed!important; inset:0!important; z-index:9999999!important; width:100vw!important; height:100vh!important; display:flex; justify-content:center!important; align-items:center!important; padding:20px; box-sizing:border-box; background:rgba(255,255,255,.15)!important; backdrop-filter:blur(14px) saturate(180%); -webkit-backdrop-filter:blur(14px) saturate(180%); }
        #x_block_msg .ab-container { max-width:420px; width:100%; text-align:center; padding:35px 30px; border-radius:20px; background:rgba(255,255,255,.92); border:1px solid rgba(255,255,255,.6); box-shadow:0 8px 32px rgba(0,0,0,.18); color:#111; font-family:system-ui,-apple-system,sans-serif; animation:abPop .4s ease; }
        #x_block_msg h1 { font-size:22px; font-weight:800; margin:0 0 12px; }
        #x_block_msg p { font-size:15px; line-height:1.6; margin:0 0 10px; color:#444; }
        #x_block_msg button { margin-top:18px; padding:12px 24px; border:0; border-radius:99px; background:#111; color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
        @keyframes abPop { from { opacity:0; transform:translateY(15px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        #x_probe_42 { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }
      `}</style>
      <div className='adsbox' id='x_probe_42' aria-hidden='true' />
      {blocked && (
        <div id='x_block_msg' role='dialog' aria-modal='true' aria-labelledby='x_block_title'>
          <div className='ab-container'>
            <h1 id='x_block_title'>🚫 Ad Blocker Detected</h1>
            <p>We've detected an ad blocker or a browser setting that is blocking advertisements.</p>
            <p>Please disable the blocker or whitelist M2A, then refresh the page to continue.</p>
            <button type='button' onClick={() => window.location.reload()}>🔄 Refresh Page</button>
          </div>
        </div>
      )}
    </>
  );
};
