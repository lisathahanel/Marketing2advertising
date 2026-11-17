export type TunnelStatus = 'disconnected' | 'connecting' | 'connected' | 'killswitch-locked';

export type ProtocolType = 'WireGuard' | 'OpenVPN UDP' | 'OpenVPN TCP' | 'IKEv2';

export type NetworkEnvironment = 'home-isp' | 'public-cafe' | 'airport-wifi';

export type ConnectionSpeedMode = 'auto' | 'slow-network' | 'offline-cache';

export type WorkspaceTab = 'connection' | 'servers' | 'tunnel-lab' | 'security' | 'install';

export interface VpnServer {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Middle East & Africa';
  coordinates: [number, number]; // [longitude, latitude]
  exitIp: string;
  ipv6Prefix: string;
  endpointHost: string;
  wireguardPort: number;
  publicKey: string;
  baseLatencyMs: number;
  loadPercent: number;
  bandwidthGbps: number;
  ramOnly: boolean;
  multiHopReady: boolean;
  p2pAllowed: boolean;
  streamingOptimized: boolean;
  ownership: 'Colocated Owned' | 'Audited Partner';
}

export interface ClientIdentity {
  ip: string;
  isPrivateGateway: boolean;
  isp: string;
  city: string;
  country: string;
  browser: string;
  os: string;
  language: string;
  transportProtocol: string;
  headersExposed: string[];
  checkedAt: string;
}

export interface TunnelKeypair {
  publicKeyBase64: string;
  privateKeyPreview: string;
  fingerprintSha256: string;
  generatedAt: string;
  cryptoKey: CryptoKey | null;
}

export interface TunnelHandshake {
  sessionId: string;
  serverNonce: string;
  handshakeDigest: string;
  protocol: ProtocolType;
  cipherSuite: string;
  handshakeMechanism: string;
  port: number;
  transport: 'UDP' | 'TCP';
  assignedVirtualIp: string;
  mtu: number;
  keepaliveSec: number;
  handshakeSteps: string[];
  mode?: 'online-handshake' | 'slow-network-optimized' | 'offline-cached';
  establishedAt: string;
}

export interface SplitTunnelRule {
  id: string;
  target: string;
  category: 'Application' | 'Local Subnet' | 'Trusted Domain';
  mode: 'bypass' | 'force-vpn';
  enabled: boolean;
}

export interface SecuritySettings {
  killSwitch: boolean;
  autoConnectPublicWifi: boolean;
  dnsTrackerBlocker: boolean;
  webrtcProtection: boolean;
  ipv6LeakGuard: boolean;
  multiHopEnabled: boolean;
  lowBandwidthMode: boolean;
  protocol: ProtocolType;
}

export interface BandwidthSample {
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
}

export interface LeakAuditReport {
  ranAt: string;
  ipCheck: {
    passed: boolean;
    visibleIp: string;
    detail: string;
  };
  webrtcCheck: {
    passed: boolean;
    candidatesFound: string[];
    detail: string;
  };
  dnsCheck: {
    passed: boolean;
    domain: string;
    records: string[];
    latencyMs: number;
    detail: string;
  };
}
