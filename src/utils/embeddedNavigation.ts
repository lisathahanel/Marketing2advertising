const APP_ORIGIN = 'https://marketing2advertising.com';
const BLOG_ORIGIN = 'https://www.marketing2advertising.com';

/** True only when the app is actually inside a nested browsing context. */
export function isM2AIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * The www Blogger homepage mounts the same React app directly into its own
 * document (not an iframe). Treat that homepage like the embedded experience
 * for navigation so app sections open on the standalone non-www app.
 */
export function isM2AEmbedded(): boolean {
  if (isM2AIframe()) return true;
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'www.marketing2advertising.com'
    && (window.location.pathname === '/' || window.location.pathname === '/index.html');
}

/** Open a section of the standalone M2A app outside the Blogger homepage. */
export function openM2ASectionInNewTab(section: string): void {
  const url = new URL('/', APP_ORIGIN);
  url.hash = `/${encodeURIComponent(section)}`;
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

/** Open an official M2A page outside the Blogger homepage. */
export function openM2APageInNewTab(path: string, onBlog = false): void {
  const base = onBlog ? BLOG_ORIGIN : APP_ORIGIN;
  const url = new URL(path, base);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}
