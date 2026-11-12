import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __M2A_DEFERRED_INSTALL_PROMPT__?: BeforeInstallPromptEvent;
    __M2A_PWA_LISTENER_READY__?: boolean;
  }
}

// Capture the browser's install event as soon as this module is loaded,
// before React components mount, so the native prompt is not missed.
if (typeof window !== 'undefined' && !window.__M2A_PWA_LISTENER_READY__) {
  window.__M2A_PWA_LISTENER_READY__ = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__M2A_DEFERRED_INSTALL_PROMPT__ = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('m2a:install-prompt-ready'));
  });
  window.addEventListener('appinstalled', () => {
    window.__M2A_DEFERRED_INSTALL_PROMPT__ = undefined;
    window.dispatchEvent(new Event('m2a:app-installed'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== 'undefined' ? window.__M2A_DEFERRED_INSTALL_PROMPT__ || null : null),
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const updatePrompt = () => setDeferredPrompt(window.__M2A_DEFERRED_INSTALL_PROMPT__ || null);
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform || '';
    setIsIOS(/iphone|ipad|ipod/.test(userAgent) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
    setIsAndroid(/android/.test(userAgent));

    window.addEventListener('m2a:install-prompt-ready', updatePrompt);
    window.addEventListener('m2a:app-installed', handleInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    }

    updatePrompt();
    return () => {
      window.removeEventListener('m2a:install-prompt-ready', updatePrompt);
      window.removeEventListener('m2a:app-installed', handleInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt || window.__M2A_DEFERRED_INSTALL_PROMPT__;
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.__M2A_DEFERRED_INSTALL_PROMPT__ = undefined;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable: !!deferredPrompt, isInstalled, isIOS, isAndroid, install };
}
