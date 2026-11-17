import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Coffee,
  Globe,
  Home,
  Lock,
  Plane,
  Power,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  Zap,
} from 'lucide-react';
import type {
  BandwidthSample,
  ClientIdentity,
  ConnectionSpeedMode,
  NetworkEnvironment,
  SecuritySettings,
  SplitTunnelRule,
  TunnelHandshake,
  TunnelStatus,
  VpnServer,
} from '../types/vpn';
import { WorldNodeMap } from './WorldNodeMap';

interface ConnectionViewProps {
  tunnelStatus: TunnelStatus;
  selectedServer: VpnServer;
  entryServer: VpnServer | null;
  servers: VpnServer[];
  favoriteIds: string[];
  identity: ClientIdentity | null;
  identityLoading: boolean;
  handshake: TunnelHandshake | null;
  networkEnv: NetworkEnvironment;
  onChangeNetworkEnv: (env: NetworkEnvironment) => void;
  speedMode: ConnectionSpeedMode;
  onChangeSpeedMode: (mode: ConnectionSpeedMode) => void;
  isOnline: boolean;
  isSlowConnection: boolean;
  security: SecuritySettings;
  splitRules: SplitTunnelRule[];
  elapsedSeconds: number;
  bytesProtected: number;
  bandwidthHistory: BandwidthSample[];
  onToggleConnect: () => void;
  onSelectAndConnect: (server: VpnServer) => void;
  onSimulateDrop: () => void;
  onRestoreFromKillSwitch: () => void;
  onOpenServers: () => void;
  onOpenSecurity: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const REGION_LOCALES: Record<string, { timezone: string; contentAccess: string }> = {
  CH: { timezone: 'CET (UTC+1)', contentAccess: 'Swiss & EU Privacy Region' },
  DE: { timezone: 'CET (UTC+1)', contentAccess: 'Germany Media & News' },
  SE: { timezone: 'CET (UTC+1)', contentAccess: 'Nordic Streaming Region' },
  IS: { timezone: 'GMT (UTC+0)', contentAccess: 'Icelandic Privacy Zone' },
  GB: { timezone: 'GMT (UTC+0)', contentAccess: 'UK Broadcasters & Services' },
  NL: { timezone: 'CET (UTC+1)', contentAccess: 'Netherlands & EU Hub' },
  FR: { timezone: 'CET (UTC+1)', contentAccess: 'France Media & EU Services' },
  ES: { timezone: 'CET (UTC+1)', contentAccess: 'Spain Regional Services' },
  IT: { timezone: 'CET (UTC+1)', contentAccess: 'Italy Media & Catalog' },
  NO: { timezone: 'CET (UTC+1)', contentAccess: 'Norway Nordic Services' },
  FI: { timezone: 'EET (UTC+2)', contentAccess: 'Finland & Baltic Region' },
  PL: { timezone: 'CET (UTC+1)', contentAccess: 'Poland Central Europe' },
  IE: { timezone: 'GMT (UTC+0)', contentAccess: 'Ireland & EU Services' },
  AT: { timezone: 'CET (UTC+1)', contentAccess: 'Austria & DACH Region' },
  PT: { timezone: 'WET (UTC+0)', contentAccess: 'Portugal & Iberian Catalog' },
  US: { timezone: 'EST / PST', contentAccess: 'US Streaming & Domestic Catalogs' },
  CA: { timezone: 'EST (UTC-5)', contentAccess: 'Canada Regional Services' },
  MX: { timezone: 'CST (UTC-6)', contentAccess: 'Mexico & Latin America' },
  BR: { timezone: 'BRT (UTC-3)', contentAccess: 'South America Regional Catalog' },
  AR: { timezone: 'ART (UTC-3)', contentAccess: 'Argentina Regional Services' },
  CL: { timezone: 'CLT (UTC-4)', contentAccess: 'Chile Regional Services' },
  CO: { timezone: 'COT (UTC-5)', contentAccess: 'Colombia Regional Services' },
  JP: { timezone: 'JST (UTC+9)', contentAccess: 'Japan Streaming & Gaming' },
  KR: { timezone: 'KST (UTC+9)', contentAccess: 'South Korea Low-Latency Hub' },
  SG: { timezone: 'SGT (UTC+8)', contentAccess: 'APAC Low-Latency Hub' },
  IN: { timezone: 'IST (UTC+5:30)', contentAccess: 'India Regional Catalog' },
  TW: { timezone: 'CST (UTC+8)', contentAccess: 'Taiwan APAC Services' },
  AU: { timezone: 'AEDT (UTC+11)', contentAccess: 'Australia Regional Services' },
  NZ: { timezone: 'NZDT (UTC+13)', contentAccess: 'New Zealand Services' },
  AE: { timezone: 'GST (UTC+4)', contentAccess: 'UAE & Gulf Region' },
  IL: { timezone: 'IST (UTC+2)', contentAccess: 'Israel Regional Services' },
  TR: { timezone: 'TRT (UTC+3)', contentAccess: 'Turkey Regional Catalog' },
  ZA: { timezone: 'SAST (UTC+2)', contentAccess: 'South Africa Regional Hub' },
};

export function ConnectionView({
  tunnelStatus,
  selectedServer,
  entryServer,
  servers,
  favoriteIds,
  identity,
  identityLoading,
  handshake,
  networkEnv,
  onChangeNetworkEnv,
  speedMode,
  onChangeSpeedMode,
  isOnline,
  isSlowConnection,
  security,
  splitRules,
  elapsedSeconds,
  bytesProtected,
  bandwidthHistory,
  onToggleConnect,
  onSelectAndConnect,
  onSimulateDrop,
  onRestoreFromKillSwitch,
  onOpenServers,
  onOpenSecurity,
}: ConnectionViewProps) {
  const isConnected = tunnelStatus === 'connected';
  const isConnecting = tunnelStatus === 'connecting';
  const isKillSwitchLocked = tunnelStatus === 'killswitch-locked';
  const isPublicWifi = networkEnv !== 'home-isp';

  const latestSample = bandwidthHistory[bandwidthHistory.length - 1] || {
    downloadMbps: 0,
    uploadMbps: 0,
  };

  const quickServers = servers
    .filter((s) => favoriteIds.includes(s.id) || s.id === selectedServer.id)
    .slice(0, 4);

  if (quickServers.length < 4) {
    for (const candidate of servers) {
      if (!quickServers.some((q) => q.id === candidate.id)) {
        quickServers.push(candidate);
      }
      if (quickServers.length === 4) break;
    }
  }

  const maxSpeed = Math.max(
    120,
    ...bandwidthHistory.map((b) => Math.max(b.downloadMbps, b.uploadMbps))
  );

  const localeMeta = REGION_LOCALES[selectedServer.countryCode] || {
    timezone: 'UTC',
    contentAccess: `${selectedServer.country} Regional Access`,
  };

  const vpnAppsCount = splitRules.filter((r) => r.enabled && r.mode === 'force-vpn').length;
  const bypassAppsCount = splitRules.filter((r) => r.enabled && r.mode === 'bypass').length;

  return (
    <div className="space-y-6">
      {/* Kill Switch Locked Banner when connection drops unexpectedly */}
      {isKillSwitchLocked && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-4 rounded-xl border border-red-300 bg-red-50 p-5 dark:border-red-900/70 dark:bg-red-950/30 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-red-900 dark:text-red-200">
                Kill Switch Engaged — All Internet Traffic Blocked
              </h2>
              <p className="mt-1 text-sm text-red-800 dark:text-red-300/90">
                The VPN tunnel dropped unexpectedly. Your firewall cut off outbound connections to
                prevent your real IP ({identity?.ip || 'Origin IP'}) and data from leaking onto{' '}
                {networkEnv === 'public-cafe'
                  ? 'Café Public Wi-Fi'
                  : networkEnv === 'airport-wifi'
                    ? 'Airport Terminal Wi-Fi'
                    : 'your ISP'}
                .
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onRestoreFromKillSwitch}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap shrink-0"
            >
              Reconnect Tunnel
            </button>
            <button
              type="button"
              onClick={onToggleConnect}
              className="rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950 whitespace-nowrap shrink-0"
            >
              Unlock Direct Access
            </button>
          </div>
        </div>
      )}

      {/* Primary Focal Anchor: Connection Control Deck */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Protected — Encrypted Tunnel Active
                </span>
              ) : isConnecting ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400">
                  <Zap className="h-4 w-4" />
                  Establishing Encrypted Handshake…
                </span>
              ) : isKillSwitchLocked ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4" />
                  Kill Switch Locked — Outbound Traffic Halted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Unprotected — Connection Exposed to {isPublicWifi ? 'Public Wi-Fi' : 'ISP'}
                </span>
              )}

              <span className="text-xs text-slate-400 dark:text-slate-600" aria-hidden="true">
                ·
              </span>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Kill Switch {security.killSwitch ? 'Armed' : 'Off'}
                <span aria-hidden="true"> · </span>
                {security.protocol}
                {security.multiHopEnabled ? ' · Multi-Hop' : ''}
                {handshake?.mode === 'offline-cached'
                  ? ' · Offline Cached Key'
                  : handshake?.mode === 'slow-network-optimized' ||
                      speedMode === 'slow-network' ||
                      security.lowBandwidthMode ||
                      isSlowConnection
                    ? ' · Slow-Link Optimized'
                    : ''}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl text-balance">
              {isConnected
                ? `Connected via ${selectedServer.city}, ${selectedServer.country}`
                : isKillSwitchLocked
                  ? 'Zero-Leak Firewall Lock Active'
                  : isPublicWifi
                    ? 'Your public Wi-Fi traffic is currently visible'
                    : 'Ready to encrypt your internet connection'}
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {isConnected
                ? `Your real IP address is hidden behind ${selectedServer.exitIp}. All routed packets are sealed with ${
                    security.protocol === 'WireGuard' ? 'ChaCha20-Poly1305' : 'AES-256-GCM'
                  }, shielding passwords, personal details, and browsing history from hackers and ISPs.`
                : isKillSwitchLocked
                  ? 'All non-tunnel sockets are blocked until you reconnect or intentionally release the kill switch.'
                  : 'Connect to route your traffic through an encrypted private tunnel, mask your IP address, and browse as if located in your chosen region.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isConnected && (
              <button
                type="button"
                onClick={onSimulateDrop}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Test Connection Drop
              </button>
            )}

            <button
              type="button"
              onClick={isKillSwitchLocked ? onRestoreFromKillSwitch : onToggleConnect}
              disabled={isConnecting}
              className={`inline-flex items-center justify-center gap-2.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-60 ${
                isConnected
                  ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                  : isKillSwitchLocked
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400'
              }`}
            >
              <Power className="h-4 w-4" />
              {isConnected
                ? 'Disconnect'
                : isConnecting
                  ? 'Connecting…'
                  : isKillSwitchLocked
                    ? 'Reconnect Now'
                    : `Connect to ${selectedServer.city}`}
            </button>
          </div>
        </div>

        {/* Network Environment & Link Quality Selector Toolbar */}
        <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Wifi className="h-4 w-4 text-slate-400" />
              <span>Network:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
              {(
                [
                  { id: 'home-isp', label: 'Home Fiber ISP', icon: Home },
                  { id: 'public-cafe', label: 'Public Café Wi-Fi', icon: Coffee },
                  { id: 'airport-wifi', label: 'Airport Wi-Fi', icon: Plane },
                ] as const
              ).map((env) => {
                const Icon = env.icon;
                const active = networkEnv === env.id;
                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => onChangeNetworkEnv(env.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{env.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Link Mode:</span>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
              {(
                [
                  { id: 'auto', label: !isOnline ? 'Auto (Offline)' : isSlowConnection ? 'Auto (Slow)' : 'Auto (Fast)' },
                  { id: 'slow-network', label: 'Slow 2G/3G' },
                  { id: 'offline-cache', label: 'Offline Mode' },
                ] as const
              ).map((modeOpt) => {
                const active = speedMode === modeOpt.id;
                return (
                  <button
                    key={modeOpt.id}
                    type="button"
                    onClick={() => onChangeSpeedMode(modeOpt.id)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {modeOpt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4-Column Identity & Tunnel Metrics Strip */}
        <div className="mt-5 grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 pt-5 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-2 sm:divide-y-0 sm:gap-6 xl:grid-cols-4">
          <div className="py-2 sm:py-0">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Visible Public IP
            </div>
            <div className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {isConnected
                ? selectedServer.exitIp
                : isKillSwitchLocked
                  ? '0.0.0.0 (Blocked)'
                  : identityLoading
                    ? 'Detecting…'
                    : identity?.ip || '192.0.2.14'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isConnected
                ? `Origin ${identity?.ip || 'IP'} masked`
                : isKillSwitchLocked
                  ? 'No external IP exposed'
                  : `${identity?.isp || 'Upstream ISP'} · Exposed`}
            </div>
          </div>

          <div className="py-2 sm:py-0 xl:border-l xl:border-slate-200 xl:pl-6 dark:xl:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tunnel Cipher & Interface
            </div>
            <div className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {isConnected
                ? security.protocol === 'WireGuard'
                  ? 'ChaCha20-Poly1305'
                  : 'AES-256-GCM'
                : isKillSwitchLocked
                  ? 'Firewall Drop'
                  : 'Plaintext / Unwrapped'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isConnected && handshake
                ? `${handshake.assignedVirtualIp} · ${handshake.transport}/${handshake.port} · MTU ${handshake.mtu}`
                : '256-bit ephemeral session keys'}
            </div>
          </div>

          <div className="py-2 sm:py-0 xl:border-l xl:border-slate-200 xl:pl-6 dark:xl:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Browsing Region & DNS
            </div>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {isConnected
                ? `${selectedServer.city}, ${selectedServer.countryCode}`
                : isKillSwitchLocked
                  ? 'DNS Blocked'
                  : `${identity?.city || 'Local'} (Unmasked)`}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isConnected
                ? `${localeMeta.timezone} · Private DNS 10.64.0.1`
                : 'ISP / Local router DNS visible'}
            </div>
          </div>

          <div className="py-2 sm:py-0 xl:border-l xl:border-slate-200 xl:pl-6 dark:xl:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Protected Data & Uptime
            </div>
            <div className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {isConnected ? formatBytes(bytesProtected) : '0 B'}
            </div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {isConnected ? `Session ${formatDuration(elapsedSeconds)}` : '00:00:00 · Idle'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: World Node Map + Right Column (Throughput + Split Tunneling + Region) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <WorldNodeMap
            servers={servers}
            selectedServer={selectedServer}
            entryServer={entryServer}
            multiHopEnabled={security.multiHopEnabled}
            tunnelStatus={tunnelStatus}
            onSelectServer={onSelectAndConnect}
            originCity={identity?.city && identity.city !== 'Local Subnet' ? identity.city : 'Your Device'}
          />
        </div>

        <div className="space-y-6 xl:col-span-4">
          {/* Live Throughput & Geo-Region Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-500" />
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tunnel Throughput
                </h2>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {isConnected ? `${selectedServer.baseLatencyMs} ms RTT` : 'Standby'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Download</div>
                <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {isConnected ? latestSample.downloadMbps.toFixed(1) : '0.0'}{' '}
                  <span className="text-xs font-normal text-slate-500">Mbps</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Upload</div>
                <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {isConnected ? latestSample.uploadMbps.toFixed(1) : '0.0'}{' '}
                  <span className="text-xs font-normal text-slate-500">Mbps</span>
                </div>
              </div>
            </div>

            {/* Clean SVG Sparkline */}
            <div className="mt-4 h-20 w-full rounded-lg bg-slate-50 p-2 dark:bg-[#0B111E]">
              <svg viewBox="0 0 240 60" className="h-full w-full" preserveAspectRatio="none">
                {bandwidthHistory.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={bandwidthHistory
                        .map((sample, idx) => {
                          const x = (idx / Math.max(1, bandwidthHistory.length - 1)) * 240;
                          const y = 56 - (sample.downloadMbps / maxSpeed) * 48;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      points={bandwidthHistory
                        .map((sample, idx) => {
                          const x = (idx / Math.max(1, bandwidthHistory.length - 1)) * 240;
                          const y = 56 - (sample.uploadMbps / maxSpeed) * 48;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ')}
                    />
                  </>
                )}
              </svg>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Simulated Region</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {localeMeta.contentAccess}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Split Tunneling</span>
                <button
                  type="button"
                  onClick={onOpenSecurity}
                  className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  {vpnAppsCount} VPN · {bypassAppsCount} Bypass
                </button>
              </div>
            </div>
          </div>

          {/* Quick-Select Exit Nodes */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-500" />
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Quick Exit Locations
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenServers}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                All {servers.length} Locations
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {quickServers.map((server) => {
                const isSelected = server.id === selectedServer.id;
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => onSelectAndConnect(server)}
                    className="flex w-full items-center justify-between py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-md px-1.5"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {server.city}, {server.countryCode}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {server.ramOnly ? 'RAM-Only' : 'Audited'} · {server.loadPercent}% load
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {server.baseLatencyMs} ms
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isSelected && isConnected
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isSelected
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {isSelected && isConnected ? 'Active' : isSelected ? 'Selected' : 'Switch'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
