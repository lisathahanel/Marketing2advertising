import { useState } from 'react';
import {
  Check,
  Chrome,
  Download,
  Laptop,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
export function InstallAppView() {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [installNotice, setInstallNotice] = useState<string | null>(null);

  async function handleOneClickInstall() {
    if (isInstallable) {
      const accepted = await install();
      setInstallNotice(
        accepted
          ? 'M2A IP Shield installed successfully. Launch it anytime from your app drawer or desktop.'
          : 'Install prompt dismissed. You can install anytime from your browser address bar.'
      );
    } else if (platform === 'ios') {
      setInstallNotice(
        'On iPhone or iPad Safari, tap the Share icon in the browser toolbar and choose "Add to Home Screen".'
      );
    } else {
      setInstallNotice(
        'Open your browser menu (⋮ or ⋯) and select "Install M2A IP Shield" or "Apps → Install this site as an app".'
      );
    }
  }



  return (
    <div className="space-y-6">
      {/* Hero Install Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Install M2A IP Shield on Your Devices
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Install the M2A IP Shield dashboard as a standalone web app on compatible browsers. Native VPN clients for Android and desktop are being built separately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isInstalled ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/15 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Installed Standalone App Active
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleOneClickInstall()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" />
                {isInstallable ? 'Install M2A IP Shield Now' : 'Install App on This Device'}
              </button>
            )}

          </div>
        </div>

        {installNotice && (
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
            {installNotice}
          </div>
        )}
      </div>

      {/* 3-Platform Cards: Browser, Mobile, PC */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Browser */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Chrome className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Browser App & Shield
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chrome · Edge · Brave · Opera · Safari
                </p>
              </div>
            </div>

            <ol className="mt-5 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>1. Click the install icon in your browser address bar or use the button above.</li>
              <li>2. Install the dashboard for quick access to your public-IP check and browser diagnostics. It does not change your network route.</li>
              <li>3. The dashboard shell can open offline; public-IP and network checks still require an internet connection.</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => void handleOneClickInstall()}
            className="mt-6 w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {isInstallable ? 'Install in Browser' : 'Browser Install Guide'}
          </button>
        </div>

        {/* Mobile */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Mobile (iOS & Android)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  iPhone · iPad · Android Phones & Tablets
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">iOS (Safari)</div>
                <p>Tap Share → Add to Home Screen to add the M2A IP Shield dashboard. This does not install a system VPN.</p>
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">Android (Chrome)</div>
                <p>Tap Install App or Menu (⋮) → Install app to add the dashboard. Full-device VPN protection will require the native M2A Android app.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-200">
            Native Android VPN app is in development. No connectable profile is available yet.
          </div>
        </div>

        {/* PC & Desktop */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300">
                {platform === 'desktop' ? <Monitor className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  PC & Mac Desktop
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Windows 10/11 · macOS · Ubuntu / Linux
                </p>
              </div>
            </div>

            <ol className="mt-5 space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <li>1. Install M2A IP Shield as a desktop window directly from Chrome or Edge.</li>
              <li>2. Download your active WireGuard <span className="font-mono">.conf</span> file for kernel-level PC tunneling and Kill Switch enforcement.</li>
              <li>3. Manage per-app Split Tunneling rules right inside Security & Config.</li>
            </ol>
          </div>

          <div className="mt-6 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-200">
            Native Windows, macOS and Linux VPN clients are planned. Installing this PWA only installs the dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}
