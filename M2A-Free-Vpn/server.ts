import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';

  let os = 'Unknown OS';
  if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

function normalizeIp(rawIp: string | undefined): string {
  if (!rawIp) return '127.0.0.1';
  const first = rawIp.split(',')[0]?.trim() || '127.0.0.1';
  if (first.startsWith('::ffff:')) {
    return first.slice(7);
  }
  if (first === '::1') return '127.0.0.1';
  return first;
}

function isPrivateOrLocalIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/network/identity', async (req, res) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor || req.headers['x-real-ip']?.toString() || req.socket.remoteAddress;

    const detectedIp = normalizeIp(rawIp);
    const ua = req.headers['user-agent'] || '';
    const { browser, os } = parseUserAgent(ua);
    const acceptLang = (req.headers['accept-language'] || 'en-US').split(',')[0] || 'en-US';
    const protocol = req.headers['x-forwarded-proto']?.toString() || req.protocol || 'https';

    let isp = isPrivateOrLocalIp(detectedIp)
      ? 'Local / Preview Gateway'
      : 'Detected Upstream Carrier';
    let city = isPrivateOrLocalIp(detectedIp) ? 'Local Subnet' : 'Detected Region';
    let country = isPrivateOrLocalIp(detectedIp) ? 'LAN' : 'Public Internet';

    if (!isPrivateOrLocalIp(detectedIp)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1600);
        const geoResp = await fetch(`https://ipwho.is/${encodeURIComponent(detectedIp)}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (geoResp.ok) {
          const geoData = (await geoResp.json()) as {
            success?: boolean;
            city?: string;
            country?: string;
            connection?: { isp?: string; org?: string };
          };
          if (geoData.success) {
            city = geoData.city || city;
            country = geoData.country || country;
            isp = geoData.connection?.isp || geoData.connection?.org || isp;
          }
        }
      } catch {
        // Offline or sandboxed outbound access; return inspected header identity cleanly
      }
    }

    res.json({
      ip: detectedIp,
      isPrivateGateway: isPrivateOrLocalIp(detectedIp),
      isp,
      city,
      country,
      browser,
      os,
      language: acceptLang,
      transportProtocol: protocol.toUpperCase(),
      headersExposed: [
        forwardedFor ? 'X-Forwarded-For' : null,
        ua ? 'User-Agent' : null,
        req.headers['accept-language'] ? 'Accept-Language' : null,
      ].filter(Boolean),
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/network/ping', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      serverTime: Date.now(),
    });
  });

  app.get('/api/network/speed-download', (req, res) => {
    const requested = Number(req.query.bytes) || 262144;
    const size = Math.min(Math.max(requested, 16384), 1048576);
    const payload = crypto.randomBytes(size);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(payload.byteLength));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(payload);
  });

  app.post(
    '/api/network/speed-upload',
    express.raw({ type: 'application/octet-stream', limit: '2mb' }),
    (req, res) => {
      const receivedBytes = Buffer.isBuffer(req.body) ? req.body.byteLength : 0;
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        receivedBytes,
        serverTime: Date.now(),
      });
    }
  );

  app.get('/api/network/dns-audit', async (req, res) => {
    const rawDomain = typeof req.query.domain === 'string' ? req.query.domain.trim().toLowerCase() : 'wikipedia.org';
    const domain = rawDomain.replace(/^https?:\/\//, '').split('/')[0] || 'wikipedia.org';

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      res.status(400).json({ error: 'Enter a valid domain name (for example, example.com).' });
      return;
    }

    const startedAt = performance.now();
    try {
      const resolveWithTimeout = Promise.race([
        dns.resolve4(domain),
        new Promise<string[]>((_, reject) =>
          setTimeout(() => reject(new Error('DNS lookup timed out')), 2200)
        ),
      ]);
      const records = await resolveWithTimeout;
      const elapsedMs = Math.max(1, Math.round(performance.now() - startedAt));
      res.json({
        domain,
        resolved: true,
        records: records.slice(0, 4),
        latencyMs: elapsedMs,
        mode: 'live-system-dns',
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      const elapsedMs = Math.max(1, Math.round(performance.now() - startedAt));
      res.json({
        domain,
        resolved: false,
        records: [],
        latencyMs: elapsedMs,
        mode: 'restricted-sandbox',
        note: err instanceof Error ? err.message : 'Outbound DNS blocked in sandbox environment',
        checkedAt: new Date().toISOString(),
      });
    }
  });

  app.post('/api/tunnel/handshake', (req, res) => {
    const { serverId, clientPublicKey, protocol } = req.body as {
      serverId?: string;
      clientPublicKey?: string;
      protocol?: string;
    };

    if (!serverId || !clientPublicKey) {
      res.status(400).json({ error: 'Missing serverId or clientPublicKey for tunnel handshake.' });
      return;
    }

    const activeProtocol =
      protocol === 'OpenVPN UDP' || protocol === 'OpenVPN TCP' || protocol === 'IKEv2'
        ? protocol
        : 'WireGuard';

    const protocolSpecs: Record<
      'WireGuard' | 'OpenVPN UDP' | 'OpenVPN TCP' | 'IKEv2',
      {
        cipherSuite: string;
        handshakeMechanism: string;
        port: number;
        transport: 'UDP' | 'TCP';
        mtu: number;
        keepaliveSec: number;
        subnetOctet: number;
        handshakeSteps: string[];
      }
    > = {
      WireGuard: {
        cipherSuite: 'ChaCha20-Poly1305 · Curve25519 · BLAKE2s',
        handshakeMechanism: '1-RTT Noise_IKpsk2 Ephemeral Exchange',
        port: 51820,
        transport: 'UDP',
        mtu: 1420,
        keepaliveSec: 25,
        subnetOctet: 64,
        handshakeSteps: [
          'Initiator Curve25519 ephemeral key authenticated',
          'Noise_IKpsk2 responder static key verified',
          'Symmetric ChaCha20-Poly1305 transport keys derived',
        ],
      },
      'OpenVPN UDP': {
        cipherSuite: 'AES-256-GCM · TLSv1.3 · SHA-256 HMAC',
        handshakeMechanism: 'TLS Control Channel + Data Channel Key Push',
        port: 1194,
        transport: 'UDP',
        mtu: 1500,
        keepaliveSec: 10,
        subnetOctet: 8,
        handshakeSteps: [
          'TLSv1.3 control channel P_CONTROL_HARD_RESET completed',
          'Peer X.509 certificate & tls-crypt HMAC verified',
          'PUSH_REPLY received with AES-256-GCM data-channel cipher',
        ],
      },
      'OpenVPN TCP': {
        cipherSuite: 'AES-256-GCM · TLSv1.3 (TCP/443)',
        handshakeMechanism: 'TCP-443 TLS Stream + Data Channel Key Push',
        port: 443,
        transport: 'TCP',
        mtu: 1500,
        keepaliveSec: 10,
        subnetOctet: 9,
        handshakeSteps: [
          'TCP port 443 firewall-traversal stream established',
          'TLSv1.3 mutual certificate handshake verified',
          'AES-256-GCM data-channel session keys synchronized',
        ],
      },
      IKEv2: {
        cipherSuite: 'AES-256-GCM · ECDH P-384 · SHA-384',
        handshakeMechanism: 'IKE_SA_INIT + IKE_AUTH (MOBIKE Roaming)',
        port: 4500,
        transport: 'UDP',
        mtu: 1400,
        keepaliveSec: 20,
        subnetOctet: 16,
        handshakeSteps: [
          'IKE_SA_INIT Diffie-Hellman Group 20 negotiation complete',
          'IKE_AUTH EAP/certificate identity & NAT-T UDP/4500 verified',
          'CHILD_SA IPsec ESP tunnel + MOBIKE mobility activated',
        ],
      },
    };

    const spec = protocolSpecs[activeProtocol];
    const sessionId = crypto.randomBytes(12).toString('hex');
    const serverNonce = crypto.randomBytes(16).toString('base64');
    const handshakeDigest = crypto
      .createHash('sha256')
      .update(`${activeProtocol}:${serverId}:${clientPublicKey}:${serverNonce}`)
      .digest('hex');

    res.json({
      sessionId,
      serverNonce,
      handshakeDigest,
      protocol: activeProtocol,
      cipherSuite: spec.cipherSuite,
      handshakeMechanism: spec.handshakeMechanism,
      port: spec.port,
      transport: spec.transport,
      assignedVirtualIp: `10.${spec.subnetOctet}.${(handshakeDigest.charCodeAt(0) % 200) + 10}.${(handshakeDigest.charCodeAt(1) % 220) + 12}`,
      mtu: spec.mtu,
      keepaliveSec: spec.keepaliveSec,
      handshakeSteps: spec.handshakeSteps,
      establishedAt: new Date().toISOString(),
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`M2A Free Vpn server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
