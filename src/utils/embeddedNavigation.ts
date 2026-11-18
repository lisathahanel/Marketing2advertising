const APP_ORIGIN = 'https://marketing2advertising.com';
const BLOG_ORIGIN = 'https://www.marketing2advertising.com';

/** True when the M2A app is rendered inside another page's iframe. */
export function isM2AEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access can be restricted; treat it as embedded.
    return true;
  }
}

/** Open a section of the standalone M2A app outside the embedding page. */
export function openM2ASectionInNewTab(section: string): void {
  const url = new URL('/', APP_ORIGIN);
  url.hash = `/${encodeURIComponent(section)}`;
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

/** Open an official M2A page outside the embedding frame. */
export function openM2APageInNewTab(path: string, onBlog = false): void {
  const base = onBlog ? BLOG_ORIGIN : APP_ORIGIN;
  const url = new URL(path, base);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}
