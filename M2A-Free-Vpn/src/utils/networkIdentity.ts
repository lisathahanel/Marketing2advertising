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
  return /^[0-9a-f:.]+$/i.test(value) && value.includes('.') || /^[0-9a-f:]+$/i.test(value) && value.includes(':');
}

export async function lookupClientIdentity(): Promise<ClientIdentity> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Public IP lookup failed');
    const data = (await response.json()) as { ip?: unknown };
    if (!isPlausibleIp(data.ip)) throw new Error('Public IP response was invalid');

    const ua = navigator.userAgent || '';
    const { browser, os } = describeBrowser(ua);
    return {
      ip: data.ip,
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
  } finally {
    window.clearTimeout(timeout);
  }
}
