import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldAlert,
  Split,
  Trash2,
} from 'lucide-react';
import type {
  ProtocolType,
  SecuritySettings,
  SplitTunnelRule,
  TunnelHandshake,
  TunnelKeypair,
  TunnelStatus,
  VpnServer,
} from '../types/vpn';
import { buildWireGuardConfig } from '../utils/cryptoTunnel';

interface SecurityConfigViewProps {
  security: SecuritySettings;
  onUpdateSecurity: (patch: Partial<SecuritySettings>) => void;
  splitRules: SplitTunnelRule[];
  onAddSplitRule: (rule: Omit<SplitTunnelRule, 'id'>) => void;
  onToggleSplitRuleMode: (id: string) => void;
  onToggleSplitRuleEnabled: (id: string) => void;
  onDeleteSplitRule: (id: string) => void;
  tunnelStatus: TunnelStatus;
  onSimulateDrop: () => void;
  selectedServer: VpnServer;
  entryServer: VpnServer | null;
  keypair: TunnelKeypair | null;
  handshake: TunnelHandshake | null;
  onRotateKeypair: () => void;
}

type ProtocolFamily = 'WireGuard' | 'OpenVPN' | 'IKEv2';

const PROTOCOL_FAMILIES: Array<{
  family: ProtocolFamily;
  title: string;
  cipher: string;
  handshakeLabel: string;
  summary: string;
  defaultProtocol: ProtocolType;
}> = [
  {
    family: 'WireGuard',
    title: 'WireGuard',
    cipher: 'ChaCha20-Poly1305 · Curve25519',
    handshakeLabel: '1-RTT Noise_IK · UDP/51820 · MTU 1420',
    summary: 'Modern kernel-grade tunnel with sub-second handshake and highest throughput.',
    defaultProtocol: 'WireGuard',
  },
  {
    family: 'OpenVPN',
    title: 'OpenVPN',
    cipher: 'AES-256-GCM · TLSv1.3',
    handshakeLabel: 'TLS Control Channel · UDP/1194 or TCP/443 · MTU 1500',
    summary: 'Battle-tested SSL/TLS tunnel with UDP speed mode or TCP 443 firewall bypass.',
    defaultProtocol: 'OpenVPN UDP',
  },
  {
    family: 'IKEv2',
    title: 'IKEv2 / IPsec',
    cipher: 'AES-256-GCM · ECDH P-384',
    handshakeLabel: 'IKE_SA_INIT + MOBIKE · UDP/4500 · MTU 1400',
    summary: 'Resilient MOBIKE roaming when switching between cellular LTE and public Wi-Fi.',
    defaultProtocol: 'IKEv2',
  },
];

export function SecurityConfigView({
  security,
  onUpdateSecurity,
  splitRules,
  onAddSplitRule,
  onToggleSplitRuleMode,
  onToggleSplitRuleEnabled,
  onDeleteSplitRule,
  tunnelStatus,
  onSimulateDrop,
  selectedServer,
  entryServer,
  keypair,
  handshake,
  onRotateKeypair,
}: SecurityConfigViewProps) {
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState<SplitTunnelRule['category']>('Application');
  const [newMode, setNewMode] = useState<SplitTunnelRule['mode']>('bypass');
  const [copiedConfig, setCopiedConfig] = useState(false);

  const wireguardConfig = buildWireGuardConfig({
    server: selectedServer,
    entryServer,
    multiHopEnabled: security.multiHopEnabled,
    virtualIp: handshake?.assignedVirtualIp || '10.64.18.42',
    clientPublicKey: keypair?.publicKeyBase64 || 'Generating...',
    protocol: security.protocol,
    dnsBlocker: security.dnsTrackerBlocker,
  });

  function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = newTarget.trim();
    if (!cleaned) return;
    onAddSplitRule({
      target: cleaned,
      category: newCategory,
      mode: newMode,
      enabled: true,
    });
    setNewTarget('');
  }

  async function handleCopyConfig() {
    try {
      await navigator.clipboard.writeText(wireguardConfig);
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  }

  function handleDownloadConfig() {
    const ext =
      security.protocol === 'OpenVPN UDP' || security.protocol === 'OpenVPN TCP'
        ? 'ovpn'
        : 'conf';
    const blob = new Blob([wireguardConfig], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `m2a-free-vpn-${selectedServer.countryCode.toLowerCase()}-${selectedServer.city.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const activeFamily: ProtocolFamily =
    security.protocol === 'OpenVPN UDP' || security.protocol === 'OpenVPN TCP'
      ? 'OpenVPN'
      : security.protocol === 'IKEv2'
        ? 'IKEv2'
        : 'WireGuard';

  return (
    <div className="space-y-6">
      {/* Kill Switch & Core Leak Protection */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Protection Preferences — Native VPN Engine Required
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              These are saved preferences only. This browser build cannot enforce a system firewall, kill switch, private DNS route, or device-wide leak protection.
            </p>
          </div>

          {tunnelStatus === 'connected' && (
            <button
              type="button"
              onClick={onSimulateDrop}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              Test Kill Switch Drop
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {(
            [
              {
                key: 'killSwitch',
                title: 'System Kill Switch (Native Client Required)',
                description:
                  'Preference only. A native Android or desktop VPN engine must enforce this at operating-system level.',
                value: security.killSwitch,
              },
              {
                key: 'autoConnectPublicWifi',
                title: 'Auto-Protect Untrusted Public Wi-Fi',
                description:
                  'Preference only. Automatic network detection and VPN activation require a native client.',
                value: security.autoConnectPublicWifi,
              },
              {
                key: 'dnsTrackerBlocker',
                title: 'Private DNS Ad & Malware Shield',
                description:
                  'Preference only. No private DNS resolver or tracker-blocking service is connected yet.',
                value: security.dnsTrackerBlocker,
              },
              {
                key: 'webrtcProtection',
                title: 'WebRTC & IPv6 Leak Guard',
                description:
                  'Preference only. Browser settings and native IPv6 routing controls are not changed by this dashboard.',
                value: security.webrtcProtection,
              },
              {
                key: 'lowBandwidthMode',
                title: 'Slow Network & Offline Tunnel Resilience',
                description:
                  'Saved connection preference for a future native VPN engine. Offline browser key caching does not create a VPN tunnel.',
                value: security.lowBandwidthMode,
              },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-6 py-4 first:pt-1 last:pb-1"
            >
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.title}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={item.value}
                aria-label={item.title}
                onClick={() => onUpdateSecurity({ [item.key]: !item.value })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  item.value ? 'bg-sky-600 dark:bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    item.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Split Tunneling Per-App & Subnet Routing */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Split className="h-4 w-4 text-sky-500" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Split Tunneling (Per-App & Subnet Routing)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage the rules you want a future native client to apply. This browser dashboard cannot route traffic from other apps or devices.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateRule} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="App name, subnet (192.168.1.0/24), or domain…"
            aria-label="App or domain for split tunneling"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-5"
          />

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as SplitTunnelRule['category'])}
            aria-label="Rule category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-3"
          >
            <option value="Application">Application</option>
            <option value="Local Subnet">Local Subnet</option>
            <option value="Trusted Domain">Trusted Domain</option>
          </select>

          <select
            value={newMode}
            onChange={(e) => setNewMode(e.target.value as SplitTunnelRule['mode'])}
            aria-label="Routing mode"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:col-span-2"
          >
            <option value="force-vpn">Route via VPN</option>
            <option value="bypass">Bypass VPN</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:col-span-2 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </button>
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-3">Application / Target</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Routing Policy</th>
                <th className="px-3 py-2.5 text-right">Active</th>
                <th className="py-2.5 pl-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {splitRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-100">
                    {rule.target}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {rule.category}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onToggleSplitRuleMode(rule.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        rule.mode === 'force-vpn'
                          ? 'bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-amber-600/15 text-amber-700 hover:bg-amber-600/25 dark:bg-amber-500/15 dark:text-amber-400'
                      }`}
                    >
                      {rule.mode === 'force-vpn' ? 'Through VPN Tunnel' : 'Bypass VPN (Direct)'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`Toggle ${rule.target}`}
                      onClick={() => onToggleSplitRuleEnabled(rule.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        rule.enabled ? 'bg-sky-600 dark:bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteSplitRule(rule.id)}
                      aria-label={`Remove ${rule.target}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protocol & Config Export */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827] xl:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Tunnel Protocol & Handshake Suite
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Choose a preferred protocol for future native clients. No protocol handshake is performed by this browser dashboard.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {PROTOCOL_FAMILIES.map((opt) => {
              const selected = activeFamily === opt.family;
              return (
                <div
                  key={opt.family}
                  className={`rounded-lg border p-3.5 transition-colors ${
                    selected
                      ? 'border-sky-500 bg-sky-50/70 dark:border-sky-500/70 dark:bg-sky-950/20'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!selected) {
                        onUpdateSecurity({ protocol: opt.defaultProtocol });
                      }
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {opt.title}
                      </span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {opt.cipher}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{opt.summary}</p>
                    <div className="mt-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {opt.handshakeLabel}
                    </div>
                  </button>

                  {opt.family === 'OpenVPN' && selected && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        OpenVPN Transport
                      </span>
                      <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => onUpdateSecurity({ protocol: 'OpenVPN UDP' })}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                            security.protocol === 'OpenVPN UDP'
                              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          UDP (1194)
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateSecurity({ protocol: 'OpenVPN TCP' })}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                            security.protocol === 'OpenVPN TCP'
                              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          TCP (443)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {handshake && tunnelStatus === 'connected' && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-[#0B111E]">
              <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                <span>Active Negotiated Handshake ({handshake.protocol})</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {handshake.transport}/{handshake.port} · MTU {handshake.mtu}
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {handshake.handshakeMechanism}
              </div>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {handshake.handshakeSteps.map((step, idx) => (
                  <li key={idx}>
                    {idx + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827] xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sky-500" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Client Keys & {activeFamily} Profile Template
              </h2>
            </div>

            <button
              type="button"
              disabled
              onClick={onRotateKeypair}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Native setup required
            </button>
          </div>

          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs dark:border-slate-800 dark:bg-[#0B111E]">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Client Public Key</span>
              <span className="truncate text-slate-800 dark:text-slate-200 max-w-[260px]">
                {keypair?.publicKeyBase64 || 'Generated by native client during setup'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">SHA-256 Fingerprint</span>
              <span className="truncate text-slate-800 dark:text-slate-200">
                {keypair?.fingerprintSha256 || 'Not generated in this browser'}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-200">
            This is an illustrative profile template, not a valid VPN configuration. The listed locations and peer keys are not verified operational servers. Copying or downloading a template is disabled until real servers and native client keys are provisioned.
          </div>
          <pre className="mt-4 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-[#0B111E] dark:text-slate-300">
            {wireguardConfig}
          </pre>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled
              onClick={handleCopyConfig}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              {copiedConfig ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedConfig ? 'Copied Template' : 'Copy Template'}
            </button>
            <button
              type="button"
              disabled
              onClick={handleDownloadConfig}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Download {activeFamily}{' '}
              {activeFamily === 'OpenVPN' ? '.ovpn' : '.conf'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
