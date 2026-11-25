import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/firimu/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'offline.html',
        ],
        manifest: {
          id: '/firimu/',
          name: 'Marketing2Advertising Firimu',
          short_name: 'Firimu',
          description: 'Discover movies and series, browse by genre and VJ, and explore multi-part titles and episodes.',
          theme_color: '#040714',
          background_color: '#040714',
          display: 'standalone',
          start_url: '/firimu/',
          scope: '/firimu/',
          icons: [
            {
              src: '/firimu/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/firimu/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/firimu/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/firimu/index.html',
          navigateFallbackDenylist: [
            /^\/firimu\/api\//,
            /^\/firimu\/sitemap\.xml$/,
            /^\/firimu\/robots\.txt$/,
            /^\/firimu\/offline\.html$/,
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/(?:[a-z0-9-]+\.)*(?:bp\.blogspot\.com|googleusercontent\.com)\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'firimu-posters-cache',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/firimu\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firimu-api-cache',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 40,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
