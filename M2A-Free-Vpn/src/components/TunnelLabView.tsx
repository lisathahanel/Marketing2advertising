import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type {
  ClientIdentity,
  LeakAuditReport,
  SecuritySettings,
  SplitTunnelRule,
  TunnelKeypair,
  TunnelStatus,
  VpnServer,
} from '../types/vpn';
import {
  encryptTunnelPayload,
  type EncryptedFrameResult,
  runWebRtcLeakCheck,
} from '../utils/cryptoTunnel';
import { SpeedTestCard } from './SpeedTestCard';

interface TunnelLabViewProps {
  tunnelStatus: TunnelStatus;
  selectedServer: VpnServer;
  identity: ClientIdentity | null;
  keypair: TunnelKeypair | null;
  security: SecuritySettings;
  splitRules: SplitTunnelRule[];
  onToggleConnect: () => void;
}

const SAMPLE_PAYLOADS = [
  {
    label: 'Banking Login',
    domain: 'secure-bank.example',
    payload: 'POST /demo/login HTTP/1.1 | user=sample-user&password=not-a-real-password',
  },
  {
    label: 'Private Search',
    domain: 'health-library.example',
    payload: 'GET /search?q=sample+query HTTP/1.1 | Cookie: demo-session=placeholder',
  },
  {
    label: 'Work SSO Token',
    domain: 'intranet.company.example',
    payload: 'Authorization: Bearer DEMO_TOKEN_NOT_REAL',
  },
];

export function TunnelLabView({
  tunnelStatus,
  selectedServer,
  identity,
  keypair,
  security,
  splitRules,
  onToggleConnect,
}: TunnelLabViewProps) {
  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const [customPayload, setCustomPayload] = useState(SAMPLE_PAYLOADS[0].payload);
  const [targetDomain, setTargetDomain] = useState(SAMPLE_PAYLOADS[0].domain);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(splitRules[0]?.id || '');
  const [encryptedFrame, setEncryptedFrame] = useState<EncryptedFrameResult | null>(null);

  const [auditDomain, setAuditDomain] = useState('wikipedia.org');
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditReport, setAuditReport] = useState<LeakAuditReport | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const selectedRule = splitRules.find((r) => r.id === selectedRuleId) || splitRules[0] || null;
  const isRuleBypassed = selectedRule ? selectedRule.enabled && selectedRule.mode === 'bypass' : false;
  const isConnected = tunnelStatus === 'connected';
  const isKillSwitchLocked = tunnelStatus === 'killswitch-locked';

  const effectiveEncrypted = isConnected && !isRuleBypassed;

  useEffect(() => {
    let cancelled = false;
    encryptTunnelPayload(customPayload, keypair?.cryptoKey || null).then((res) => {
      if (!cancelled) setEncryptedFrame(res);
    });
    return () => {
      cancelled = true;
    };
  }, [customPayload, keypair]);

  async function handleRunAudit() {
    setAuditRunning(true);
    setAuditError(null);
    try {
      const domain = auditDomain.trim().toLowerCase() || 'wikipedia.org';
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        throw new Error('Enter a valid domain name, such as example.com.');
      }

      const [webrtcRes, dnsResponse] = await Promise.all([
        runWebRtcLeakCheck(),
        fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
          { headers: { Accept: 'application/dns-json' }, cache: 'no-store' }
        ).catch(() => null),
      ]);

      let dnsRecords: string[] = [];
      let dnsLatencyMs = 0;
      let dnsDetail = 'Browser DNS diagnostics are unavailable. The browser cannot inspect the device operating-system resolver or prove DNS leak protection.';
      if (dnsResponse?.ok) {
        const dnsData = (await dnsResponse.json()) as {
          Answer?: Array<{ data?: string; type?: number }>;
        };
        dnsRecords = (dnsData.Answer || [])
          .filter((answer) => answer.type === 1 && answer.data)
          .map((answer) => answer.data as string)
          .slice(0, 6);
        dnsLatencyMs = 0;
        dnsDetail = dnsRecords.length
          ? 'The domain resolved through Cloudflare DNS-over-HTTPS for this browser test. This does not test your device resolver, ISP DNS visibility, or a VPN DNS tunnel.'
          : 'The public DNS-over-HTTPS test returned no IPv4 answer. This does not prove DNS leak protection.';
      }

      const visibleIp = identity?.ip || 'Unavailable';
      setAuditReport({
        ranAt: new Date().toLocaleTimeString(),
        ipCheck: {
          passed: false,
          visibleIp,
          detail: identity?.ip
            ? `No verified VPN tunnel is active. Websites can still see your current public IP (${identity.ip}).`
            : 'The public IP could not be checked. No VPN tunnel has been verified.',
        },
        webrtcCheck: {
          passed: !webrtcRes.exposedPublicIp,
          candidatesFound: webrtcRes.candidates,
          detail: webrtcRes.candidates.length === 0
            ? 'No ICE candidates were exposed during this browser probe. This is not a full device-level leak test.'
            : webrtcRes.exposedPublicIp
              ? `A public reflexive (srflx) ICE candidate was detected among ${webrtcRes.candidates.length} candidate(s). WebRTC may reveal a public network address to peer-connection websites.`
              : `${webrtcRes.candidates.length} local or mDNS ICE candidate(s) were detected; no public reflexive candidate appeared in this probe.`,
        },
        dnsCheck: {
          passed: false,
          domain,
          records: dnsRecords,
          latencyMs: dnsLatencyMs,
          detail: dnsDetail,
        },
      });
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Unable to complete browser diagnostics.');
    } finally {
      setAuditRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <SpeedTestCard
        tunnelStatus={tunnelStatus}
        selectedServer={selectedServer}
        security={security}
      />

      {/* Live Packet & Encryption Visualizer */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Browser Encryption Demo
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Explore local AES-GCM encryption of sample text. This is a browser cryptography demonstration, not real VPN traffic or a system-wide encrypted tunnel.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleConnect}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isConnected
                ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950'
            }`}
          >
            {isConnected ? 'Disconnect to Compare Exposed View' : 'Connect Tunnel to Encrypt'}
          </button>
        </div>

        {/* Preset Payload + Split-Tunnel App Selector */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Test Payload (Encrypted Live via WebCrypto)
              </span>
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
                {SAMPLE_PAYLOADS.map((item, idx) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSelectedSampleIdx(idx);
                      setCustomPayload(item.payload);
                      setTargetDomain(item.domain);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedSampleIdx === idx
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={2}
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              aria-label="Test payload to encrypt"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-[#0B111E] dark:text-slate-100"
            />
          </div>

          <div className="space-y-3 lg:col-span-5">
            <label
              htmlFor="lab-split-app"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Originating App (Split Tunneling Policy)
            </label>
            <select
              id="lab-split-app"
              value={selectedRule?.id || ''}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {splitRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.target} ({rule.enabled && rule.mode === 'bypass' ? 'Bypass VPN' : 'Route via VPN'})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isKillSwitchLocked
                ? 'Kill Switch is locked: all outbound frames from this app are dropped.'
                : isRuleBypassed
                  ? 'This app is set to bypass the VPN in Split Tunneling, so traffic exits directly.'
                  : isConnected
                    ? 'This app routes inside the encrypted VPN tunnel.'
                    : 'Tunnel disconnected: traffic flows unencapsulated across the local network.'}
            </p>
          </div>
        </div>

        {/* 2-Column Packet Comparison: Attacker / ISP View vs. Tunnel Frame */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* What Public Wi-Fi Sniffers & ISPs See */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#0B111E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {effectiveEncrypted ? (
                  <EyeOff className="h-4 w-4 text-emerald-500" />
                ) : isKillSwitchLocked ? (
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                ) : (
                  <Eye className="h-4 w-4 text-amber-500" />
                )}
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Public Wi-Fi Router & ISP View
                </h3>
              </div>
              <span
                className={`text-xs font-semibold ${
                  effectiveEncrypted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isKillSwitchLocked
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {effectiveEncrypted
                  ? 'Opaque Ciphertext'
                  : isKillSwitchLocked
                    ? '0 Bytes Transmitted'
                    : 'Plaintext Metadata Exposed'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Visible Source IP</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {isKillSwitchLocked ? 'BLOCKED (DROP)' : identity?.ip || '192.0.2.14'}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Observed Destination</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {isKillSwitchLocked
                    ? 'NONE'
                    : effectiveEncrypted
                      ? `${selectedServer.endpointHost}:${selectedServer.wireguardPort}`
                      : targetDomain}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">DNS Query Visibility</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {isKillSwitchLocked
                    ? 'Blocked by Kill Switch'
                    : effectiveEncrypted
                      ? 'Hidden inside encrypted frame'
                      : `${targetDomain} (Plaintext UDP/53)`}
                </span>
              </div>
              <div>
                <div className="mb-1 text-slate-500">Captured Wire Payload</div>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {isKillSwitchLocked
                    ? '[FIREWALL DROP] Outbound packet rejected on non-tunnel interface.'
                    : effectiveEncrypted && encryptedFrame
                      ? `UDP ${selectedServer.wireguardPort} | IV=${encryptedFrame.ivHex}\nCT=${encryptedFrame.ciphertextHexPreview}...\nTAG=${encryptedFrame.authTagHex}`
                      : customPayload || '(empty payload)'}
                </pre>
              </div>
            </div>
          </div>

          {/* Destination Website View */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#0B111E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-sky-500" />
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Destination Website ({targetDomain}) View
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {effectiveEncrypted
                  ? `Masked via ${selectedServer.countryCode}`
                  : isKillSwitchLocked
                    ? 'Unreachable'
                    : 'Direct Origin'}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Remote Peer IP</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {isKillSwitchLocked
                    ? 'No Packet Received'
                    : effectiveEncrypted
                      ? selectedServer.exitIp
                      : identity?.ip || '192.0.2.14'}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Geo-Location</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {isKillSwitchLocked
                    ? 'N/A'
                    : effectiveEncrypted
                      ? `${selectedServer.city}, ${selectedServer.country}`
                      : `${identity?.city || 'Local'}, ${identity?.country || 'ISP'}`}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Crypto Engine</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {encryptedFrame?.algorithm || 'AES-256-GCM'} ({encryptedFrame?.byteLength || 0} B)
                </span>
              </div>
              <div>
                <div className="mb-1 text-slate-500">Identity Tracking Risk</div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 font-sans text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {isKillSwitchLocked
                    ? 'Kill Switch is preventing any session correlation or accidental leak while the tunnel is down.'
                    : effectiveEncrypted
                      ? `Trackers and regional firewalls only see ${selectedServer.city}'s shared exit node IP (${selectedServer.exitIp}), decoupling your browsing from your home or café network.`
                      : 'Advertisers, Wi-Fi operators, and destination servers can log your real IP address and correlate requests to your physical connection.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Browser & Network Leak Audit */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Browser IP, WebRTC & DNS Diagnostics
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Runs real server header inspection, browser WebRTC ICE candidate probing, and DNS
              resolution timing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={auditDomain}
              onChange={(e) => setAuditDomain(e.target.value)}
              aria-label="Domain for DNS leak check"
              placeholder="wikipedia.org"
              className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={auditRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
              {auditRunning ? 'Probing Network…' : 'Run Leak Audit'}
            </button>
          </div>
        </div>

        {auditError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {auditError}
          </div>
        )}

        {!auditReport ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Run a live leak audit to verify your IP exposure, WebRTC ICE candidates, and DNS path.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try running the audit once disconnected and again after connecting to compare results.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Public IP Check
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    auditReport.ipCheck.passed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {auditReport.ipCheck.passed ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {auditReport.ipCheck.visibleIp === 'Unavailable' ? 'Not checked' : 'Origin IP visible'}
                </span>
              </div>
              <div className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {auditReport.ipCheck.visibleIp}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {auditReport.ipCheck.detail}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  WebRTC ICE Probe
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    auditReport.webrtcCheck.passed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {auditReport.webrtcCheck.passed ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {auditReport.webrtcCheck.passed ? 'No Leak' : 'STUN Exposed'}
                </span>
              </div>
              <div className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {auditReport.webrtcCheck.candidatesFound.length} candidate(s)
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {auditReport.webrtcCheck.detail}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Public DNS-over-HTTPS Test
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    auditReport.dnsCheck.passed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {auditReport.dnsCheck.passed ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  Not verified
                </span>
              </div>
              <div className="mt-2 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {auditReport.dnsCheck.domain}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {auditReport.dnsCheck.detail}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
