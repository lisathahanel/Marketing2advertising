# marketing2advertising (M2A) — Video Watchroom PWA

A family-safe, read-only video discovery & Shorts watchroom built with React, TypeScript, Tailwind CSS, `vite-plugin-pwa`, Google AdSense, a 24-hour Offline Vault (Service Worker + Cache API + IndexedDB), per-device view counts and emoji reactions, and dual backend support:

- **Cloudflare Production**: **Cloudflare Workers** (`worker/index.ts`) + **Workers Static Assets** (`./dist`) + **Cloudflare D1** (`migrations/0001_engagement.sql`) serving everything on a single origin (`https://marketing2advertising.com/`).
- **Local / Node Runtime**: **Express** (`server.ts`) + Vite dev middleware + local JSON file persistence (`data/m2a-engagement.json`).

Both runtimes share the same platform-agnostic API core (`shared/videoApi.ts`).

---

## Project Structure

```
.
├── .env.example
├── .gitignore
├── README.md
├── bun.lock
├── index.html
├── metadata.json
├── migrations/
│   └── 0001_engagement.sql       # Cloudflare D1 schema (video_views, video_reactions)
├── package.json
├── public/
│   ├── ads.txt                   # Google AdSense publisher verification
│   ├── apple-touch-icon.png
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-maskable-512x512.png
├── server.ts                     # Local Node/Express server + Vite dev middleware
├── shared/
│   └── videoApi.ts               # Shared video feed, creator resolver, URL parser, CORS, security headers
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── AdSenseSlot.tsx
│   │   ├── CreatorStrip.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── InstallAppModal.tsx
│   │   ├── LegalModal.tsx
│   │   ├── MenuDrawer.tsx
│   │   ├── PlayerModal.tsx
│   │   ├── ShortsFeed.tsx
│   │   └── VideoCard.tsx
│   ├── hooks/
│   │   ├── useMetaReachability.ts
│   │   └── usePWAInstall.ts
│   ├── index.css
│   ├── lib/
│   │   ├── engagement.ts
│   │   ├── offlineVault.ts
│   │   └── watchlist.ts
│   ├── main.tsx
│   ├── sw.ts                     # Workbox InjectManifest Service Worker + 24h Offline Vault
│   └── types.ts
├── tsconfig.json                 # Frontend + Node TypeScript config
├── tsconfig.worker.json          # Isolated Cloudflare Worker TypeScript config
├── vite.config.ts                # Vite + VitePWA build configuration
├── worker/
│   └── index.ts                  # Cloudflare Worker entrypoint (API + D1 + ASSETS)
└── wrangler.jsonc                # Cloudflare Workers & D1 deployment configuration
```

---

## Environment Variables & Cloudflare Bindings

### Environment Variables (`.env.example`)

| Variable | Runtime | Description |
| :--- | :--- | :--- |
| `APP_URL` | Worker / Node | Canonical site URL (`https://marketing2advertising.com`) used for CORS allowlisting |
| `ALLOWED_ORIGINS` | Worker / Node | Comma-separated permitted browser CORS origins (`https://marketing2advertising.com,https://www.marketing2advertising.com`) |
| `PORT` | Node only | Local Express HTTP port (defaults to `3000`) |
| `GEMINI_API_KEY` | Optional / Unused | Reserved for future server-side AI features (never expose in `VITE_*` client vars) |

### Cloudflare Bindings (`wrangler.jsonc`)

| Binding | Type | Purpose |
| :--- | :--- | :--- |
| `ASSETS` | Workers Static Assets | Serves Vite production output (`./dist`), including `/sw.js`, `/manifest.webmanifest`, `/ads.txt`, and SPA fallback |
| `DB` | Cloudflare D1 (`m2a-engagement`) | Stores per-device video view counts (`video_views`) and emoji reactions (`video_reactions`) |

No R2 bucket is required because 24-hour offline MP4 caching happens client-side inside the browser Service Worker (`Cache API` + `IndexedDB`).

---

## API Endpoints

- `GET /api/health` — Health & D1 binding status
- `GET | POST /api/videos` — Fresh shuffled family-safe video feeds & direct URL resolver (YouTube, TikTok, Instagram Reels, Facebook Watch/Reels, TILvids, NASA)
- `GET /api/creator?username=...` — Creator channel profile + multi-platform clips
- `GET /api/offline-pack` — Curated offline-capable NASA & TILvids clips
- `GET /api/offline-media/:source/:id` — Proxied compact MP4 stream (25 MB hard cap) cached for 24h by `src/sw.ts`
- `GET /api/nasa-video/:nasaId` — Resolves NASA MP4 stream URL
- `GET /api/thumb?url=...` — Allowlisted HTTPS image proxy (5 MB cap, non-IP/non-local hosts only)
- `POST /api/engagement/batch` — Batch fetch per-device views and emoji counts
- `POST /api/engagement/view` — Record unique per-device view
- `POST /api/engagement/react` — Set or clear per-device emoji reaction (`fire`, `heart`, `laugh`, `clap`, `star`)

---

## Local Development

```bash
npm install
npm run dev
```

For local Cloudflare Worker + D1 emulation:

```bash
npm run cf:migrate:local
npm run cf:dev
```

TypeScript & production build checks:

```bash
npm run lint
npm run build
```

---

## Cloudflare Deployment Instructions (`marketing2advertising.com`)

1. **Authenticate Wrangler**
   ```bash
   npx wrangler login
   ```

2. **Create the Cloudflare D1 Database**
   ```bash
   npx wrangler d1 create m2a-engagement
   ```
   Copy the returned `database_id` into `wrangler.jsonc` under `d1_databases[0].database_id` (replacing `REPLACE_WITH_YOUR_CLOUDFLARE_D1_DATABASE_ID`).

3. **Apply the D1 Database Migration**
   ```bash
   npm run cf:migrate:remote
   ```

4. **Build and Deploy to Cloudflare Workers**
   ```bash
   npm run cf:deploy
   ```

5. **Attach Your Custom Domain (`marketing2advertising.com`)**
   - In the Cloudflare Dashboard, open **Compute (Workers & Pages) → marketing2advertising → Settings → Domains & Routes**.
   - Click **Add → Custom Domain** and add `marketing2advertising.com` (and optionally `www.marketing2advertising.com`, redirecting `www` to apex if preferred).
   - Ensure SSL/TLS mode for the domain zone is **Full (Strict)** so `https://marketing2advertising.com/sw.js` registers cleanly for PWA offline mode and `https://marketing2advertising.com/ads.txt` is reachable by Google AdSense.
   - Or uncomment the `routes` block in `wrangler.jsonc` once the DNS zone is active on your Cloudflare account and re-run `npm run cf:deploy`.

6. **Optional Secrets**
   If you add private API keys later, store them in Cloudflare (never in `wrangler.jsonc` or `VITE_*`):
   ```bash
   npx wrangler secret put MY_SECRET_NAME
   ```
