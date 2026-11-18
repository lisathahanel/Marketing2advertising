import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  // Absolute asset base lets the same built React app run from the Blogger
  // www homepage while its JS, lazy chunks, images, and JSON data stay hosted
  // on the standalone non-www app origin.
  base: 'https://marketing2advertising.com/',
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, 'index.html'),
        emailExtractor: path.resolve(rootDir, 'm2a-emailextractor/index.html'),
        embed: path.resolve(rootDir, 'src/embed.tsx'),
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
