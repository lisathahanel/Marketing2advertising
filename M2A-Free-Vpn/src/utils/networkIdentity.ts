import type { ClientIdentity } from '../types/vpn';

function describeBrowser(ua: string): { browser: string; os: string } {
  const browser = /Edg\//.test(ua) ? 'Microsoft Edge'
    : /Firefox\//.test(ua) ? 'Mozilla Firefox'
    : /Chrome\//.test(ua) ? 'Google Chrome'
    : /Safari\//.test(ua) ? 'Apple Safari'
    : 'Unknown Browser';
  const os = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS';
  return { browser, os };
}

function isPlausibleIp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  return (
    (/^[0-9a-f:.]+$/i.test(value) && value.includes('.')) ||
    (/^[0-9a-f:]+$/i.test(value) && value.includes(':'))
  );
}

async function lookupIp(endpoint: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ip?: unknown };
    return isPlausibleIp(data.ip) ? data.ip : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function lookupClientIdentity(): Promise<ClientIdentity> {
  const [ipv4, ipv6] = await Promise.all([
    lookupIp('https://api.ipify.org?format=json'),
    lookupIp('https://api6.ipify.org?format=json'),
  ]);
  const ip = ipv4 || ipv6;
  if (!ip) throw new Error('Public IP lookup is unavailable');

  const ua = navigator.userAgent || '';
  const { browser, os } = describeBrowser(ua);
  return {
    ip,
    ipv4,
    ipv6,
    isPrivateGateway: false,
    isp: 'Not supplied by the IP lookup',
    city: 'Not supplied',
    country: 'Not supplied',
    browser,
    os,
    language: navigator.language || 'Unknown',
    transportProtocol: window.location.protocol.replace(':', '').toUpperCase(),
    headersExposed: [],
    checkedAt: new Date().toISOString(),
  };
}
