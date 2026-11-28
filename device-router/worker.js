const MOBILE_UA = /(android|iphone|ipad|ipod|mobile|windows phone|iemobile|opera mini|blackberry)/i;

function isMobileRequest(request) {
  if (request.headers.get('sec-ch-ua-mobile') === '?1') return true;
  return MOBILE_UA.test(request.headers.get('user-agent') || '');
}

function responseWithRoutingHeaders(response, experience, contentType) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  headers.set('Vary', 'User-Agent, Sec-CH-UA-Mobile');
  headers.set('X-M2A-Experience', experience);
  if (contentType) headers.set('Content-Type', contentType);
  headers.delete('Content-Length');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    const mobile = isMobileRequest(request);

    // Device-specific homepage. The browser address remains the apex URL.
    if (url.pathname === '/') {
      const upstream = mobile
        ? await fetch(new Request(new URL('/__m2a-mobile.html', url), request))
        : await fetch(request);

      if (!upstream.ok) {
        return new Response(
          mobile
            ? 'The mobile M2A app is not ready yet. Please refresh shortly.'
            : 'The M2A desktop app is temporarily unavailable.',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-M2A-Experience': mobile ? 'mobile-error' : 'desktop-error',
            },
          },
        );
      }
      return responseWithRoutingHeaders(upstream, mobile ? 'mobile' : 'desktop', 'text/html; charset=utf-8');
    }

    // Each device receives its matching service-worker build at the same URL.
    if (url.pathname === '/sw.js') {
      const workerPath = mobile ? '/__m2a-mobile-sw.js' : '/sw.js';
      const upstream = mobile
        ? await fetch(new Request(new URL(workerPath, url), request))
        : await fetch(request);

      if (!upstream.ok) {
        return new Response('M2A service worker unavailable.', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
      return responseWithRoutingHeaders(upstream, mobile ? 'mobile' : 'desktop', 'application/javascript; charset=utf-8');
    }

    return fetch(request);
  },
};
