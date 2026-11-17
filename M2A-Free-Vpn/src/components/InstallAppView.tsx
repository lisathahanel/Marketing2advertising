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
import type { ProtocolType, TunnelHandshake, TunnelKeypair, VpnServer } from '../types/vpn';
import { buildWireGuardConfig } from '../utils/cryptoTunnel';

interface InstallAppViewProps {
  selectedServer: VpnServer;
  entryServer: VpnServer | null;
  multiHopEnabled: boolean;
  protocol: ProtocolType;
  dnsBlocker: boolean;
  keypair: TunnelKeypair | null;
  handshake: TunnelHandshake | null;
}

export function InstallAppView({
  selectedServer,
  entryServer,
  multiHopEnabled,
  protocol,
  dnsBlocker,
  keypair,
  handshake,
}: InstallAppViewProps) {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [installNotice, setInstallNotice] = useState<string | null>(null);

  async function handleOneClickInstall() {
    if (isInstallable) {
      const accepted = await install();
      setInstallNotice(
        accepted
          ? 'M2A Free Vpn installed successfully. Launch it anytime from your app drawer or desktop.'
          : 'Install prompt dismissed. You can install anytime from your browser address bar.'
      );
    } else if (platform === 'ios') {
      setInstallNotice(
        'On iPhone or iPad Safari, tap the Share icon in the browser toolbar and choose "Add to Home Screen".'
      );
    } else {
      setInstallNotice(
        'Open your browser menu (⋮ or ⋯) and select "Install M2A Free Vpn" or "Apps → Install this site as an app".'
      );
    }
  }

  function handleDownloadClientConfig() {
    const config = buildWireGuardConfig({
      server: selectedServer,
      entryServer,
      multiHopEnabled,
      virtualIp: handshake?.assignedVirtualIp || '10.64.18.42',
      clientPublicKey: keypair?.publicKeyBase64 || 'ClientKeyPending',
      protocol,
      dnsBlocker,
    });
    const blob = new Blob([config], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `m2a-free-vpn-${selectedServer.countryCode.toLowerCase()}.conf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Hero Install Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Install M2A Free Vpn on Browser, Mobile & PC
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Run M2A Free Vpn as a dedicated standalone app on Windows, macOS, Linux, Android,
              and iOS, or export a WireGuard profile for native OS-level encrypted tunneling.
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
                {isInstallable ? 'Install M2A Free Vpn Now' : 'Install App on This Device'}
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadClientConfig}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Download .conf ({selectedServer.countryCode})
            </button>
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
              <li>2. Pin M2A Free Vpn to your browser dock for instant 1-click IP masking & WebRTC leak audits.</li>
              <li>3. Works offline with cached UI diagnostics via the built-in service worker.</li>
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
                <p>Tap Share → Add to Home Screen to run M2A Free Vpn in full-screen standalone mode.</p>
              </div>
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-100">Android (Chrome)</div>
                <p>Tap Install App or Menu (⋮) → Install app, and import the .conf profile in WireGuard Mobile for system-wide Wi-Fi protection.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadClientConfig}
            className="mt-6 w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Export Mobile WireGuard Profile
          </button>
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
              <li>1. Install M2A Free Vpn as a desktop window directly from Chrome or Edge.</li>
              <li>2. Download your active WireGuard <span className="font-mono">.conf</span> file for kernel-level PC tunneling and Kill Switch enforcement.</li>
              <li>3. Manage per-app Split Tunneling rules right inside Security & Config.</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={handleDownloadClientConfig}
            className="mt-6 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Download PC Config (.conf)
          </button>
        </div>
      </div>
    </div>
  );
}
