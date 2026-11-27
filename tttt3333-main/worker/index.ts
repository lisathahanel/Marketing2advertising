import {
  BROWSER_UA,
  DEVICE_ID_RE,
  HANDLE_RE,
  MAX_OFFLINE_VIDEO_BYTES,
  MAX_THUMB_BYTES,
  NASA_ID_RE,
  SECURITY_HEADERS,
  VALID_EMOJI_KEYS,
  VIDEO_KEY_RE,
  buildCorsHeaders,
  createEmptyReactions,
  fetchCreatorProfile,
  fetchOfflinePack,
  fetchVideosBatch,
  isAllowedThumbHost,
  isFamilySafeText,
  isRequestOriginAllowed,
  parseVideosRequestInput,
  resolveNasaCompactMp4,
  resolveTilvidsCompactMp4,
  type EmojiKey,
  type EngagementSnapshot,
  type StoredEngagementRecord,
} from '../shared/videoApi.ts';

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  APP_URL?: string;
  ALLOWED_ORIGINS?: string;
}

// Fallback isolate-local store if D1 binding is not yet attached in local testing
const memoryEngagementStore = new Map<string, StoredEngagementRecord>();

function buildMemoryEngagementSnapshot(
  videoKey: string,
  deviceId?: string
): EngagementSnapshot {
  const rec = memoryEngagementStore.get(videoKey);
  const reactions = createEmptyReactions();
  let userEmoji: EmojiKey | null = null;

  if (rec) {
    for (const [dev, emoji] of Object.entries(rec.reactionsByDevice)) {
      if (VALID_EMOJI_KEYS.has(emoji)) {
        reactions[emoji] += 1;
      }
      if (deviceId && dev === deviceId) {
        userEmoji = emoji;
      }
    }
  }

  return {
    views: rec ? rec.viewDevices.length : 0,
    reactions,
    userEmoji,
  };
}

async function getD1EngagementBatch(
  db: D1Database,
  videoKeys: string[],
  deviceId?: string
): Promise<Record<string, EngagementSnapshot>> {
  const stats: Record<string, EngagementSnapshot> = {};
  if (videoKeys.length === 0) return stats;

  for (const key of videoKeys) {
    stats[key] = {
      views: 0,
      reactions: createEmptyReactions(),
      userEmoji: null,
    };
  }

  const placeholders = videoKeys.map(() => '?').join(', ');

  const viewRowsPromise = db
    .prepare(
      `SELECT video_key, COUNT(*) AS view_count FROM video_views WHERE video_key IN (${placeholders}) GROUP BY video_key`
    )
    .bind(...videoKeys)
    .all<{ video_key: string; view_count: number }>();

  const reactionRowsPromise = db
    .prepare(
      `SELECT video_key, emoji, COUNT(*) AS react_count FROM video_reactions WHERE video_key IN (${placeholders}) GROUP BY video_key, emoji`
    )
    .bind(...videoKeys)
    .all<{ video_key: string; emoji: string; react_count: number }>();

  const userRowsPromise = deviceId
    ? db
        .prepare(
          `SELECT video_key, emoji FROM video_reactions WHERE device_id = ? AND video_key IN (${placeholders})`
        )
        .bind(deviceId, ...videoKeys)
        .all<{ video_key: string; emoji: string }>()
    : Promise.resolve({ results: [] as Array<{ video_key: string; emoji: string }> });

  const [viewRes, reactionRes, userRes] = await Promise.all([
    viewRowsPromise,
    reactionRowsPromise,
    userRowsPromise,
  ]);

  for (const row of viewRes.results || []) {
    if (stats[row.video_key]) {
      stats[row.video_key].views = Number(row.view_count) || 0;
    }
  }

  for (const row of reactionRes.results || []) {
    const snap = stats[row.video_key];
    if (snap && VALID_EMOJI_KEYS.has(row.emoji as EmojiKey)) {
      snap.reactions[row.emoji as EmojiKey] = Number(row.react_count) || 0;
    }
  }

  for (const row of userRes.results || []) {
    const snap = stats[row.video_key];
    if (snap && VALID_EMOJI_KEYS.has(row.emoji as EmojiKey)) {
      snap.userEmoji = row.emoji as EmojiKey;
    }
  }

  return stats;
}

async function getD1EngagementSingle(
  db: D1Database,
  videoKey: string,
  deviceId?: string
): Promise<EngagementSnapshot> {
  const batch = await getD1EngagementBatch(db, [videoKey], deviceId);
  return (
    batch[videoKey] || {
      views: 0,
      reactions: createEmptyReactions(),
      userEmoji: null,
    }
  );
}

function withResponseHeaders(
  headers: Record<string, string>,
  corsHeaders: Record<string, string>
): Headers {
  const merged = new Headers({
    ...SECURITY_HEADERS,
    ...corsHeaders,
    ...headers,
  });
  return merged;
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: withResponseHeaders(
      {
        'Content-Type': 'application/json; charset=utf-8',
        ...extraHeaders,
      },
      corsHeaders
    ),
  });
}

function textResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(message, {
    status,
    headers: withResponseHeaders(
      {
        'Content-Type': 'text/plain; charset=utf-8',
        ...extraHeaders,
      },
      corsHeaders
    ),
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 128 * 1024) {
    throw new Error('Payload too large');
  }
  const text = await request.text();
  if (text.length > 128 * 1024) {
    throw new Error('Payload too large');
  }
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
}

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestOrigin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(
    requestOrigin,
    url,
    env.APP_URL,
    env.ALLOWED_ORIGINS
  );

  if (request.method === 'OPTIONS') {
    if (!isRequestOriginAllowed(requestOrigin, url, env.APP_URL, env.ALLOWED_ORIGINS)) {
      return textResponse('Origin not allowed', 403, corsHeaders);
    }
    return new Response(null, {
      status: 204,
      headers: withResponseHeaders({}, corsHeaders),
    });
  }

  if (!isRequestOriginAllowed(requestOrigin, url, env.APP_URL, env.ALLOWED_ORIGINS)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
  }

  // GET /api/health
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return jsonResponse(
      {
        ok: true,
        runtime: 'cloudflare-worker',
        d1Bound: Boolean(env.DB),
      },
      200,
      corsHeaders
    );
  }

  // GET /api/thumb
  if (url.pathname === '/api/thumb' && request.method === 'GET') {
    const rawUrl = url.searchParams.get('url') || '';
    if (!rawUrl || rawUrl.length > 1000) {
      return textResponse('Invalid url', 400, corsHeaders);
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return textResponse('Invalid url', 400, corsHeaders);
    }

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      return textResponse('Disallowed url', 403, corsHeaders);
    }

    if (!isAllowedThumbHost(parsed.hostname)) {
      return textResponse('Host not allowed', 403, corsHeaders);
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(parsed.toString(), {
        headers: { 'User-Agent': BROWSER_UA, Referer: 'https://www.tiktok.com/' },
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!upstream.ok) {
        return textResponse('Thumbnail unavailable', 404, corsHeaders);
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return textResponse('Not an image', 415, corsHeaders);
      }

      const arrayBuf = await upstream.arrayBuffer();
      if (arrayBuf.byteLength > MAX_THUMB_BYTES) {
        return textResponse('Image too large', 413, corsHeaders);
      }

      return new Response(arrayBuf, {
        status: 200,
        headers: withResponseHeaders(
          {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          },
          corsHeaders
        ),
      });
    } catch {
      return textResponse('Failed to fetch thumbnail', 502, corsHeaders);
    }
  }

  // GET /api/nasa-video/:nasaId
  if (url.pathname.startsWith('/api/nasa-video/') && request.method === 'GET') {
    const rawId = url.pathname.slice('/api/nasa-video/'.length);
    let nasaId = '';
    try {
      nasaId = decodeURIComponent(rawId);
    } catch {
      return jsonResponse({ error: 'Invalid NASA asset id' }, 400, corsHeaders);
    }

    if (!nasaId || !NASA_ID_RE.test(nasaId)) {
      return jsonResponse({ error: 'Invalid NASA asset id' }, 400, corsHeaders);
    }

    try {
      const mp4Url = await resolveNasaCompactMp4(nasaId, false);
      if (!mp4Url) {
        return jsonResponse({ error: 'No MP4 stream available' }, 404, corsHeaders);
      }
      return jsonResponse({ mp4Url }, 200, corsHeaders);
    } catch {
      return jsonResponse({ error: 'Failed to resolve NASA stream' }, 502, corsHeaders);
    }
  }

  // GET /api/offline-media/:source/:id
  if (url.pathname.startsWith('/api/offline-media/') && request.method === 'GET') {
    const rest = url.pathname.slice('/api/offline-media/'.length);
    const slashIdx = rest.indexOf('/');
    if (slashIdx <= 0) {
      return jsonResponse(
        { error: 'Offline download supports NASA and TILvids MP4 streams.' },
        400,
        corsHeaders
      );
    }
    const source = rest.slice(0, slashIdx);
    let id = '';
    try {
      id = decodeURIComponent(rest.slice(slashIdx + 1));
    } catch {
      return jsonResponse({ error: 'Invalid media identifier.' }, 400, corsHeaders);
    }

    if (source !== 'nasa' && source !== 'tilvids') {
      return jsonResponse(
        { error: 'Offline download supports NASA and TILvids MP4 streams.' },
        400,
        corsHeaders
      );
    }

    let mediaUrl: string | null = null;
    try {
      mediaUrl =
        source === 'nasa'
          ? await resolveNasaCompactMp4(id, true)
          : await resolveTilvidsCompactMp4(id);
    } catch {
      mediaUrl = null;
    }

    if (!mediaUrl) {
      return jsonResponse(
        { error: 'Compact offline MP4 stream unavailable for this video.' },
        404,
        corsHeaders
      );
    }

    try {
      const parsed = new URL(mediaUrl);
      if (
        parsed.protocol !== 'https:' ||
        (parsed.hostname !== 'images-assets.nasa.gov' && parsed.hostname !== 'tilvids.com')
      ) {
        return jsonResponse({ error: 'Host not permitted' }, 403, corsHeaders);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      const upstream = await fetch(parsed.toString(), {
        headers: { 'User-Agent': BROWSER_UA },
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!upstream.ok || !upstream.body) {
        return jsonResponse({ error: 'Upstream video download failed' }, 502, corsHeaders);
      }

      const lenHeader = Number(upstream.headers.get('content-length') || '0');
      if (lenHeader > MAX_OFFLINE_VIDEO_BYTES) {
        return jsonResponse({ error: 'Video exceeds 25 MB offline cache limit' }, 413, corsHeaders);
      }

      let transferred = 0;
      const sizeLimiter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          transferred += chunk.byteLength;
          if (transferred > MAX_OFFLINE_VIDEO_BYTES) {
            ctrl.error(new Error('Size limit exceeded'));
            return;
          }
          ctrl.enqueue(chunk);
        },
      });

      const responseHeaders: Record<string, string> = {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      };
      if (lenHeader > 0) {
        responseHeaders['Content-Length'] = String(lenHeader);
      }

      return new Response(upstream.body.pipeThrough(sizeLimiter), {
        status: 200,
        headers: withResponseHeaders(responseHeaders, corsHeaders),
      });
    } catch {
      return jsonResponse({ error: 'Failed to download offline video' }, 502, corsHeaders);
    }
  }

  // GET /api/offline-pack
  if (url.pathname === '/api/offline-pack' && request.method === 'GET') {
    try {
      const videos = await fetchOfflinePack();
      return jsonResponse({ videos }, 200, corsHeaders);
    } catch {
      return jsonResponse({ videos: [] }, 502, corsHeaders);
    }
  }

  // GET /api/creator
  if (url.pathname === '/api/creator' && request.method === 'GET') {
    const rawHandle = (url.searchParams.get('username') || '').trim();
    const cleanHandle = rawHandle.replace(/^@+/, '');
    if (!cleanHandle || !HANDLE_RE.test(cleanHandle) || !isFamilySafeText(cleanHandle)) {
      return jsonResponse(
        { error: 'Enter a valid username (letters, numbers, _, ., -).' },
        400,
        corsHeaders
      );
    }

    const payload = await fetchCreatorProfile(cleanHandle);
    if (!payload) {
      return jsonResponse(
        { error: 'Enter a valid username (letters, numbers, _, ., -).' },
        400,
        corsHeaders
      );
    }
    return jsonResponse(payload, 200, corsHeaders);
  }

  // GET | POST /api/videos
  if (url.pathname === '/api/videos' && (request.method === 'GET' || request.method === 'POST')) {
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') {
      try {
        body = await readJsonBody(request);
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
      }
    }

    const queryRecord: Record<string, string | undefined> = {};
    url.searchParams.forEach((value, key) => {
      queryRecord[key] = value;
    });

    const input = parseVideosRequestInput(body, queryRecord);
    const result = await fetchVideosBatch(input);

    return jsonResponse(
      {
        videos: result.videos,
        query: input.rawQ,
        source: input.source,
        category: input.category,
        page: input.pageNum,
        hasMore: result.hasMore,
        resolvedDirectUrl: result.resolvedDirectUrl,
      },
      200,
      corsHeaders
    );
  }

  // POST /api/engagement/batch
  if (url.pathname === '/api/engagement/batch' && request.method === 'POST') {
    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
    }

    const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const deviceId = DEVICE_ID_RE.test(rawDeviceId) ? rawDeviceId : undefined;
    const rawKeys = Array.isArray(body.videoKeys) ? body.videoKeys : [];
    const validKeys: string[] = [];
    const seenKeys = new Set<string>();
    for (const k of rawKeys.slice(0, 100)) {
      if (typeof k === 'string' && VIDEO_KEY_RE.test(k) && !seenKeys.has(k)) {
        seenKeys.add(k);
        validKeys.push(k);
      }
    }

    if (env.DB) {
      try {
        const stats = await getD1EngagementBatch(env.DB, validKeys, deviceId);
        return jsonResponse({ stats }, 200, corsHeaders);
      } catch {
        // Fallback safely to isolate memory if D1 tables haven't been migrated yet
      }
    }

    const stats: Record<string, EngagementSnapshot> = {};
    for (const k of validKeys) {
      stats[k] = buildMemoryEngagementSnapshot(k, deviceId);
    }
    return jsonResponse({ stats }, 200, corsHeaders);
  }

  // POST /api/engagement/view
  if (url.pathname === '/api/engagement/view' && request.method === 'POST') {
    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
    }

    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const videoKey = typeof body.videoKey === 'string' ? body.videoKey.trim() : '';
    if (!DEVICE_ID_RE.test(deviceId) || !VIDEO_KEY_RE.test(videoKey)) {
      return jsonResponse({ error: 'Invalid deviceId or videoKey' }, 400, corsHeaders);
    }

    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO video_views (video_key, device_id, created_at) VALUES (?, ?, ?)'
        )
          .bind(videoKey, deviceId, Date.now())
          .run();
        const engagement = await getD1EngagementSingle(env.DB, videoKey, deviceId);
        return jsonResponse({ videoKey, engagement }, 200, corsHeaders);
      } catch {
        // Fallback to memory if D1 migration isn't applied yet
      }
    }

    let rec = memoryEngagementStore.get(videoKey);
    if (!rec) {
      rec = { viewDevices: [], reactionsByDevice: {} };
      memoryEngagementStore.set(videoKey, rec);
    }
    if (!rec.viewDevices.includes(deviceId)) {
      rec.viewDevices.push(deviceId);
    }
    return jsonResponse(
      {
        videoKey,
        engagement: buildMemoryEngagementSnapshot(videoKey, deviceId),
      },
      200,
      corsHeaders
    );
  }

  // POST /api/engagement/react
  if (url.pathname === '/api/engagement/react' && request.method === 'POST') {
    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
    }

    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const videoKey = typeof body.videoKey === 'string' ? body.videoKey.trim() : '';
    const rawEmoji = body.emoji;
    const isClear = rawEmoji === null || rawEmoji === '';
    if (!DEVICE_ID_RE.test(deviceId) || !VIDEO_KEY_RE.test(videoKey)) {
      return jsonResponse({ error: 'Invalid deviceId or videoKey' }, 400, corsHeaders);
    }
    if (!isClear && (typeof rawEmoji !== 'string' || !VALID_EMOJI_KEYS.has(rawEmoji as EmojiKey))) {
      return jsonResponse({ error: 'Invalid emoji type' }, 400, corsHeaders);
    }

    if (env.DB) {
      try {
        if (isClear) {
          await env.DB.prepare(
            'DELETE FROM video_reactions WHERE video_key = ? AND device_id = ?'
          )
            .bind(videoKey, deviceId)
            .run();
        } else {
          await env.DB.prepare(
            'INSERT INTO video_reactions (video_key, device_id, emoji, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(video_key, device_id) DO UPDATE SET emoji = excluded.emoji, updated_at = excluded.updated_at'
          )
            .bind(videoKey, deviceId, rawEmoji as EmojiKey, Date.now())
            .run();
        }
        const engagement = await getD1EngagementSingle(env.DB, videoKey, deviceId);
        return jsonResponse({ videoKey, engagement }, 200, corsHeaders);
      } catch {
        // Fallback to memory if D1 migration isn't applied yet
      }
    }

    let rec = memoryEngagementStore.get(videoKey);
    if (!rec) {
      rec = { viewDevices: [], reactionsByDevice: {} };
      memoryEngagementStore.set(videoKey, rec);
    }
    if (isClear) {
      delete rec.reactionsByDevice[deviceId];
    } else {
      rec.reactionsByDevice[deviceId] = rawEmoji as EmojiKey;
    }
    return jsonResponse(
      {
        videoKey,
        engagement: buildMemoryEngagementSnapshot(videoKey, deviceId),
      },
      200,
      corsHeaders
    );
  }

  return jsonResponse({ error: 'API route not found' }, 404, corsHeaders);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    // Serve static files from Vite dist/ (including /sw.js, /manifest.webmanifest, /ads.txt, icons, and SPA fallback)
    const assetResponse = await env.ASSETS.fetch(request);
    const mutable = new Response(assetResponse.body, assetResponse);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      mutable.headers.set(k, v);
    }
    if (url.pathname === '/sw.js') {
      mutable.headers.set('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    }
    return mutable;
  },
} satisfies ExportedHandler<Env>;
