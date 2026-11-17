import {
  Download,
  Globe,
  Lock,
  Shield,
  SlidersHorizontal,
  TerminalSquare,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { TunnelStatus, VpnServer, WorkspaceTab } from '../types/vpn';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  tunnelStatus: TunnelStatus;
  selectedServer: VpnServer;
  elapsedSeconds: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

const NAV_ITEMS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof Shield;
}> = [
  { id: 'connection', label: 'Connection', icon: Shield },
  { id: 'servers', label: 'Servers', icon: Globe },
  { id: 'tunnel-lab', label: 'Tunnel Lab', icon: TerminalSquare },
  { id: 'security', label: 'Security & Config', icon: SlidersHorizontal },
  { id: 'install', label: 'Install Apps', icon: Download },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  tunnelStatus,
  selectedServer,
  elapsedSeconds,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const statusLabel =
    tunnelStatus === 'connected'
      ? 'Tunnel Active'
      : tunnelStatus === 'connecting'
        ? 'Handshaking'
        : tunnelStatus === 'killswitch-locked'
          ? 'Traffic Blocked'
          : 'Unprotected';

  const statusTone =
    tunnelStatus === 'connected'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tunnelStatus === 'connecting'
        ? 'text-sky-600 dark:text-sky-400'
        : 'text-amber-600 dark:text-amber-400';

  const sidebarBody = (
    <div className="flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0E1525]">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-sky-500/15 dark:text-sky-400">
              <Lock className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              M2A Free Vpn
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 p-3" aria-label="Primary Workspace">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!isInstalled && (
          <div className="px-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (isInstallable) {
                  void install();
                } else {
                  onSelectTab('install');
                  onCloseMobile();
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isInstallable ? 'Install M2A App' : 'Get Browser / Mobile / PC'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Connection</span>
            <span className={`font-semibold ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Exit Node</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
              {selectedServer.city}, {selectedServer.countryCode}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Session</span>
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {tunnelStatus === 'connected' ? formatDuration(elapsedSeconds) : '00:00:00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:shrink-0">{sidebarBody}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}
