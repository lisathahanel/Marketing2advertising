import { Cloud, FileKey2, Info, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ClientIdentity } from '../types/vpn';

type ProviderMode = 'm2a' | 'personal';

interface ProviderModePanelProps {
  mode: ProviderMode;
  onChangeMode: (mode: ProviderMode) => void;
  notice: string | null;
  identity: ClientIdentity | null;
  identityLoading: boolean;
  onRefreshIdentity: () => void;
}

export function ProviderModePanel({
  mode,
  onChangeMode,
  notice,
  identity,
  identityLoading,
  onRefreshIdentity,
}: ProviderModePanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              M2A IP Shield
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Your IP. Your Privacy. Your Choice.</span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Take control of your online identity.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Check the public IP websites can see, then choose how you want to connect. A real VPN connection will only be shown as protected after a native tunnel is verified.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">1. See your IP</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">2. Choose a provider</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">3. Verify protection</span>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-[#0D1727] sm:p-6 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your current public IP</div>
          <div className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {identityLoading ? 'Checking…' : identity?.ip || 'Not available'}
          </div>
          {identity && (
            <div className="mt-2 grid grid-cols-1 gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:grid-cols-2">
              <span>IPv4: {identity.ipv4 || 'Not detected'}</span>
              <span>IPv6: {identity.ipv6 || 'Not detected'}</span>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{identity ? 'Public IP detected by an external lookup service' : 'IP lookup is unavailable right now'}</span>
            <button type="button" onClick={onRefreshIdentity} disabled={identityLoading} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <RefreshCw className={`h-3 w-3 ${identityLoading ? 'animate-spin' : ''}`} />
              {identityLoading ? 'Checking' : 'Refresh IP'}
            </button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            The IP lookup uses api.ipify.org and api6.ipify.org. Those services receive your public IP address to return the result. Selecting a provider does not change it until a real VPN tunnel is connected.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">Choose your connection method</h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Two ways to use IP Shield</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            aria-pressed={mode === 'm2a'}
            onClick={() => onChangeMode('m2a')}
            className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${mode === 'm2a' ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-[#111827] dark:hover:border-slate-600'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><Cloud className="h-5 w-5" /></span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${mode === 'm2a' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{mode === 'm2a' ? 'Selected' : 'Choose'}</span>
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">M2A Free Network</div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">M2A-managed VPN locations. Designed for a simple one-tap connection once verified servers are deployed.</p>
            <div className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">Server rollout required</div>
          </button>

          <button
            type="button"
            aria-pressed={mode === 'personal'}
            onClick={() => onChangeMode('personal')}
            className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${mode === 'personal' ? 'border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-[#111827] dark:hover:border-slate-600'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300"><FileKey2 className="h-5 w-5" /></span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${mode === 'personal' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{mode === 'personal' ? 'Selected' : 'Choose'}</span>
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">My Private Server</div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Use your own WireGuard server and keep its private key under your control on your device.</p>
            <div className="mt-3 text-[11px] font-medium text-sky-700 dark:text-sky-300">Native profile support required</div>
          </button>
        </div>
        {notice && (
          <div role="status" className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-200">
            {notice}
          </div>
        )}
        <p className="mt-4 rounded-lg bg-slate-100 px-3.5 py-3 text-[11px] leading-5 text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
          Browser limitation: this dashboard cannot create a system-wide VPN, enforce an operating-system kill switch, or route individual device apps. Those protections require a native VPN client and a verified VPN server.
        </p>
      </div>
    </section>
  );
}
