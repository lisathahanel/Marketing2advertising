import {useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

const FIRIMU_INSTALL_MARKER = 'm2a_firimu_pwa_installed_v1';

function readFirimuInstallMarker(): boolean {
  try {
    return window.localStorage.getItem(FIRIMU_INSTALL_MARKER) === 'true';
  } catch {
    return false;
  }
}

function saveFirimuInstallMarker(): void {
  try {
    window.localStorage.setItem(FIRIMU_INSTALL_MARKER, 'true');
  } catch {
    // Installation can still succeed when storage is unavailable.
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Do not use display-mode: standalone here. The main M2A app has a
    // broader scope (/) and can open /firimu/ inside its installed window.
    // Standalone mode alone therefore does not prove Firimu is installed.
    setIsInstalled(readFirimuInstallMarker());

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      saveFirimuInstallMarker();
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptNativeInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      saveFirimuInstallMarker();
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isNativeInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    promptNativeInstall,
  };
}
