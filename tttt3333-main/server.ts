import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
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
} from './shared/videoApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGAGEMENT_FILE_PATH = path.resolve(__dirname, 'data/m2a-engagement.json');
const engagementStore = new Map<string, StoredEngagementRecord>();
let engagementSaveTimer: ReturnType<typeof setTimeout> | null = null;

function loadEngagementStoreFromDisk(): void {
  try {
    if (!fs.existsSync(ENGAGEMENT_FILE_PATH)) return;
    const raw = fs.readFileSync(ENGAGEMENT_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, StoredEngagementRecord>;
    if (!parsed || typeof parsed !== 'object') return;
    for (const [k, rec] of Object.entries(parsed)) {
      if (!VIDEO_KEY_RE.test(k) || !rec || typeof rec !== 'object') continue;
      const viewDevices = Array.isArray(rec.viewDevices)
        ? rec.viewDevices.filter((d): d is string => typeof d === 'string' && DEVICE_ID_RE.test(d))
        : [];
      const reactionsByDevice: Record<string, EmojiKey> = {};
      if (rec.reactionsByDevice && typeof rec.reactionsByDevice === 'object') {
        for (const [dev, emoji] of Object.entries(rec.reactionsByDevice)) {
          if (DEVICE_ID_RE.test(dev) && VALID_EMOJI_KEYS.has(emoji as EmojiKey)) {
            reactionsByDevice[dev] = emoji as EmojiKey;
          }
        }
      }
      engagementStore.set(k, { viewDevices, reactionsByDevice });
    }
  } catch {
    // ignore read errors and start cleanly in memory
  }
}

function scheduleEngagementPersist(): void {
  if (engagementSaveTimer) return;
  engagementSaveTimer = setTimeout(() => {
    engagementSaveTimer = null;
    try {
      const dir = path.dirname(ENGAGEMENT_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, StoredEngagementRecord> = {};
      let count = 0;
      for (const [k, v] of engagementStore.entries()) {
        if (count++ >= 5000) break;
        serializable[k] = v;
      }
      fs.writeFileSync(ENGAGEMENT_FILE_PATH, JSON.stringify(serializable), 'utf8');
    } catch {
      // ignore disk persistence failures in read-only environments
    }
  }, 1500);
}

function buildEngagementSnapshot(videoKey: string, deviceId?: string): EngagementSnapshot {
  const rec = engagementStore.get(videoKey);
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

loadEngagementStoreFromDisk();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
  const configuredAppUrl = process.env.APP_URL;
  const extraAllowedOrigins = process.env.ALLOWED_ORIGINS;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [key, val] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, val);
    }
    next();
  });

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const requestOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : null;
    const hostHeader = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    let requestUrl: URL;
    try {
      requestUrl = new URL(`${protocol}://${hostHeader}${req.originalUrl}`);
    } catch {
      requestUrl = new URL(`http://localhost:${PORT}/`);
    }

    const corsHeaders = buildCorsHeaders(
      requestOrigin,
      requestUrl,
      configuredAppUrl,
      extraAllowedOrigins
    );
    for (const [k, v] of Object.entries(corsHeaders)) {
      res.setHeader(k, v);
    }

    if (!isRequestOriginAllowed(requestOrigin, requestUrl, configuredAppUrl, extraAllowedOrigins)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, runtime: 'node-express' });
  });

  app.get('/api/thumb', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!rawUrl || rawUrl.length > 1000) {
      res.status(400).send('Invalid url');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).send('Invalid url');
      return;
    }

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      res.status(403).send('Disallowed url');
      return;
    }

    if (!isAllowedThumbHost(parsed.hostname)) {
      res.status(403).send('Host not allowed');
      return;
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
        res.status(404).send('Thumbnail unavailable');
        return;
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        res.status(415).send('Not an image');
        return;
      }

      const arrayBuf = await upstream.arrayBuffer();
      if (arrayBuf.byteLength > MAX_THUMB_BYTES) {
        res.status(413).send('Image too large');
        return;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(Buffer.from(arrayBuf));
    } catch {
      res.status(502).send('Failed to fetch thumbnail');
    }
  });

  app.get('/api/nasa-video/:nasaId', async (req: Request, res: Response) => {
    const nasaId = typeof req.params.nasaId === 'string' ? req.params.nasaId : '';
    if (!nasaId || !NASA_ID_RE.test(nasaId)) {
      res.status(400).json({ error: 'Invalid NASA asset id' });
      return;
    }

    try {
      const mp4Url = await resolveNasaCompactMp4(nasaId, false);
      if (!mp4Url) {
        res.status(404).json({ error: 'No MP4 stream available' });
        return;
      }
      res.json({ mp4Url });
    } catch {
      res.status(502).json({ error: 'Failed to resolve NASA stream' });
    }
  });

  app.get('/api/offline-media/:source/:id', async (req: Request, res: Response) => {
    const source = typeof req.params.source === 'string' ? req.params.source : '';
    const id = typeof req.params.id === 'string' ? req.params.id : '';

    if (source !== 'nasa' && source !== 'tilvids') {
      res.status(400).json({ error: 'Offline download supports NASA and TILvids MP4 streams.' });
      return;
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
      res.status(404).json({ error: 'Compact offline MP4 stream unavailable for this video.' });
      return;
    }

    try {
      const parsed = new URL(mediaUrl);
      if (
        parsed.protocol !== 'https:' ||
        (parsed.hostname !== 'images-assets.nasa.gov' && parsed.hostname !== 'tilvids.com')
      ) {
        res.status(403).json({ error: 'Host not permitted' });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      req.on('close', () => controller.abort());

      const upstream = await fetch(parsed.toString(), {
        headers: { 'User-Agent': BROWSER_UA },
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!upstream.ok || !upstream.body) {
        res.status(502).json({ error: 'Upstream video download failed' });
        return;
      }

      const lenHeader = Number(upstream.headers.get('content-length') || '0');
      if (lenHeader > MAX_OFFLINE_VIDEO_BYTES) {
        res.status(413).json({ error: 'Video exceeds 25 MB offline cache limit' });
        return;
      }

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (lenHeader > 0) {
        res.setHeader('Content-Length', String(lenHeader));
      }

      const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
      let transferred = 0;
      nodeStream.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        if (transferred > MAX_OFFLINE_VIDEO_BYTES) {
          nodeStream.destroy(new Error('Size limit exceeded'));
          controller.abort();
        }
      });
      nodeStream.on('error', () => {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      nodeStream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to download offline video' });
      }
    }
  });

  app.get('/api/offline-pack', async (_req: Request, res: Response) => {
    try {
      const videos = await fetchOfflinePack();
      res.json({ videos });
    } catch {
      res.status(502).json({ videos: [] });
    }
  });

  app.get('/api/creator', async (req: Request, res: Response) => {
    const rawHandle = typeof req.query.username === 'string' ? req.query.username.trim() : '';
    const cleanHandle = rawHandle.replace(/^@+/, '');

    if (!cleanHandle || !HANDLE_RE.test(cleanHandle) || !isFamilySafeText(cleanHandle)) {
      res.status(400).json({ error: 'Enter a valid username (letters, numbers, _, ., -).' });
      return;
    }

    const payload = await fetchCreatorProfile(cleanHandle);
    if (!payload) {
      res.status(400).json({ error: 'Enter a valid username (letters, numbers, _, ., -).' });
      return;
    }

    res.json(payload);
  });

  async function handleVideosRequest(req: Request, res: Response) {
    const body = (req.method === 'POST' && req.body && typeof req.body === 'object'
      ? req.body
      : {}) as Record<string, unknown>;
    const queryRecord: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') queryRecord[k] = v;
    }

    const input = parseVideosRequestInput(body, queryRecord);
    const result = await fetchVideosBatch(input);

    res.json({
      videos: result.videos,
      query: input.rawQ,
      source: input.source,
      category: input.category,
      page: input.pageNum,
      hasMore: result.hasMore,
      resolvedDirectUrl: result.resolvedDirectUrl,
    });
  }

  app.get('/api/videos', handleVideosRequest);
  app.post('/api/videos', handleVideosRequest);

  app.post('/api/engagement/batch', (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const deviceId = DEVICE_ID_RE.test(rawDeviceId) ? rawDeviceId : undefined;
    const rawKeys = Array.isArray(body.videoKeys) ? body.videoKeys : [];
    const stats: Record<string, EngagementSnapshot> = {};

    for (const k of rawKeys.slice(0, 100)) {
      if (typeof k === 'string' && VIDEO_KEY_RE.test(k)) {
        stats[k] = buildEngagementSnapshot(k, deviceId);
      }
    }
    res.json({ stats });
  });

  app.post('/api/engagement/view', (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const videoKey = typeof body.videoKey === 'string' ? body.videoKey.trim() : '';
    if (!DEVICE_ID_RE.test(deviceId) || !VIDEO_KEY_RE.test(videoKey)) {
      res.status(400).json({ error: 'Invalid deviceId or videoKey' });
      return;
    }

    let rec = engagementStore.get(videoKey);
    if (!rec) {
      rec = { viewDevices: [], reactionsByDevice: {} };
      engagementStore.set(videoKey, rec);
    }

    if (!rec.viewDevices.includes(deviceId)) {
      rec.viewDevices.push(deviceId);
      scheduleEngagementPersist();
    }

    res.json({
      videoKey,
      engagement: buildEngagementSnapshot(videoKey, deviceId),
    });
  });

  app.post('/api/engagement/react', (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const videoKey = typeof body.videoKey === 'string' ? body.videoKey.trim() : '';
    const rawEmoji = body.emoji;
    const isClear = rawEmoji === null || rawEmoji === '';
    if (!DEVICE_ID_RE.test(deviceId) || !VIDEO_KEY_RE.test(videoKey)) {
      res.status(400).json({ error: 'Invalid deviceId or videoKey' });
      return;
    }
    if (!isClear && (typeof rawEmoji !== 'string' || !VALID_EMOJI_KEYS.has(rawEmoji as EmojiKey))) {
      res.status(400).json({ error: 'Invalid emoji type' });
      return;
    }

    let rec = engagementStore.get(videoKey);
    if (!rec) {
      rec = { viewDevices: [], reactionsByDevice: {} };
      engagementStore.set(videoKey, rec);
    }

    if (isClear) {
      delete rec.reactionsByDevice[deviceId];
    } else {
      rec.reactionsByDevice[deviceId] = rawEmoji as EmojiKey;
    }
    scheduleEngagementPersist();

    res.json({
      videoKey,
      engagement: buildEngagementSnapshot(videoKey, deviceId),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`marketing2advertising server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
