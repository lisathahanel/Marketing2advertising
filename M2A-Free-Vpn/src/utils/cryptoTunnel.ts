import type { ProtocolType, TunnelKeypair, VpnServer } from '../types/vpn';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface EncryptedFrameResult {
  ivHex: string;
  ciphertextBase64: string;
  ciphertextHexPreview: string;
  authTagHex: string;
  byteLength: number;
  algorithm: string;
}

export async function encryptTunnelPayload(
  plaintext: string,
  cryptoKey: CryptoKey | null
): Promise<EncryptedFrameResult> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext || 'GET /account/balance HTTP/1.1');

  let activeKey = cryptoKey;
  if (!activeKey) {
    activeKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    activeKey,
    data
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tagStart = Math.max(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(tagStart);

  return {
    ivHex: bytesToHex(iv),
    ciphertextBase64: bytesToBase64(encryptedBytes),
    ciphertextHexPreview: bytesToHex(encryptedBytes).slice(0, 64),
    authTagHex: bytesToHex(authTag),
    byteLength: encryptedBytes.length,
    algorithm: 'AES-256-GCM (WebCrypto)',
  };
}

export async function runWebRtcLeakCheck(): Promise<{
  candidates: string[];
  exposedPublicIp: boolean;
}> {
  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    return { candidates: [], exposedPublicIp: false };
  }

  return new Promise((resolve) => {
    const candidates = new Set<string>();
    let settled = false;

    const finish = (pc: RTCPeerConnection) => {
      if (settled) return;
      settled = true;
      try {
        pc.close();
      } catch {
        // ignore close errors
      }
      const list = Array.from(candidates);
      const hasSrflx = list.some((c) => c.includes('typ srflx'));
      resolve({ candidates: list, exposedPublicIp: hasSrflx });
    };

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.createDataChannel('vektor-leak-probe');

      pc.onicecandidate = (event) => {
        if (event.candidate?.candidate) {
          candidates.add(event.candidate.candidate);
        } else if (!event.candidate) {
          finish(pc);
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish(pc));

      setTimeout(() => finish(pc), 1800);
    } catch {
      resolve({ candidates: [], exposedPublicIp: false });
    }
  });
}

export function buildWireGuardConfig(params: {
  server: VpnServer;
  entryServer?: VpnServer | null;
  multiHopEnabled: boolean;
  virtualIp: string;
  clientPublicKey: string;
  protocol: ProtocolType;
  dnsBlocker: boolean;
}): string {
  const { server, entryServer, multiHopEnabled, virtualIp, clientPublicKey, protocol, dnsBlocker } = params;
  const activePeer = multiHopEnabled && entryServer ? entryServer : server;
  const dnsServer = dnsBlocker ? '10.64.0.1' : '10.64.0.2';

  if (protocol === 'OpenVPN UDP' || protocol === 'OpenVPN TCP') {
    const proto = protocol === 'OpenVPN TCP' ? 'tcp-client' : 'udp';
    const port = protocol === 'OpenVPN TCP' ? 443 : 1194;
    return `# M2A Free Vpn OpenVPN Profile (${protocol})
# Exit Node: ${server.city}, ${server.country} (${server.exitIp})
${multiHopEnabled && entryServer ? `# Multi-Hop Chain: ${entryServer.city} -> ${server.city}\n` : ''}client
dev tun
proto ${proto}
remote ${activePeer.endpointHost} ${port}
resolv-retry infinite
nobind
persist-key
persist-tun
cipher AES-256-GCM
auth SHA256
tls-version-min 1.3
dhcp-option DNS ${dnsServer}
verb 3
`;
  }

  if (protocol === 'IKEv2') {
    return `# M2A Free Vpn IKEv2 / IPsec Profile
# Exit Node: ${server.city}, ${server.country} (${server.exitIp})
conn m2a-ikev2-${server.countryCode.toLowerCase()}
  keyexchange=ikev2
  ike=aes256gcm16-prfsha384-ecp384!
  esp=aes256gcm16-ecp384!
  right=${activePeer.endpointHost}
  rightid=%${activePeer.endpointHost}
  rightsubnet=0.0.0.0/0,::/0
  leftsourceip=%config4,%config6
  dpdaction=restart
  dpddelay=20s
  mobike=yes
`;
  }

  return `# M2A Free Vpn Client Configuration (WireGuard)
# Exit Node: ${server.city}, ${server.country} (${server.exitIp})
${multiHopEnabled && entryServer ? `# Multi-Hop Chain: ${entryServer.city} -> ${server.city}\n` : ''}# Client Public Key: ${clientPublicKey}

[Interface]
# Replace PrivateKey with your device secret key stored in hardware enclave
PrivateKey = <CLIENT_CURVE25519_PRIVATE_KEY>
Address = ${virtualIp}/32, fd7d:76ee:e68f:a993::1/128
DNS = ${dnsServer}
MTU = 1420

[Peer]
PublicKey = ${activePeer.publicKey}
Endpoint = ${activePeer.endpointHost}:${activePeer.wireguardPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;
}
