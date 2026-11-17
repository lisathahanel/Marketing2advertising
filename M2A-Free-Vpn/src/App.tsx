import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Menu, Moon, Power, Sun } from 'lucide-react';
import { AdSenseUnit } from './components/AdSenseUnit';
import { ConnectionView } from './components/ConnectionView';
import { ProviderModePanel } from './components/ProviderModePanel';
import { Footer } from './components/Footer';
import { InstallAppView } from './components/InstallAppView';
import { SecurityConfigView } from './components/SecurityConfigView';
import { ServersView } from './components/ServersView';
import { Sidebar } from './components/Sidebar';
import { TunnelLabView } from './components/TunnelLabView';
import { VPN_SERVERS } from './data/servers';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import type {
  BandwidthSample,
  ClientIdentity,
  ConnectionSpeedMode,
  NetworkEnvironment,
  ProtocolType,
  SecuritySettings,
  SplitTunnelRule,
  TunnelHandshake,
  TunnelKeypair,
  TunnelStatus,
  VpnServer,
  WorkspaceTab,
} from './types/vpn';
import { lookupClientIdentity } from './utils/networkIdentity';

const DEFAULT_SECURITY: SecuritySettings = {
  killSwitch: true,
  autoConnectPublicWifi: true,
  dnsTrackerBlocker: true,
  webrtcProtection: true,
  ipv6LeakGuard: true,
  multiHopEnabled: false,
  lowBandwidthMode: true,
  protocol: 'WireGuard',
};

const DEFAULT_SPLIT_RULES: SplitTunnelRule[] = [
  { id: 'app-chrome', target: 'Google Chrome', category: 'Application', mode: 'force-vpn', enabled: true },
  { id: 'app-slack', target: 'Slack Desktop', category: 'Application', mode: 'force-vpn', enabled: true },
  { id: 'app-zoom', target: 'Zoom Video', category: 'Application', mode: 'bypass', enabled: true },
  { id: 'app-steam', target: 'Steam Client', category: 'Application', mode: 'bypass', enabled: true },
  { id: 'app-p2p', target: 'BitTorrent Client', category: 'Application', mode: 'force-vpn', enabled: true },
  { id: 'subnet-lan', target: '192.168.1.0/24 (LAN Printer)', category: 'Local Subnet', mode: 'bypass', enabled: true },
];

const TAB_TITLES: Record<WorkspaceTab, string> = {
  connection: 'Connection Overview',
  servers: 'Global Locations',
  'tunnel-lab': 'Tunnel & Leak Lab',
  security: 'Security & Config',
  install: 'Install Apps (Browser · Mobile · PC)',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    readStorage<'dark' | 'light'>('m2a_theme', 'dark')
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('connection');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [providerMode, setProviderMode] = useState<'m2a' | 'personal'>('m2a');
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  const [selectedServerId, setSelectedServerId] = useState<string>(() =>
    readStorage<string>('m2a_server_id', VPN_SERVERS[0].id)
  );
  const [entryServerId, setEntryServerId] = useState<string>(() =>
    readStorage<string>('m2a_entry_server_id', VPN_SERVERS[2].id)
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    readStorage<string[]>('m2a_favorites', ['ch-zrh-01', 'us-nyc-01', 'jp-tyo-01'])
  );
  const [security, setSecurity] = useState<SecuritySettings>(() =>
    readStorage<SecuritySettings>('m2a_security', DEFAULT_SECURITY)
  );
  const [splitRules, setSplitRules] = useState<SplitTunnelRule[]>(() =>
    readStorage<SplitTunnelRule[]>('m2a_split_rules', DEFAULT_SPLIT_RULES)
  );

  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>('disconnected');
  const [networkEnv, setNetworkEnv] = useState<NetworkEnvironment>('home-isp');
  const [speedMode, setSpeedMode] = useState<ConnectionSpeedMode>('auto');
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [keypair, setKeypair] = useState<TunnelKeypair | null>(null);
  const [handshake, setHandshake] = useState<TunnelHandshake | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bytesProtected, setBytesProtected] = useState(0);
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthSample[]>([
    { timestamp: '0', downloadMbps: 0, uploadMbps: 0 },
    { timestamp: '1', downloadMbps: 0, uploadMbps: 0 },
  ]);

  const connectTimerRef = useRef<number | null>(null);
  const { isOnline, isSlowConnection } = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const refreshIdentity = useCallback(async () => {
    setIdentityLoading(true);
    try {
      const nextIdentity = await lookupClientIdentity();
      setIdentity(nextIdentity);
    } catch {
      setIdentity(null);
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  const selectedServer = useMemo(
    () => VPN_SERVERS.find((s) => s.id === selectedServerId) || VPN_SERVERS[0],
    [selectedServerId]
  );

  const entryServer = useMemo(() => {
    const found = VPN_SERVERS.find((s) => s.id === entryServerId && s.id !== selectedServer.id);
    if (found) return found;
    return VPN_SERVERS.find((s) => s.multiHopReady && s.id !== selectedServer.id) || null;
  }, [entryServerId, selectedServer.id]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('m2a_theme', JSON.stringify(theme));
    } catch {
      // ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem('m2a_server_id', JSON.stringify(selectedServerId));
      window.localStorage.setItem('m2a_entry_server_id', JSON.stringify(entryServerId));
      window.localStorage.setItem('m2a_favorites', JSON.stringify(favoriteIds));
      window.localStorage.setItem('m2a_security', JSON.stringify(security));
      window.localStorage.setItem('m2a_split_rules', JSON.stringify(splitRules));
    } catch {
      // ignore storage errors
    }
  }, [selectedServerId, entryServerId, favoriteIds, security, splitRules]);

  useEffect(() => {
    void refreshIdentity();
  }, [refreshIdentity]);

  useEffect(() => {
    if (tunnelStatus !== 'connected') return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      const down = Math.max(18, 92 + (Math.random() * 54 - 24) - selectedServer.loadPercent * 0.4);
      const up = Math.max(8, 34 + (Math.random() * 20 - 8));
      setBytesProtected((prev) => prev + Math.round((down * 125000) / 8));
      setBandwidthHistory((prev) => [
        ...prev.slice(-17),
        {
          timestamp: new Date().toLocaleTimeString(),
          downloadMbps: Number(down.toFixed(1)),
          uploadMbps: Number(up.toFixed(1)),
        },
      ]);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [tunnelStatus, selectedServer.loadPercent]);

  const establishTunnel = useCallback(
    async (
      targetServer: VpnServer,
      _protocolOverride?: ProtocolType,
      _speedOverride?: ConnectionSpeedMode
    ) => {
      setTunnelStatus('disconnected');
      setHandshake(null);
      setElapsedSeconds(0);
      setBytesProtected(0);
      setConnectionNotice(
        providerMode === 'm2a'
          ? `M2A Free Network is not ready to connect yet. ${targetServer.city} is a catalogue location, not a verified live VPN server. Your internet connection has not been changed.`
          : 'My Private Server is selected, but a native WireGuard connection has not been configured in this app yet. Importing a profile and connecting requires the native VPN app. Your internet connection has not been changed.'
      );
    },
    [providerMode]
  );

  function handleDisconnect() {
    if (connectTimerRef.current) {
      window.clearTimeout(connectTimerRef.current);
    }
    setTunnelStatus('disconnected');
    setHandshake(null);
    setElapsedSeconds(0);
    setBandwidthHistory([
      { timestamp: '0', downloadMbps: 0, uploadMbps: 0 },
      { timestamp: '1', downloadMbps: 0, uploadMbps: 0 },
    ]);
  }

  function handleToggleConnect() {
    if (tunnelStatus === 'connected' || tunnelStatus === 'killswitch-locked') {
      handleDisconnect();
    } else if (tunnelStatus === 'disconnected') {
      void establishTunnel(selectedServer);
    }
  }

  function handleSelectAndConnect(server: VpnServer) {
    setSelectedServerId(server.id);
    if (tunnelStatus !== 'connecting') {
      void establishTunnel(server);
    }
  }

  function handleSimulateDrop() {
    if (tunnelStatus !== 'connected') return;
    setHandshake(null);
    if (security.killSwitch) {
      setTunnelStatus('killswitch-locked');
    } else {
      handleDisconnect();
    }
  }

  function handleChangeNetworkEnv(env: NetworkEnvironment) {
    setNetworkEnv(env);
    if (env !== 'home-isp' && security.autoConnectPublicWifi && tunnelStatus === 'disconnected') {
      void establishTunnel(selectedServer);
    }
  }

  function handleToggleFavorite(id: string) {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleUpdateSecurity(patch: Partial<SecuritySettings>) {
    const protocolChanged =
      patch.protocol !== undefined && patch.protocol !== security.protocol;
    setSecurity((prev) => ({ ...prev, ...patch }));
    if (protocolChanged && tunnelStatus === 'connected' && patch.protocol) {
      void establishTunnel(selectedServer, patch.protocol);
    }
  }

  function handleChangeSpeedMode(nextMode: ConnectionSpeedMode) {
    setSpeedMode(nextMode);
    if (tunnelStatus === 'connected') {
      void establishTunnel(selectedServer, security.protocol, nextMode);
    }
  }

  function handleAddSplitRule(rule: Omit<SplitTunnelRule, 'id'>) {
    setSplitRules((prev) => [{ ...rule, id: `rule-${Date.now()}` }, ...prev]);
  }

  function handleToggleSplitRuleMode(id: string) {
    setSplitRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, mode: r.mode === 'force-vpn' ? 'bypass' : 'force-vpn' } : r
      )
    );
  }

  function handleToggleSplitRuleEnabled(id: string) {
    setSplitRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function handleDeleteSplitRule(id: string) {
    setSplitRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleRotateKeypair() {
    setKeypair(null);
    setConnectionNotice(
      'Client keys are generated and stored by the native WireGuard engine during setup. This browser dashboard will not create placeholder VPN credentials.'
    );
  }

  const topActionLabel =
    tunnelStatus === 'connected'
      ? 'Disconnect'
      : tunnelStatus === 'connecting'
        ? 'Connecting…'
        : tunnelStatus === 'killswitch-locked'
          ? 'Reconnect Tunnel'
          : 'Setup Required';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tunnelStatus={tunnelStatus}
        selectedServer={selectedServer}
        elapsedSeconds={elapsedSeconds}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-8 border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-[#0E1525] lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="font-medium text-slate-500 dark:text-slate-400">M2A IP Shield</span>
              <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={() => void install()}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Install App
              </button>
            )}

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={
                tunnelStatus === 'killswitch-locked'
                  ? () => void establishTunnel(selectedServer)
                  : handleToggleConnect
              }
              disabled={tunnelStatus === 'connecting'}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                tunnelStatus === 'connected'
                  ? 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                  : tunnelStatus === 'killswitch-locked'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {topActionLabel}
            </button>
          </div>
        </header>

        {/* Top Advertisement + Main Workspace */}
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-5 pt-4 pb-8 lg:px-8">
          <AdSenseUnit />

          {activeTab === 'connection' && (
            <>
              <ProviderModePanel
                mode={providerMode}
                onChangeMode={(mode) => {
                  setProviderMode(mode);
                  setConnectionNotice(null);
                }}
                notice={connectionNotice}
                identity={identity}
                identityLoading={identityLoading}
                onRefreshIdentity={() => void refreshIdentity()}
              />
            <ConnectionView
              tunnelStatus={tunnelStatus}
              selectedServer={selectedServer}
              entryServer={entryServer}
              servers={VPN_SERVERS}
              favoriteIds={favoriteIds}
              identity={identity}
              identityLoading={identityLoading}
              handshake={handshake}
              networkEnv={networkEnv}
              onChangeNetworkEnv={handleChangeNetworkEnv}
              speedMode={speedMode}
              onChangeSpeedMode={handleChangeSpeedMode}
              isOnline={isOnline}
              isSlowConnection={isSlowConnection}
              security={security}
              splitRules={splitRules}
              elapsedSeconds={elapsedSeconds}
              bytesProtected={bytesProtected}
              bandwidthHistory={bandwidthHistory}
              onToggleConnect={handleToggleConnect}
              onSelectAndConnect={handleSelectAndConnect}
              onSimulateDrop={handleSimulateDrop}
              onRestoreFromKillSwitch={() => void establishTunnel(selectedServer)}
              onOpenServers={() => setActiveTab('servers')}
              onOpenSecurity={() => setActiveTab('security')}
            />
            </>
          )}

          {activeTab === 'servers' && (
            <ServersView
              servers={VPN_SERVERS}
              selectedServer={selectedServer}
              entryServer={entryServer}
              multiHopEnabled={security.multiHopEnabled}
              tunnelStatus={tunnelStatus}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onSelectServer={handleSelectAndConnect}
              onSelectEntryServer={(s) => setEntryServerId(s.id)}
              onToggleMultiHop={(enabled) => handleUpdateSecurity({ multiHopEnabled: enabled })}
            />
          )}

          {activeTab === 'tunnel-lab' && (
            <TunnelLabView
              tunnelStatus={tunnelStatus}
              selectedServer={selectedServer}
              identity={identity}
              keypair={keypair}
              security={security}
              splitRules={splitRules}
              onToggleConnect={handleToggleConnect}
            />
          )}

          {activeTab === 'security' && (
            <SecurityConfigView
              security={security}
              onUpdateSecurity={handleUpdateSecurity}
              splitRules={splitRules}
              onAddSplitRule={handleAddSplitRule}
              onToggleSplitRuleMode={handleToggleSplitRuleMode}
              onToggleSplitRuleEnabled={handleToggleSplitRuleEnabled}
              onDeleteSplitRule={handleDeleteSplitRule}
              tunnelStatus={tunnelStatus}
              onSimulateDrop={handleSimulateDrop}
              selectedServer={selectedServer}
              entryServer={entryServer}
              keypair={keypair}
              handshake={handshake}
              onRotateKeypair={() => void handleRotateKeypair()}
            />
          )}

          {activeTab === 'install' && (
            <InstallAppView />
          )}
        </main>

        <Footer onNavigateHome={() => setActiveTab('connection')} />
      </div>

      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-50 rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          Offline Mode — VPN protection is unavailable.
        </div>
      )}
    </div>
  );
}
